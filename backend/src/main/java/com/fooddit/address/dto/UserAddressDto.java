package com.fooddit.address.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record UserAddressDto(
        UUID id,
        String label,
        String addressLine,
        String locality,
        String cityName,
        String citySlug,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean isDefault,
        Instant createdAt) {
}