package com.fooddit.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Typed view of the "fooddit.*" configuration section. Values are bound from
 * application.yml / environment variables (see application.yml).
 */
@ConfigurationProperties(prefix = "fooddit")
@Getter
@Setter
public class FoodditProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long expirationMs = 7 * 24 * 60 * 60 * 1000L;
    }

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5173");
    }
}
