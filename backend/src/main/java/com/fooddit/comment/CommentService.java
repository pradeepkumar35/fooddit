package com.fooddit.comment;

import com.fooddit.comment.dto.CommentDto;
import com.fooddit.comment.dto.CreateCommentRequest;
import com.fooddit.comment.dto.UpdateCommentRequest;
import com.fooddit.comment.entity.Comment;
import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.ForbiddenException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.notification.NotificationService;
import com.fooddit.review.ReviewService;
import com.fooddit.review.entity.Review;
import com.fooddit.stream.CommentCreatedEvent;
import com.fooddit.stream.LiveEventPublisher;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import com.fooddit.vote.VoteService;
import com.fooddit.vote.entity.VotableType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final ReviewService reviewService;
    private final UserRepository userRepository;
    private final VoteService voteService;
    private final NotificationService notificationService;
    private final LiveEventPublisher liveEventPublisher;

    /**
     * Loads every comment for a review as a flat list, orders the siblings at
     * every nesting level per the requested sort (best/top/new), assembles the
     * reply tree, and enriches every node with its net vote score and the
     * acting user's vote. This deliberately avoids a recursive SQL query.
     */
    @Transactional(readOnly = true)
    public List<CommentDto> getThread(UUID reviewId, UUID currentUserId, String sort) {
        reviewService.findReview(reviewId); // 404 if the review does not exist

        List<Comment> flat = commentRepository.findByReviewIdOrderByCreatedAtAsc(reviewId);
        List<UUID> ids = flat.stream().map(Comment::getId).toList();
        Map<UUID, Integer> scores = voteService.scoresFor(VotableType.COMMENT, ids);
        Map<UUID, Integer> myVotes = voteService.myVotes(currentUserId, VotableType.COMMENT, ids);

        List<Comment> ordered = CommentSort.order(flat, scores, sort);
        List<CommentDto> tree = CommentThreadAssembler.buildTree(ordered);
        return enrichTree(tree, scores, myVotes);
    }

    @Transactional
    public CommentDto create(UUID reviewId, UUID userId, CreateCommentRequest request) {
        Review review = reviewService.findReview(reviewId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Comment parent = null;
        if (request.parentCommentId() != null) {
            parent = commentRepository.findById(request.parentCommentId())
                    .orElseThrow(() -> new NotFoundException("Parent comment not found"));
            if (!parent.getReview().getId().equals(reviewId)) {
                throw new BadRequestException("Parent comment does not belong to this review");
            }
        }

        Comment saved = commentRepository.save(new Comment(review, user, parent, request.content().trim()));
        notificationService.notifyCommentActivity(saved);
        CommentDto dto = CommentDto.from(saved);
        liveEventPublisher.afterCommit(review.getRestaurant().getId(), "comment.created",
                new CommentCreatedEvent(reviewId, dto));
        return dto;
    }

    @Transactional
    public CommentDto update(UUID commentId, UUID userId, UpdateCommentRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        if (!comment.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You can only edit your own comments");
        }
        comment.setContent(request.content().trim());
        comment.setEditedAt(Instant.now());
        return CommentDto.from(comment);
    }

    private List<CommentDto> enrichTree(List<CommentDto> roots, Map<UUID, Integer> scores, Map<UUID, Integer> myVotes) {
        return roots.stream().map(node -> enrich(node, scores, myVotes)).toList();
    }

    private CommentDto enrich(CommentDto node, Map<UUID, Integer> scores, Map<UUID, Integer> myVotes) {
        return new CommentDto(
                node.id(),
                node.reviewId(),
                node.parentCommentId(),
                node.author(),
                node.content(),
                node.createdAt(),
                node.editedAt(),
                node.replies().stream().map(child -> enrich(child, scores, myVotes)).toList(),
                scores.getOrDefault(node.id(), 0),
                myVotes.get(node.id()));
    }
}
