package com.fooddit.restaurant.repository;

import com.fooddit.restaurant.entity.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID>, JpaSpecificationExecutor<Restaurant> {

    /** Distinct serviceable cities as (city_slug, city_name) pairs, ordered by name. */
    @Query("select distinct r.citySlug, r.cityName from Restaurant r where r.citySlug is not null order by r.cityName")
    List<Object[]> findDistinctCitySlugs();

    /** Distinct localities within a city, ordered by name. */
    @Query("select distinct r.locality from Restaurant r where r.citySlug = :citySlug and r.locality is not null order by r.locality")
    List<String> findDistinctLocalities(@Param("citySlug") String citySlug);

    /** Whether the city is serviceable (has at least one restaurant). */
    boolean existsByCitySlug(String citySlug);

    /** Distinct cuisine names across all restaurants, ordered A-Z (filter options). */
    @Query("select distinct c from Restaurant r join r.cuisines c order by c")
    List<String> findDistinctCuisines();

    /**
     * Name-based suggestions scoped to a city, for the search-box autocomplete.
     * Ordered by name and capped at 8 so the dropdown stays snappy.
     */
    List<Restaurant> findTop8ByCitySlugIgnoreCaseAndNameContainingIgnoreCaseOrderByNameAsc(
            String citySlug, String name);
}