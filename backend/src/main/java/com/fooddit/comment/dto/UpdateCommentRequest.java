package com.fooddit.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCommentRequest(
        @NotBlank(message = "Comment text is required")
        @Size(max = 2000, message = "Comment must be at most 2000 characters")
        String content
) {
}
