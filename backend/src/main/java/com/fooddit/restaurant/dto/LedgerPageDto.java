package com.fooddit.restaurant.dto;

import java.util.List;

/**
 * Server-paginated City Ledger page. The backend owns slicing — clients must
 * request pages (limit/offset semantics via {@code page}/{@code size}), never
 * fetch-all-then-slice.
 */
public record LedgerPageDto(
        List<LedgerRowDto> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
