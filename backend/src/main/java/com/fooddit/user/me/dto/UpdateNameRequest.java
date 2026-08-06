package com.fooddit.user.me.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateNameRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 60, message = "Name must be at most 60 characters")
        String name
) {
}