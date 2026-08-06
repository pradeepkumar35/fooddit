package com.fooddit.save.repository;

import com.fooddit.save.entity.SavedRestaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedRestaurantRepository extends JpaRepository<SavedRestaurant, UUID> {

    boolean existsByUserIdAndRestaurantId(UUID userId, UUID restaurantId);

    Optional<SavedRestaurant> findByUserIdAndRestaurantId(UUID userId, UUID restaurantId);

    void deleteByUserIdAndRestaurantId(UUID userId, UUID restaurantId);

    /**
     * A user's saved restaurants with the restaurant eagerly fetched so the
     * saved-list page avoids N+1 lazy loads.
     */
    @Query("""
            select s from SavedRestaurant s
            join fetch s.restaurant
            where s.user.id = :userId
            order by s.createdAt desc
            """)
    List<SavedRestaurant> findByUserIdWithRestaurant(@Param("userId") UUID userId);

    /**
     * The ids of every restaurant the user has saved, used to enrich a batch of
     * restaurant DTOs with the acting user's save state in a single query.
     */
    @Query("select s.restaurant.id from SavedRestaurant s where s.user.id = :userId")
    List<UUID> findRestaurantIdsByUserId(@Param("userId") UUID userId);
}
