package com.fooddit.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateCommentRequest(
        @NotBlank(message = "Comment text is required")
        @Size(max = 2000, message = "Comment must be at most 2000 characters")
        String content,

        // null = top-level comment on the review, non-null = reply to another comment
        UUID parentCommentId
) {
}
