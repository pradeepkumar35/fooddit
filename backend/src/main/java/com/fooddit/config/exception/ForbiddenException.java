package com.fooddit.config.exception;

import org.springframework.http.HttpStatus;

/**
 * The authenticated caller may not perform this action, e.g. editing someone
 * else's review or comment.
 */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}
