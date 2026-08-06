package com.fooddit.review;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for the review submission flow, in particular that invalid
 * input returns a specific per-field message (e.g. "Review text is required")
 * instead of only a generic "Validation failed" summary.
 */
class ReviewApiIntegrationTest extends IntegrationTestBase {

    @Test
    void createsReviewWhenValid() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":5,"content":"Amazing biryani, will be back."}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Amazing biryani, will be back."))
                .andExpect(jsonPath("$.rating").value(5));
    }

    @Test
    void emptyContentReturnsSpecificFieldError() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":5,"content":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.content").value("Review text is required"));
    }

    @Test
    void whitespaceOnlyContentReturnsSpecificFieldError() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":5,"content":"   "}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.content").value("Review text is required"));
    }

    @Test
    void missingRatingReturnsSpecificFieldError() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Great food"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.rating").value("Rating is required"));
    }

    @Test
    void outOfRangeRatingReturnsSpecificFieldError() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":0,"content":"Great food"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.rating").value("Rating must be between 1 and 5"));
    }

    @Test
    void overlongContentReturnsSpecificFieldError() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String longContent = "a".repeat(2001);

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"content\":\"" + longContent + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.content").value("Review must be at most 2000 characters"));
    }

    @Test
    void anonymousCannotCreateReview() throws Exception {
        String restaurantId = firstRestaurantId();

        mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":5,"content":"Sneaky"}
                                """))
                .andExpect(status().isUnauthorized());
    }
}
