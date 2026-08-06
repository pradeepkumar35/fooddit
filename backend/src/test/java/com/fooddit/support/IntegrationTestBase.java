package com.fooddit.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base class for REST integration tests. Boots the full application against the
 * in-memory H2 dev profile (including the restaurant seeder) and provides
 * helpers for signing up real users and driving authenticated requests through
 * the actual JWT filter, so the tests exercise the stack end to end.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
public abstract class IntegrationTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected record Signup(String token, String userId, String email) {
    }

    protected Signup signup(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Test User","email":"%s","password":"password123"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return new Signup(node.get("token").asText(), node.get("user").get("id").asText(), email);
    }

    protected String uniqueEmail() {
        return "test-" + UUID.randomUUID() + "@example.com";
    }

    /** Any seeded restaurant id, so tests can post reviews/comments against real data. */
    protected String firstRestaurantId() throws Exception {
        return restaurantId(0);
    }

    /** A seeded restaurant id by index (the list is stable: created in seed order). */
    protected String restaurantId(int index) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/restaurants").param("city", "mumbai"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get(index).get("id").asText();
    }

    protected String createReview(String token, String restaurantId, int rating, String content) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/restaurants/" + restaurantId + "/reviews")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":%d,"content":"%s"}
                                """.formatted(rating, content)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    protected String createComment(String token, String reviewId, String content, String parentCommentId) throws Exception {
        String parentField = parentCommentId == null ? "" : ",\"parentCommentId\":\"" + parentCommentId + "\"";
        MvcResult result = mockMvc.perform(post("/api/reviews/" + reviewId + "/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + content + "\"" + parentField + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }
}
