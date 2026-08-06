package com.fooddit.user.dto;

import com.fooddit.user.entity.User;

import java.time.Instant;
import java.util.UUID;

/**
 * Public representation of a user. Never exposes the password hash.
 */
public record UserDto(
        UUID id,
        String name,
        String email,
        Instant createdAt
) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
