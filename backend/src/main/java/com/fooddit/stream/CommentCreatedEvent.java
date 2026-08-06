package com.fooddit.stream;

import com.fooddit.comment.dto.CommentDto;

import java.util.UUID;

/**
 * Fired when a comment (or nested reply) is created. Carries the review id so
 * the client can refresh only the corresponding thread, plus the created
 * comment itself for optimistic local display if desired.
 */
public record CommentCreatedEvent(UUID reviewId, CommentDto comment) {
}