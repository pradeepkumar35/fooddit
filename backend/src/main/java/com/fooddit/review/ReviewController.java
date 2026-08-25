package com.fooddit.review;

import com.fooddit.review.dto.CreateReviewRequest;
import com.fooddit.review.dto.ReviewDto;
import com.fooddit.review.dto.UpdateReviewRequest;
import com.fooddit.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * The Dossier review stream. {@code sort}: best (net score, newest
     * tiebreak — default), top (star rating desc) or new (chronological).
     */
    @GetMapping("/restaurants/{restaurantId}/reviews")
    public List<ReviewDto> listByRestaurant(@PathVariable UUID restaurantId,
                                            @RequestParam(required = false, defaultValue = "new") String sort,
                                            @AuthenticationPrincipal Object principal) {
        return reviewService.listByRestaurant(restaurantId, sort, CurrentUser.orNull(principal));
    }

    @PostMapping("/restaurants/{restaurantId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewDto create(@PathVariable UUID restaurantId,
                            @Valid @RequestBody CreateReviewRequest request,
                            @AuthenticationPrincipal UUID currentUserId) {
        return reviewService.create(restaurantId, currentUserId, request);
    }

    @PatchMapping("/reviews/{reviewId}")
    public ReviewDto update(@PathVariable UUID reviewId,
                            @Valid @RequestBody UpdateReviewRequest request,
                            @AuthenticationPrincipal UUID currentUserId) {
        return reviewService.update(reviewId, currentUserId, request);
    }
}
