package com.fooddit.stream;

import com.fooddit.review.dto.ReviewDto;

import java.util.UUID;

/**
 * Fired when a review is edited. Carries the restaurant id so open dossiers
 * refresh their review stream in place, plus the updated review.
 */
public record ReviewUpdatedEvent(UUID restaurantId, ReviewDto review) {
}
