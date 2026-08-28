package com.fooddit.stream;

import com.fooddit.comment.dto.CommentDto;

import java.util.UUID;

/**
 * Fired when a comment (or nested reply) is edited or soft-deleted. Carries the
 * review id so clients refresh only the corresponding thread, plus the updated
 * comment (its {@code deleted}/{@code editedAt} flags reflect the new state).
 */
public record CommentUpdatedEvent(UUID reviewId, CommentDto comment) {
}
