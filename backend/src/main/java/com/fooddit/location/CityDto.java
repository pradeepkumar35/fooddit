package com.fooddit.location;

/**
 * A serviceable city: the URL-usable slug (e.g. bangalore) and its display name
 * (e.g. Bangalore). The slug is the value discovery queries filter on.
 */
public record CityDto(String citySlug, String cityName) {
}