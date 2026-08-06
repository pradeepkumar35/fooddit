package com.fooddit.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Body for editing a review. Both fields are optional so a user can update the
 * rating, the text, or both, but at least one must be present (enforced in the
 * service, since a record-level constraint can't express "at least one of").
 */
public record UpdateReviewRequest(
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        Integer rating,

        @Size(max = 2000, message = "Review must be at most 2000 characters")
        String content
) {
}
