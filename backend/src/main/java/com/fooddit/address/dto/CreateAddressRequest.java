package com.fooddit.address.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateAddressRequest(
        @Size(max = 50) String label,
        @NotBlank @Size(max = 255) String addressLine,
        @Size(max = 255) String locality,
        @NotBlank @Size(max = 255) String cityName,
        @NotBlank @Size(max = 255) String citySlug,
        BigDecimal latitude,
        BigDecimal longitude,
        Boolean isDefault) {
}