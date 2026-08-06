package com.fooddit.user.profile.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * A review as shown on a user's profile: same fields as the review list but
 * with the restaurant name attached for context. {@code score} and
 * {@code myVote} keep the standard voting enrichment semantics.
 */
public record ProfileReviewDto(
        UUID id,
        UUID restaurantId,
        String restaurantName,
        Integer rating,
        String content,
        Instant createdAt,
        Instant editedAt,
        int score,
        Integer myVote
) {
}
