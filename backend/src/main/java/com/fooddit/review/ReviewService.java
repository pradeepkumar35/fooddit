package com.fooddit.review;

import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.ConflictException;
import com.fooddit.config.exception.ForbiddenException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.restaurant.RestaurantService;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.review.dto.CreateReviewRequest;
import com.fooddit.review.dto.ReviewDto;
import com.fooddit.review.dto.UpdateReviewRequest;
import com.fooddit.review.entity.Review;
import com.fooddit.review.repository.ReviewRepository;
import com.fooddit.stream.LiveEventPublisher;
import com.fooddit.stream.ReviewCreatedEvent;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import com.fooddit.vote.VoteService;
import com.fooddit.vote.entity.VotableType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final RestaurantService restaurantService;
    private final UserRepository userRepository;
    private final VoteService voteService;
    private final LiveEventPublisher liveEventPublisher;

    @Transactional(readOnly = true)
    public List<ReviewDto> listByRestaurant(UUID restaurantId, UUID currentUserId) {
        restaurantService.findRestaurant(restaurantId); // 404 if the restaurant does not exist
        List<Review> reviews = reviewRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
        return toDtos(reviews, currentUserId);
    }

    public Review findReview(UUID id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Review not found"));
    }

    @Transactional
    public ReviewDto create(UUID restaurantId, UUID userId, CreateReviewRequest request) {
        Restaurant restaurant = restaurantService.findRestaurant(restaurantId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (reviewRepository.existsByUserIdAndRestaurantId(userId, restaurantId)) {
            throw new ConflictException("You have already reviewed this restaurant");
        }

        Review review = reviewRepository.save(new Review(user, restaurant, request.rating(), request.content().trim()));
        recalculateAverageRating(restaurant);
        ReviewDto dto = ReviewDto.from(review);
        // Publish once the transaction commits so a brand-new review appears in
        // already-open restaurant pages without a reload (same live mechanism
        // that already delivers comment.created).
        liveEventPublisher.afterCommit(restaurant.getId(), "review.created", new ReviewCreatedEvent(restaurant.getId(), dto));
        return dto;
    }

    @Transactional
    public ReviewDto update(UUID reviewId, UUID userId, UpdateReviewRequest request) {
        Review review = findReview(reviewId);
        if (!review.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You can only edit your own reviews");
        }
        if (request.rating() == null && (request.content() == null || request.content().isBlank())) {
            throw new BadRequestException("Provide a rating and/or review text to update");
        }

        boolean ratingChanged = false;
        if (request.rating() != null && !request.rating().equals(review.getRating())) {
            review.setRating(request.rating());
            ratingChanged = true;
        }
        if (request.content() != null) {
            review.setContent(request.content().trim());
        }
        review.setEditedAt(Instant.now());

        if (ratingChanged) {
            recalculateAverageRating(review.getRestaurant());
        }
        return ReviewDto.from(review);
    }

    private List<ReviewDto> toDtos(List<Review> reviews, UUID currentUserId) {
        List<UUID> ids = reviews.stream().map(Review::getId).toList();
        Map<UUID, Integer> scores = voteService.scoresFor(VotableType.REVIEW, ids);
        Map<UUID, Integer> myVotes = voteService.myVotes(currentUserId, VotableType.REVIEW, ids);
        return reviews.stream()
                .map(r -> ReviewDto.from(r, scores.getOrDefault(r.getId(), 0), myVotes.get(r.getId())))
                .toList();
    }

    /**
     * Keeps the denormalized avg_rating column on the restaurant in sync after a
     * review is created. Cheap at PoC scale; a trigger or event-driven update is
     * a better fit at production scale.
     */
    private void recalculateAverageRating(Restaurant restaurant) {
        Double average = reviewRepository.averageRatingByRestaurantId(restaurant.getId());
        restaurant.setAvgRating(average != null ? average : 0.0);
    }
}
