package com.fooddit.stream;

import com.fooddit.review.dto.ReviewDto;

import java.util.UUID;

/**
 * Fired when a new review is created on a restaurant. Carries the restaurant id
 * so clients can refresh their review list for that restaurant without a page
 * reload, plus the created review for optimistic local display if desired.
 */
public record ReviewCreatedEvent(UUID restaurantId, ReviewDto review) {
}
