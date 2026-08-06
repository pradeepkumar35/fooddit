package com.fooddit.user.profile.dto;

import com.fooddit.user.dto.UserDto;

import java.util.List;

/**
 * A user's public profile: their basic info plus their reviews and comments,
 * each carrying restaurant context so the page reads well on its own.
 */
public record UserProfileDto(
        UserDto user,
        List<ProfileReviewDto> reviews,
        List<ProfileCommentDto> comments
) {
}
