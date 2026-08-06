package com.fooddit.notification;

import com.fooddit.comment.entity.Comment;
import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.notification.dto.NotificationDto;
import com.fooddit.notification.entity.Notification;
import com.fooddit.notification.entity.NotificationType;
import com.fooddit.notification.repository.NotificationRepository;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.review.entity.Review;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    /** A recipient with the most specific {@link NotificationType} for them. */
    private record Recipient(User user, NotificationType type) {
    }

    /**
     * Creates notifications for everyone affected by a new comment on a review,
     * so discussion threads notify consistently (not just the very first reply).
     * <p>
     * Recipients are, each exactly once (deduplicated by user id, with the most
     * specific type winning):
     * <ul>
     *   <li>the review's author — {@code REVIEW_REPLY} when the comment is a
     *       top-level comment, otherwise {@code THREAD_REPLY};</li>
     *   <li>the parent comment's author (for a nested reply) — {@code COMMENT_REPLY};</li>
     *   <li>every other distinct user commenting in the thread — {@code THREAD_REPLY}.</li>
     * </ul>
     * The acting user is always excluded, and each recipient's notification
     * preference is honoured. All recipient users are loaded in one batched
     * query to avoid N+1.
     */
    @Transactional
    public void notifyCommentActivity(Comment comment) {
        User actor = comment.getUser();
        Review review = comment.getReview();
        Restaurant restaurant = review.getRestaurant();
        boolean topLevel = comment.getParentComment() == null;

        Map<UUID, Recipient> recipients = new LinkedHashMap<>();

        // The parent-comment author is a direct reply, so it takes precedence.
        if (!topLevel && comment.getParentComment().getUser() != null) {
            User parentAuthor = comment.getParentComment().getUser();
            if (!parentAuthor.getId().equals(actor.getId())) {
                put(recipients, new Recipient(parentAuthor, NotificationType.COMMENT_REPLY));
            }
        }

        // The review author participates in every thread on their review.
        if (review.getUser() != null) {
            User reviewAuthor = review.getUser();
            if (!reviewAuthor.getId().equals(actor.getId())) {
                put(recipients, new Recipient(reviewAuthor,
                        topLevel ? NotificationType.REVIEW_REPLY : NotificationType.THREAD_REPLY));
            }
        }

        // Everyone else who has commented in the thread.
        for (User participant : loadParticipants(review.getId(), actor.getId(), recipients.keySet())) {
            put(recipients, new Recipient(participant, NotificationType.THREAD_REPLY));
        }

        for (Recipient recipient : recipients.values()) {
            if (wants(recipient.type(), recipient.user())) {
                notificationRepository.save(Notification.forReply(recipient.user(), recipient.type(),
                        actor, comment, restaurant));
            }
        }
    }

    /** Inserts a recipient only if they are not the actor and not already targeted. */
    private void put(Map<UUID, Recipient> recipients, Recipient recipient) {
        User user = recipient.user();
        if (user.getId() != null) {
            recipients.putIfAbsent(user.getId(), recipient);
        }
    }

    /**
     * The remaining thread participants (commenters on the review) excluding the
     * actor and anyone already targeted, loaded in a single query.
     */
    private List<User> loadParticipants(UUID reviewId, UUID actorId, Set<UUID> alreadyTargeted) {
        List<UUID> ids = commentRepository.findDistinctUserIdsByReviewId(reviewId)
                .stream()
                .filter(id -> !id.equals(actorId))
                .filter(id -> !alreadyTargeted.contains(id))
                .toList();
        return ids.isEmpty() ? List.of() : new ArrayList<>(userRepository.findAllById(ids));
    }

    private static boolean wants(NotificationType type, User user) {
        return switch (type) {
            case REVIEW_REPLY -> user.isNotifyOnReviewReply();
            case COMMENT_REPLY, THREAD_REPLY -> user.isNotifyOnCommentReply();
        };
    }

    @Transactional(readOnly = true)
    public NotificationDto.NotificationsResponse listFor(UUID userId) {
        List<NotificationDto> dtos = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationDto::from)
                .toList();
        long unread = notificationRepository.countByUserIdAndReadAtIsNull(userId);
        return new NotificationDto.NotificationsResponse(unread, dtos);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getUser().getId().equals(userId))
                .ifPresent(n -> {
                    if (n.getReadAt() == null) {
                        n.setReadAt(Instant.now());
                    }
                });
    }

    @Transactional
    public void markAllRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(n -> n.getReadAt() == null)
                .toList();
        Instant now = Instant.now();
        unread.forEach(n -> n.setReadAt(now));
    }

    @Transactional
    public void clear(UUID userId) {
        notificationRepository.deleteAllByUserId(userId);
    }
}