package com.fooddit.auth.dto;

import com.fooddit.user.dto.UserDto;

public record AuthResponse(
        String token,
        UserDto user
) {

    public static AuthResponse of(UserDto user, String token) {
        return new AuthResponse(token, user);
    }
}
