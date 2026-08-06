package com.fooddit.user.me.dto;

import com.fooddit.user.entity.User;

import java.time.Instant;
import java.util.UUID;

/**
 * The acting user's account details plus their preferences. Returned by every
 * /api/me endpoint so the client can refresh name and preferences together.
 */
public record MeDto(
        UUID id,
        String name,
        String email,
        Instant createdAt,
        String displayMode,
        boolean notifyOnReviewReply,
        boolean notifyOnCommentReply
) {

    public static MeDto from(User user) {
        return new MeDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt(),
                user.getDisplayMode(),
                user.isNotifyOnReviewReply(),
                user.isNotifyOnCommentReply());
    }
}