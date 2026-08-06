package com.fooddit.restaurant;

import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.restaurant.dto.RestaurantDto;
import com.fooddit.restaurant.dto.RestaurantSuggestionDto;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.restaurant.repository.RestaurantRepository;
import com.fooddit.review.repository.ReviewRepository;
import com.fooddit.save.entity.SavedRestaurant;
import com.fooddit.save.repository.SavedRestaurantRepository;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final SavedRestaurantRepository savedRestaurantRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<RestaurantDto> list(String searchText, String cuisine, String citySlug, String locality,
                                    Double minRating, String sort, UUID currentUserId) {
        List<Restaurant> restaurants = restaurantRepository
                .findAll(buildSpecification(searchText, cuisine, citySlug, locality, minRating));
        Map<UUID, Long> counts = reviewRepository.countGroupedByRestaurant().stream()
                .collect(Collectors.toMap(ReviewRepository.RestaurantReviewCount::getRestaurantId,
                        ReviewRepository.RestaurantReviewCount::getCount));
        Map<UUID, Long> commentCounts = commentRepository.countGroupedByRestaurant().stream()
                .collect(Collectors.toMap(CommentRepository.RestaurantCommentCount::getRestaurantId,
                        CommentRepository.RestaurantCommentCount::getCount));
        Set<UUID> savedIds = currentUserId != null
                ? Set.copyOf(savedRestaurantRepository.findRestaurantIdsByUserId(currentUserId))
                : Set.of();

        return restaurants.stream()
                .sorted(comparator(sort, commentCounts))
                .map(r -> RestaurantDto.from(r, counts.getOrDefault(r.getId(), 0L), savedIds.contains(r.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public RestaurantDto getById(UUID id, UUID currentUserId) {
        Restaurant restaurant = findRestaurant(id);
        boolean saved = currentUserId != null
                && savedRestaurantRepository.existsByUserIdAndRestaurantId(currentUserId, restaurant.getId());
        return RestaurantDto.from(restaurant, reviewRepository.countByRestaurantId(restaurant.getId()), saved);
    }

    @Transactional
    public void save(UUID restaurantId, UUID userId) {
        Restaurant restaurant = findRestaurant(restaurantId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (!savedRestaurantRepository.existsByUserIdAndRestaurantId(userId, restaurantId)) {
            savedRestaurantRepository.save(new SavedRestaurant(user, restaurant));
        }
    }

    @Transactional
    public void unsave(UUID restaurantId, UUID userId) {
        savedRestaurantRepository.deleteByUserIdAndRestaurantId(userId, restaurantId);
    }

    @Transactional(readOnly = true)
    public List<RestaurantDto> listSaved(UUID userId) {
        List<SavedRestaurant> saved = savedRestaurantRepository.findByUserIdWithRestaurant(userId);
        Map<UUID, Long> counts = reviewRepository.countGroupedByRestaurant().stream()
                .collect(Collectors.toMap(ReviewRepository.RestaurantReviewCount::getRestaurantId,
                        ReviewRepository.RestaurantReviewCount::getCount));
        return saved.stream()
                .map(s -> RestaurantDto.from(s.getRestaurant(), counts.getOrDefault(s.getRestaurant().getId(), 0L), true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RestaurantSuggestionDto> suggest(String citySlug, String q) {
        String trimmed = q == null ? "" : q.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }
        return restaurantRepository
                .findTop8ByCitySlugIgnoreCaseAndNameContainingIgnoreCaseOrderByNameAsc(citySlug, trimmed)
                .stream()
                .map(RestaurantSuggestionDto::from)
                .toList();
    }

    public Restaurant findRestaurant(UUID id) {
        return restaurantRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Restaurant not found"));
    }

    @Transactional(readOnly = true)
    public List<String> listCuisines() {
        return restaurantRepository.findDistinctCuisines();
    }

    private Specification<Restaurant> buildSpecification(String searchText, String cuisine, String citySlug,
                                                         String locality, Double minRating) {
        Specification<Restaurant> spec = Specification.where(null);

        // The feed is always scoped to a serviceable city (city_slug).
        spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("citySlug")), citySlug.toLowerCase()));

        String trimmedLocality = blankToNull(locality);
        if (trimmedLocality != null) {
            String locLike = "%" + trimmedLocality.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("locality")), locLike));
        }

        String trimmedQuery = blankToNull(searchText);
        if (trimmedQuery != null) {
            String like = "%" + trimmedQuery.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Join<Restaurant, String> cuisines = root.join("cuisines");
                return cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(cuisines), like),
                        cb.like(cb.lower(root.get("locality")), like),
                        cb.like(cb.lower(root.get("cityName")), like));
            });
        }

        String trimmedCuisine = blankToNull(cuisine);
        if (trimmedCuisine != null) {
            String cuisineLower = trimmedCuisine.toLowerCase();
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Join<Restaurant, String> cuisines = root.join("cuisines");
                return cb.equal(cb.lower(cuisines), cuisineLower);
            });
        }

        if (minRating != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("avgRating"), minRating));
        }

        return spec;
    }

    private Comparator<Restaurant> comparator(String sort, Map<UUID, Long> commentCounts) {
        Comparator<Restaurant> byName =
                Comparator.comparing(Restaurant::getName, String.CASE_INSENSITIVE_ORDER);

        return switch (sort == null ? "name" : sort) {
            case "rating", "top" -> Comparator.comparing(Restaurant::getAvgRating, Comparator.reverseOrder())
                    .thenComparing(byName);
            case "newest", "new" -> Comparator.comparing(Restaurant::getCreatedAt, Comparator.reverseOrder())
                    .thenComparing(byName);
            case "mostdiscussed" -> Comparator.comparing(
                            (Restaurant r) -> commentCounts.getOrDefault(r.getId(), 0L),
                            Comparator.reverseOrder())
                    .thenComparing(byName);
            default -> byName;
        };
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
