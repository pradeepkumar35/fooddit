package com.fooddit.restaurant.dto;

import com.fooddit.restaurant.CuisinePlaceholder;
import com.fooddit.restaurant.entity.Restaurant;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RestaurantDto(
        UUID id,
        String name,
        String address,
        String cuisineType,
        List<String> cuisines,
        String priceRange,
        String cityName,
        String citySlug,
        String locality,
        String area,
        BigDecimal latitude,
        BigDecimal longitude,
        Double avgRating,
        Integer totalRatings,
        Integer costForTwo,
        Integer deliveryTimeMins,
        Boolean isVeg,
        Boolean isOpen,
        Integer menuItemCount,
        Integer menuCategoryCount,
        long reviewCount,
        Instant createdAt,
        boolean saved,
        String imageUrl,
        String fallbackUrl
) {

    public static RestaurantDto from(Restaurant restaurant, long reviewCount) {
        return new RestaurantDto(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getAddress(),
                leadCuisine(restaurant),
                restaurant.getCuisines(),
                restaurant.getPriceRange(),
                restaurant.getCityName(),
                restaurant.getCitySlug(),
                restaurant.getLocality(),
                restaurant.getArea(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                restaurant.getAvgRating() == null ? 0.0 : restaurant.getAvgRating(),
                restaurant.getTotalRatings(),
                restaurant.getCostForTwo(),
                restaurant.getDeliveryTimeMins(),
                restaurant.getIsVeg(),
                restaurant.getIsOpen(),
                restaurant.getMenuItemCount(),
                restaurant.getMenuCategoryCount(),
                reviewCount,
                restaurant.getCreatedAt(),
                false,
                restaurant.getImageUrl(),
                CuisinePlaceholder.tileFor(leadCuisine(restaurant)));
    }

    public static RestaurantDto from(Restaurant restaurant, long reviewCount, boolean saved) {
        return new RestaurantDto(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getAddress(),
                leadCuisine(restaurant),
                restaurant.getCuisines(),
                restaurant.getPriceRange(),
                restaurant.getCityName(),
                restaurant.getCitySlug(),
                restaurant.getLocality(),
                restaurant.getArea(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                restaurant.getAvgRating() == null ? 0.0 : restaurant.getAvgRating(),
                restaurant.getTotalRatings(),
                restaurant.getCostForTwo(),
                restaurant.getDeliveryTimeMins(),
                restaurant.getIsVeg(),
                restaurant.getIsOpen(),
                restaurant.getMenuItemCount(),
                restaurant.getMenuCategoryCount(),
                reviewCount,
                restaurant.getCreatedAt(),
                saved,
                restaurant.getImageUrl(),
                CuisinePlaceholder.tileFor(leadCuisine(restaurant)));
    }

    private static String leadCuisine(Restaurant restaurant) {
        List<String> cuisines = restaurant.getCuisines();
        if (cuisines != null && !cuisines.isEmpty()) {
            return cuisines.get(0);
        }
        return restaurant.getCuisineType();
    }
}