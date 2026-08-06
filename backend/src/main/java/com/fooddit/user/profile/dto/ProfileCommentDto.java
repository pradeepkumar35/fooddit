package com.fooddit.user.profile.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * A comment as shown on a user's profile. Carries the review content and
 * restaurant name it was left on so the comment reads in context.
 */
public record ProfileCommentDto(
        UUID id,
        UUID reviewId,
        UUID restaurantId,
        String reviewContent,
        String restaurantName,
        String content,
        Instant createdAt,
        Instant editedAt,
        int score,
        Integer myVote
) {
}
