package com.fooddit.notification.dto;

import com.fooddit.notification.entity.Notification;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A single notification as shown in the bell dropdown, plus the envelope with
 * the unread count so the UI can render the badge from the same request.
 */
public record NotificationDto(
        UUID id,
        String type,
        UUID actorId,
        String actorName,
        UUID commentId,
        UUID restaurantId,
        String restaurantName,
        String replyPreview,
        Instant createdAt,
        boolean read
) {

    public static NotificationDto from(Notification notification) {
        return new NotificationDto(
                notification.getId(),
                notification.getType().name(),
                notification.getActor() != null ? notification.getActor().getId() : null,
                notification.getActorName(),
                notification.getCommentId(),
                notification.getRestaurant() != null ? notification.getRestaurant().getId() : null,
                notification.getRestaurantName(),
                notification.getReplyPreview(),
                notification.getCreatedAt(),
                notification.getReadAt() != null);
    }

    /** Envelope returned by the list endpoint so unread count comes along. */
    public record NotificationsResponse(long unreadCount, List<NotificationDto> notifications) {
    }
}