package com.fooddit.review.repository;

import com.fooddit.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    List<Review> findByRestaurantIdOrderByCreatedAtDesc(UUID restaurantId);

    List<Review> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("""
            select r from Review r
            join fetch r.restaurant
            join fetch r.user
            where r.user.id = :userId
            order by r.createdAt desc
            """)
    List<Review> findByUserIdWithDetails(@Param("userId") UUID userId);

    boolean existsByUserIdAndRestaurantId(UUID userId, UUID restaurantId);

    long countByRestaurantId(UUID restaurantId);

    @Query("select avg(r.rating) from Review r where r.restaurant.id = :restaurantId")
    Double averageRatingByRestaurantId(@Param("restaurantId") UUID restaurantId);

    @Query("select min(r.createdAt) from Review r where r.restaurant.id = :restaurantId")
    Instant firstReviewedAtByRestaurantId(@Param("restaurantId") UUID restaurantId);

    /** Star-rating histogram counts for a set of restaurants (5→1 bars). */
    @Query("""
            select r.restaurant.id as rid, r.rating as rating, count(r) as cnt
            from Review r
            where r.restaurant.id in :ids
            group by r.restaurant.id, r.rating
            """)
    List<RatingCount> ratingDistributionByRestaurantIds(@Param("ids") Collection<UUID> ids);

    interface RatingCount {
        UUID getRid();

        Integer getRating();

        long getCnt();
    }

    /** Most recent review timestamp per restaurant (activity pulse). */
    @Query("""
            select r.restaurant.id as rid, max(r.createdAt) as latest
            from Review r
            where r.restaurant.id in :ids
            group by r.restaurant.id
            """)
    List<RestaurantLatest> latestActivityByRestaurantIds(@Param("ids") Collection<UUID> ids);

    interface RestaurantLatest {
        UUID getRid();

        Instant getLatest();
    }

    /** [reviewId, restaurantId] pairs for a set of restaurants. */
    @Query("""
            select r.id as reviewId, r.restaurant.id as restaurantId
            from Review r
            where r.restaurant.id in :ids
            """)
    List<Object[]> findIdAndRestaurantIdIn(@Param("ids") Collection<UUID> ids);

    /** [authorId, reviewId] pairs for a set of authors (reputation sums). */
    @Query("""
            select r.user.id as authorId, r.id as reviewId
            from Review r
            where r.user.id in :ids
            """)
    List<Object[]> findAuthorAndIdByAuthorIds(@Param("ids") Collection<UUID> ids);

    /**
     * Newest review per restaurant with its author eagerly fetched. Ties are
     * possible; callers dedupe by restaurant id keeping the newest.
     */
    @Query("""
            select r from Review r
            join fetch r.user
            where r.restaurant.id in :ids
              and r.createdAt = (
                  select max(r2.createdAt) from Review r2
                  where r2.restaurant.id = r.restaurant.id)
            """)
    List<Review> findLatestPerRestaurant(@Param("ids") Collection<UUID> ids);

    @Query("""
            select r.restaurant.id as restaurantId, count(r) as count
            from Review r
            group by r.restaurant.id
            """)
    List<RestaurantReviewCount> countGroupedByRestaurant();

    interface RestaurantReviewCount {
        UUID getRestaurantId();

        long getCount();
    }
}
