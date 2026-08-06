package com.fooddit.config.exception;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * Uniform error body returned by the API. {@code fieldErrors} maps a field name
 * to the validation message that failed, and is only present on 400 validation
 * errors.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors
) {

    public static ApiError of(HttpStatus status, String message, String path, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, fieldErrors);
    }
}
