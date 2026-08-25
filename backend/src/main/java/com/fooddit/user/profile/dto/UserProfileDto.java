package com.fooddit.user.profile.dto;

import com.fooddit.user.dto.UserDto;

import java.util.List;

/**
 * A user's public profile: their basic info plus their reviews and comments,
 * each carrying restaurant context so the page reads well on its own.
 * {@code reputation} is the user's lifetime net upvotes across their own
 * reviews and comments — a real, derived signal, displayed as the REP badge.
 */
public record UserProfileDto(
        UserDto user,
        long reputation,
        List<ProfileReviewDto> reviews,
        List<ProfileCommentDto> comments
) {
}
