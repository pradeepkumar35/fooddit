package com.fooddit.restaurant.dto;

import com.fooddit.restaurant.entity.Restaurant;

import java.util.UUID;

/**
 * A lightweight result for the search-box autocomplete: just enough to render a
 * suggestion row (name + locality) and navigate to the restaurant page.
 */
public record RestaurantSuggestionDto(UUID id, String name, String locality) {

    public static RestaurantSuggestionDto from(Restaurant restaurant) {
        return new RestaurantSuggestionDto(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getLocality());
    }
}