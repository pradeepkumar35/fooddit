package com.fooddit.report;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReportApiIntegrationTest extends IntegrationTestBase {

    @Test
    void reportsACommentAndReturnsItsTarget() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(signup.token(), reviewId, "offensive", null);

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"COMMENT","targetId":"%s","reason":"HARASSMENT"}
                                """.formatted(commentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetType").value("COMMENT"))
                .andExpect(jsonPath("$.targetId").value(commentId))
                .andExpect(jsonPath("$.reason").value("HARASSMENT"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void reportsAReview() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 2, "Not great");

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"REVIEW","targetId":"%s","reason":"FAKE_REVIEW"}
                                """.formatted(reviewId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetType").value("REVIEW"));
    }

    @Test
    void duplicateReportIsRejectedWithConflict() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 4, "Okay");
        String commentId = createComment(signup.token(), reviewId, "spam spam", null);

        String payload = """
                {"targetType":"COMMENT","targetId":"%s","reason":"SPAM"}
                """.formatted(commentId);

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You have already reported this content"));
    }

    @Test
    void unknownReportReasonIsRejectedAsMalformed() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 4, "Okay");
        String commentId = createComment(signup.token(), reviewId, "spam spam", null);

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"COMMENT","targetId":"%s","reason":"NOPE"}
                                """.formatted(commentId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body"));
    }

    @Test
    void anonymousReportIsRejected() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 4, "Okay");
        String commentId = createComment(signup.token(), reviewId, "spam", null);

        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"COMMENT","targetId":"%s","reason":"SPAM"}
                                """.formatted(commentId)))
                .andExpect(status().isUnauthorized());
    }
}