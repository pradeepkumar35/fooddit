package com.fooddit.restaurant;

import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.restaurant.dto.LedgerPageDto;
import com.fooddit.restaurant.dto.LedgerRowDto;
import com.fooddit.restaurant.dto.RestaurantDto;
import com.fooddit.restaurant.dto.RestaurantStatsDto;
import com.fooddit.restaurant.dto.RestaurantSuggestionDto;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.restaurant.repository.RestaurantRepository;
import com.fooddit.review.entity.Review;
import com.fooddit.review.repository.ReviewRepository;
import com.fooddit.save.entity.SavedRestaurant;
import com.fooddit.save.repository.SavedRestaurantRepository;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import com.fooddit.vote.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    /** Rows per City Ledger page — the UI's pager is built around this size. */
    public static final int LEDGER_PAGE_SIZE = 30;

    private final RestaurantRepository restaurantRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final SavedRestaurantRepository savedRestaurantRepository;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;

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

    /**
     * The City Ledger: one server-paginated page of enriched rows. Rank and
     * tier are each restaurant's standing within the whole city (rating desc,
     * ties by review count then name) independent of the caller's filters or
     * sort — sorting only changes browse order. Discussion aggregates
     * (comment count, latest comment/review snippets, last activity) are
     * batched per page so the UI's co-headline content costs four queries,
     * not one per row.
     */
    @Transactional(readOnly = true)
    public LedgerPageDto ledger(String searchText, String cuisine, String citySlug, String locality,
                                Double minRating, String sort, int page, int size, UUID currentUserId) {
        if (citySlug == null || citySlug.isBlank()) {
            throw new BadRequestException("city is required");
        }
        if (page < 0) {
            page = 0;
        }
        if (size < 1 || size > 100) {
            size = LEDGER_PAGE_SIZE;
        }

        List<Restaurant> all = restaurantRepository
                .findAll(buildSpecification(searchText, cuisine, citySlug, locality, minRating));
        Map<UUID, Long> reviewCounts = reviewCounts();
        Map<UUID, Long> commentCounts = commentCounts();
        all.sort(comparator(sort, commentCounts));

        long totalElements = all.size();
        int totalPages = (int) Math.ceil(totalElements / (double) size);
        int from = (int) Math.min((long) page * size, totalElements);
        int to = (int) Math.min((long) from + size, totalElements);
        List<Restaurant> pageRows = all.subList(from, to);

        Map<UUID, Integer> ranks = cityRanks(citySlug, reviewCounts);
        Set<UUID> savedIds = currentUserId != null
                ? Set.copyOf(savedRestaurantRepository.findRestaurantIdsByUserId(currentUserId))
                : Set.of();

        List<LedgerRowDto> content = new ArrayList<>();
        if (!pageRows.isEmpty()) {
            List<UUID> ids = pageRows.stream().map(Restaurant::getId).toList();
            Map<UUID, Instant> lastCommentAt = toLatestMap(commentRepository.latestActivityByRestaurantIds(ids));
            Map<UUID, Instant> lastReviewAt = toLatestMap(reviewRepository.latestActivityByRestaurantIds(ids));
            Map<UUID, Review> latestReviews = latestReviewByRestaurant(ids);
            Map<UUID, Long> monthlyVotes = monthlyVotesFor(ids);
            Map<UUID, Map<Integer, Long>> distributions = distributionsFor(ids);

            for (Restaurant r : pageRows) {
                Instant commentAt = lastCommentAt.get(r.getId());
                Instant reviewAt = lastReviewAt.get(r.getId());
                Instant lastActivity = laterOf(commentAt, reviewAt);
                Review newest = latestReviews.get(r.getId());

                LedgerRowDto.LatestReview preview = newest == null ? null
                        : new LedgerRowDto.LatestReview(
                        newest.getUser().getName(),
                        newest.getRating(),
                        newest.getContent(),
                        newest.getCreatedAt());

                content.add(new LedgerRowDto(
                        r.getId(),
                        r.getName(),
                        leadCuisine(r),
                        r.getCuisines(),
                        r.getLocality(),
                        r.getArea(),
                        r.getCityName(),
                        r.getCitySlug(),
                        avgOrZero(r),
                        reviewCounts.getOrDefault(r.getId(), 0L),
                        ranks.getOrDefault(r.getId(), 0),
                        tierOf(r.getAvgRating()),
                        distributions.getOrDefault(r.getId(), Map.of()),
                        commentCounts.getOrDefault(r.getId(), 0L),
                        lastActivity,
                        preview,
                        monthlyVotes.getOrDefault(r.getId(), 0L),
                        savedIds.contains(r.getId())));
            }
        }

        return new LedgerPageDto(content, page, size, totalElements, totalPages);
    }

    /** Dossier fact-sheet payload: standing seal, histogram, provenance. */
    @Transactional(readOnly = true)
    public RestaurantStatsDto stats(UUID id) {
        Restaurant restaurant = findRestaurant(id);
        Map<UUID, Integer> ranks = cityRanks(restaurant.getCitySlug(), reviewCounts());

        Map<Integer, Long> distribution = new TreeMap<>((a, b) -> Integer.compare(b, a)); // 5→1
        for (ReviewRepository.RatingCount rc :
                reviewRepository.ratingDistributionByRestaurantIds(List.of(restaurant.getId()))) {
            distribution.put(rc.getRating(), rc.getCnt());
        }

        return new RestaurantStatsDto(
                ranks.getOrDefault(restaurant.getId(), 0),
                tierOf(restaurant.getAvgRating()),
                distribution,
                reviewRepository.countByRestaurantId(id),
                reviewRepository.firstReviewedAtByRestaurantId(id));
    }

    private static Double avgOrZero(Restaurant r) {
        return r.getAvgRating() == null ? 0.0 : r.getAvgRating();
    }

    /** Elite ≥4.5 · Great ≥4.0 · Solid below. Unrated entries land on Solid. */
    public static String tierOf(Double avgRating) {
        double value = avgRating == null ? 0.0 : avgRating;
        if (value >= 4.5) return "ELITE";
        if (value >= 4.0) return "GREAT";
        return "SOLID";
    }

    private static String leadCuisine(Restaurant restaurant) {
        List<String> cuisines = restaurant.getCuisines();
        if (cuisines != null && !cuisines.isEmpty()) {
            return cuisines.get(0);
        }
        return restaurant.getCuisineType();
    }

    private Map<UUID, Long> reviewCounts() {
        return reviewRepository.countGroupedByRestaurant().stream()
                .collect(Collectors.toMap(ReviewRepository.RestaurantReviewCount::getRestaurantId,
                        ReviewRepository.RestaurantReviewCount::getCount));
    }

    private Map<UUID, Long> commentCounts() {
        return commentRepository.countGroupedByRestaurant().stream()
                .collect(Collectors.toMap(CommentRepository.RestaurantCommentCount::getRestaurantId,
                        CommentRepository.RestaurantCommentCount::getCount));
    }

    /**
     * Standing for every restaurant in the city: 1..n by rating desc, ties by
     * review count desc then name asc. Computed over the unfiltered city so a
     * rank keeps its meaning while the caller filters or re-sorts.
     */
    private Map<UUID, Integer> cityRanks(String citySlug, Map<UUID, Long> reviewCounts) {
        List<Restaurant> inCity = restaurantRepository.findAll((root, query, cb) ->
                cb.equal(cb.lower(root.get("citySlug")), citySlug.toLowerCase()));
        inCity.sort(Comparator
                .comparing(Restaurant::getAvgRating,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing((Restaurant r) -> reviewCounts.getOrDefault(r.getId(), 0L),
                        Comparator.reverseOrder())
                .thenComparing(Restaurant::getName, String.CASE_INSENSITIVE_ORDER));
        Map<UUID, Integer> ranks = new HashMap<>();
        for (int i = 0; i < inCity.size(); i++) {
            ranks.put(inCity.get(i).getId(), i + 1);
        }
        return ranks;
    }

    private static <T> Map<UUID, T> latestByRestaurant(List<T> items, java.util.function.Function<T, UUID> key,
                                                       java.util.function.Function<T, Instant> when) {
        Map<UUID, T> out = new LinkedHashMap<>();
        for (T item : items) {
            UUID id = key.apply(item);
            T existing = out.get(id);
            if (existing == null || when.apply(item).isAfter(when.apply(existing))) {
                out.put(id, item);
            }
        }
        return out;
    }

    private Map<UUID, Review> latestReviewByRestaurant(List<UUID> ids) {
        return latestByRestaurant(reviewRepository.findLatestPerRestaurant(ids),
                review -> review.getRestaurant().getId(), Review::getCreatedAt);
    }

    private static Instant laterOf(Instant a, Instant b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    /** 5→1 histogram per restaurant for a page of rows (one grouped query). */
    private Map<UUID, Map<Integer, Long>> distributionsFor(List<UUID> ids) {
        Map<UUID, Map<Integer, Long>> out = new HashMap<>();
        for (ReviewRepository.RatingCount rc : reviewRepository.ratingDistributionByRestaurantIds(ids)) {
            out.computeIfAbsent(rc.getRid(), k -> new TreeMap<>((a, b) -> Integer.compare(b, a)))
                    .put(rc.getRating(), rc.getCnt());
        }
        return out;
    }

    private static Map<UUID, Instant> toLatestMap(List<?> projections) {
        Map<UUID, Instant> out = new HashMap<>();
        for (Object p : projections) {
            if (p instanceof CommentRepository.RestaurantLatestActivity a) {
                out.put(a.getRid(), a.getLatest());
            } else if (p instanceof ReviewRepository.RestaurantLatest b) {
                out.put(b.getRid(), b.getLatest());
            }
        }
        return out;
    }

    /**
     * Votes cast in the trailing 30 days on each restaurant's reviews. Two
     * JPQL steps (review-id mapping, then vote counts) avoid native UUID-list
     * binding pitfalls.
     */
    private Map<UUID, Long> monthlyVotesFor(List<UUID> restaurantIds) {
        Instant since = Instant.now().minus(Duration.ofDays(30));
        List<Object[]> pairs = reviewRepository.findIdAndRestaurantIdIn(restaurantIds);
        Map<UUID, UUID> restaurantOfReview = new HashMap<>();
        for (Object[] pair : pairs) {
            restaurantOfReview.put((UUID) pair[0], (UUID) pair[1]);
        }
        if (restaurantOfReview.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Long> out = new HashMap<>();
        for (VoteRepository.RecentCount rc : voteRepository.countRecentByReviewIds(restaurantOfReview.keySet(), since)) {
            UUID restaurantId = restaurantOfReview.get(rc.getVotableId());
            if (restaurantId != null) {
                out.merge(restaurantId, rc.getCnt(), Long::sum);
            }
        }
        return out;
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
