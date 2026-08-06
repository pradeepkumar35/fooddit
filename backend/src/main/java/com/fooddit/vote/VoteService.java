package com.fooddit.vote;

import com.fooddit.comment.entity.Comment;
import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.review.repository.ReviewRepository;
import com.fooddit.stream.LiveEventPublisher;
import com.fooddit.stream.VoteUpdatedEvent;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import com.fooddit.vote.dto.VoteRequest;
import com.fooddit.vote.dto.VoteResponse;
import com.fooddit.vote.entity.VotableType;
import com.fooddit.vote.entity.Vote;
import com.fooddit.vote.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoteService {

    private final VoteRepository voteRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final LiveEventPublisher liveEventPublisher;

    /**
     * Casts a vote with Reddit-style semantics: voting the same direction again
     * toggles the vote off, voting the other direction switches it, and a new
     * vote inserts a row. The unique (user, votableType, votableId) constraint
     * guarantees a single vote per user per votable.
     */
    @Transactional
    public VoteResponse cast(UUID userId, VoteRequest request) {
        if (request.voteValue() != 1 && request.voteValue() != -1) {
            throw new BadRequestException("voteValue must be -1 or 1");
        }
        UUID restaurantId = restaurantIdFor(request.votableType(), request.votableId());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Optional<Vote> existing = voteRepository.findByUserIdAndVotableTypeAndVotableId(
                userId, request.votableType(), request.votableId());

        boolean toggledOff = false;
        if (existing.isPresent()) {
            Vote vote = existing.get();
            if (vote.getVoteValue().equals(request.voteValue())) {
                voteRepository.delete(vote);
                toggledOff = true;
            } else {
                vote.setVoteValue(request.voteValue());
            }
        } else {
            voteRepository.save(new Vote(user, request.votableType(), request.votableId(), request.voteValue()));
        }

        int score = voteRepository.scoreByVotable(request.votableType(), request.votableId());
        Integer myVote = toggledOff ? null : request.voteValue();
        liveEventPublisher.afterCommit(restaurantId, "vote.updated",
                new VoteUpdatedEvent(request.votableType(), request.votableId(), score));
        return new VoteResponse(request.votableType(), request.votableId(), score, myVote);
    }

    /**
     * Net score per votable id for a batch (e.g. all reviews of a restaurant or
     * all comments of a thread), so callers avoid an N+1 query pattern.
     */
    @Transactional(readOnly = true)
    public Map<UUID, Integer> scoresFor(VotableType type, Collection<UUID> votableIds) {
        if (votableIds.isEmpty()) {
            return Map.of();
        }
        return voteRepository.scoresByVotableIds(type, votableIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).intValue()));
    }

    /**
     * The acting user's vote (-1/1) per votable id for a batch. Empty when the
     * caller is anonymous.
     */
    @Transactional(readOnly = true)
    public Map<UUID, Integer> myVotes(UUID userId, VotableType type, Collection<UUID> votableIds) {
        if (userId == null || votableIds.isEmpty()) {
            return Map.of();
        }
        return voteRepository.findByUserAndVotableTypeAndVotableIdIn(userId, type, votableIds).stream()
                .collect(Collectors.toMap(Vote::getVotableId, Vote::getVoteValue));
    }

    private UUID restaurantIdFor(VotableType type, UUID votableId) {
        return switch (type) {
            case REVIEW -> reviewRepository.findById(votableId)
                    .orElseThrow(() -> new NotFoundException("Review not found"))
                    .getRestaurant().getId();
            case COMMENT -> {
                Comment comment = commentRepository.findById(votableId)
                        .orElseThrow(() -> new NotFoundException("Comment not found"));
                if (comment.isDeleted()) {
                    throw new BadRequestException("You cannot vote on a deleted comment");
                }
                yield comment.getReview().getRestaurant().getId();
            }
        };
    }
}
