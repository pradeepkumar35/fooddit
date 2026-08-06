package com.fooddit.review.dto;

import com.fooddit.review.entity.Review;
import com.fooddit.user.dto.UserDto;

import java.time.Instant;
import java.util.UUID;

public record ReviewDto(
        UUID id,
        UUID restaurantId,
        UserDto author,
        Integer rating,
        String content,
        Instant createdAt,
        Instant editedAt,
        int score,
        Integer myVote
) {

    public static ReviewDto from(Review review) {
        return new ReviewDto(
                review.getId(),
                review.getRestaurant().getId(),
                UserDto.from(review.getUser()),
                review.getRating(),
                review.getContent(),
                review.getCreatedAt(),
                review.getEditedAt(),
                0,
                null);
    }

    public static ReviewDto from(Review review, int score, Integer myVote) {
        return new ReviewDto(
                review.getId(),
                review.getRestaurant().getId(),
                UserDto.from(review.getUser()),
                review.getRating(),
                review.getContent(),
                review.getCreatedAt(),
                review.getEditedAt(),
                score,
                myVote);
    }
}
