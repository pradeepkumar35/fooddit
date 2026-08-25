package com.fooddit.restaurant.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Fact-sheet payload for the restaurant Dossier: the city standing seal,
 * the 5→1 star distribution backing the histogram bars, and provenance stats.
 */
public record RestaurantStatsDto(
        int rank,
        String tier,
        Map<Integer, Long> distribution,
        long reviewCount,
        Instant firstReviewedAt
) {
}
