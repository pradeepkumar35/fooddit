package com.fooddit.config.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for expected, client-facing application errors. Each subclass
 * carries an HTTP status that the {@link GlobalExceptionHandler} turns into a
 * structured JSON response.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
