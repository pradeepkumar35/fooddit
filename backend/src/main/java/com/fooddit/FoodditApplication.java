package com.fooddit;

import com.fooddit.config.FoodditProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableConfigurationProperties(FoodditProperties.class)
public class FoodditApplication {

    public static void main(String[] args) {
        SpringApplication.run(FoodditApplication.class, args);
    }
}
