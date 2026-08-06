package com.fooddit.user.me.dto;

/**
 * Partial preferences update. Any field may be omitted (null) to keep its
 * current value.
 */
public record UpdatePreferencesRequest(
        String displayMode,
        Boolean notifyOnReviewReply,
        Boolean notifyOnCommentReply
) {
}