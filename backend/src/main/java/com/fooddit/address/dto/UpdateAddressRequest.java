package com.fooddit.address.dto;

import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateAddressRequest(
        @Size(max = 50) String label,
        @Size(max = 255) String addressLine,
        @Size(max = 255) String locality,
        @Size(max = 255) String cityName,
        @Size(max = 255) String citySlug,
        BigDecimal latitude,
        BigDecimal longitude) {
}