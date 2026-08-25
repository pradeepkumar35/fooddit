package com.fooddit.user.profile;

import com.fooddit.comment.entity.Comment;
import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.review.entity.Review;
import com.fooddit.review.repository.ReviewRepository;
import com.fooddit.user.dto.UserDto;
import com.fooddit.user.entity.User;
import com.fooddit.user.profile.dto.ProfileCommentDto;
import com.fooddit.user.profile.dto.ProfileReviewDto;
import com.fooddit.user.profile.dto.UserProfileDto;
import com.fooddit.user.repository.UserRepository;
import com.fooddit.vote.VoteService;
import com.fooddit.vote.entity.VotableType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final VoteService voteService;

    /**
     * Lifetime reputation: net upvotes received across the user's own reviews
     * and comments. Real, derived data — no self-reported score. Pure JPQL so
     * it behaves identically on H2 and Postgres.
     */
    @Transactional(readOnly = true)
    public long reputation(UUID userId) {
        return reputations(List.of(userId)).getOrDefault(userId, 0L);
    }

    /** Batched reputation lookup for a set of authors (review/comment cards). */
    @Transactional(readOnly = true)
    public Map<UUID, Long> reputations(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = List.copyOf(userIds);
        Map<UUID, Long> out = new HashMap<>();

        List<Object[]> reviewPairs = reviewRepository.findAuthorAndIdByAuthorIds(ids);
        if (!reviewPairs.isEmpty()) {
            List<UUID> reviewIds = reviewPairs.stream().map(p -> (UUID) p[1]).toList();
            Map<UUID, Integer> scores = voteService.scoresFor(VotableType.REVIEW, reviewIds);
            for (Object[] pair : reviewPairs) {
                UUID authorId = (UUID) pair[0];
                int score = scores.getOrDefault((UUID) pair[1], 0);
                out.merge(authorId, (long) score, Long::sum);
            }
        }

        List<Object[]> commentPairs = commentRepository.findAuthorAndIdByAuthorIds(ids);
        if (!commentPairs.isEmpty()) {
            List<UUID> commentIds = commentPairs.stream().map(p -> (UUID) p[1]).toList();
            Map<UUID, Integer> scores = voteService.scoresFor(VotableType.COMMENT, commentIds);
            for (Object[] pair : commentPairs) {
                UUID authorId = (UUID) pair[0];
                int score = scores.getOrDefault((UUID) pair[1], 0);
                out.merge(authorId, (long) score, Long::sum);
            }
        }
        return out;
    }

    /**
     * Assembles a user's profile. Reviews and comments are loaded with their
     * restaurant context eagerly and vote-enriched in batch (single grouped
     * query each for scores and my-votes).
     */
    @Transactional(readOnly = true)
    public UserProfileDto getProfile(UUID userId, UUID currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        List<Review> reviews = reviewRepository.findByUserIdWithDetails(userId);
        List<UUID> reviewIds = reviews.stream().map(Review::getId).toList();
        Map<UUID, Integer> reviewScores = voteService.scoresFor(VotableType.REVIEW, reviewIds);
        Map<UUID, Integer> myReviewVotes = voteService.myVotes(currentUserId, VotableType.REVIEW, reviewIds);

        List<ProfileReviewDto> reviewDtos = reviews.stream()
                .map(r -> new ProfileReviewDto(
                        r.getId(),
                        r.getRestaurant().getId(),
                        r.getRestaurant().getName(),
                        r.getRating(),
                        r.getContent(),
                        r.getCreatedAt(),
                        r.getEditedAt(),
                        reviewScores.getOrDefault(r.getId(), 0),
                        myReviewVotes.get(r.getId())))
                .toList();

        List<Comment> comments = commentRepository.findByUserIdWithReview(userId);
        List<UUID> commentIds = comments.stream().map(Comment::getId).toList();
        Map<UUID, Integer> commentScores = voteService.scoresFor(VotableType.COMMENT, commentIds);
        Map<UUID, Integer> myCommentVotes = voteService.myVotes(currentUserId, VotableType.COMMENT, commentIds);

        List<ProfileCommentDto> commentDtos = comments.stream()
                .map(c -> new ProfileCommentDto(
                        c.getId(),
                        c.getReview().getId(),
                        c.getReview().getRestaurant().getId(),
                        c.getReview().getContent(),
                        c.getReview().getRestaurant().getName(),
                        c.getContent(),
                        c.getCreatedAt(),
                        c.getEditedAt(),
                        commentScores.getOrDefault(c.getId(), 0),
                        myCommentVotes.get(c.getId())))
                .toList();

        return new UserProfileDto(UserDto.from(user), reputation(userId), reviewDtos, commentDtos);
    }
}
