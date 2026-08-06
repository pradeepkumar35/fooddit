package com.fooddit.security;

import java.util.UUID;

/**
 * Helpers for resolving the authenticated user on endpoints that are public but
 * can optionally act on behalf of a logged-in user. The Spring Security
 * principal is a {@link UUID} when a valid token is present, and the literal
 * string "anonymousUser" otherwise.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    /** Returns the authenticated user's UUID, or null for anonymous requests. */
    public static UUID orNull(Object principal) {
        return principal instanceof UUID uuid ? uuid : null;
    }

    /**
     * Returns the authenticated user's UUID on endpoints that require
     * authentication. Throws if the principal is not an authenticated user.
     */
    public static UUID orThrow(Object principal) {
        if (principal instanceof UUID uuid) {
            return uuid;
        }
        throw new com.fooddit.config.exception.UnauthorizedException("Authentication required");
    }
}
