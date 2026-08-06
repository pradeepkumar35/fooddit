package com.fooddit.security;

import com.fooddit.config.FoodditProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Creates and validates HMAC-signed JWTs. The subject claim holds the user's
 * UUID, so it becomes the Spring Security principal directly.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(FoodditProperties properties) {
        String secret = properties.getJwt().getSecret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be configured and at least 32 bytes long (HS256). "
                            + "Set it via the JWT_SECRET environment variable (dev profile provides a local fallback).");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = properties.getJwt().getExpirationMs();
    }

    public String generateToken(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)
                .compact();
    }

    /**
     * @throws io.jsonwebtoken.JwtException if the token is invalid, expired or
     *                                      signed with a different key
     * @throws IllegalArgumentException     if the subject is not a valid UUID
     */
    public UUID parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.getSubject());
    }
}
