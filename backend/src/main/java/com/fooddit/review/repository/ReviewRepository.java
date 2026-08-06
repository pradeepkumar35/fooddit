package com.fooddit.review.repository;

import com.fooddit.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
