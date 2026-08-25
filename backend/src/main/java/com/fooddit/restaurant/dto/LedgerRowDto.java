package com.fooddit.restaurant.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One enriched row of the City Ledger. The rank/tier are the restaurant's
 * standing within its whole city (rating desc, ties by review count then name)
 * regardless of the caller's filters or sort; sorting only changes browse
 * order. The discussion block (comment count, latest comment/review snippets,
 * last activity) carries equal visual weight to the score in the UI.
 */
public record LedgerRowDto(
        UUID id,
        String name,
        String cuisineType,
        List<String> cuisines,
        String locality,
        String area,
        String cityName,
        String citySlug,
        Double avgRating,
        long reviewCount,
        int rank,
        String tier,
        Map<Integer, Long> distribution,
        long commentCount,
        Instant lastActivityAt,
        LatestReview latestReview,
        long monthlyVotes,
        boolean saved
) {

    /** Newest live review on this restaurant, for the expanded-row preview. */
    public record LatestReview(
            String authorName,
            Integer rating,
            String content,
            Instant createdAt
    ) {
    }
}
