package com.fooddit.notification.entity;

import com.fooddit.comment.entity.Comment;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * An in-app notification telling a user that someone replied to their review or
 * their comment. The recipient is {@code user}; {@code actor} is who replied.
 * Restaurant context is denormalised (id + name) so the list can be rendered
 * without extra joins, and {@code replyPreview} is a short snippet of the new
 * comment so the dropdown reads at a glance.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private NotificationType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "comment_id", nullable = false)
    private UUID commentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    @Column(name = "restaurant_name")
    private String restaurantName;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "reply_preview", length = 300)
    private String replyPreview;

    /** Null until the recipient opens/dismisses the notification. */
    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static Notification forReply(User recipient, NotificationType type, User actor,
                                        Comment comment, Restaurant restaurant) {
        Notification notification = new Notification();
        notification.setUser(recipient);
        notification.setType(type);
        notification.setActor(actor);
        notification.setCommentId(comment.getId());
        notification.setRestaurant(restaurant);
        notification.setRestaurantName(restaurant.getName());
        notification.setActorName(actor.getName());
        String content = comment.getContent() == null ? "" : comment.getContent().trim();
        notification.setReplyPreview(content.length() > 300 ? content.substring(0, 300) : content);
        return notification;
    }
}
