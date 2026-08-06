package com.fooddit.vote;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for Reddit-style vote semantics: casting the same direction
 * again toggles the vote off, switching direction replaces it, and the returned
 * score/myVote are always consistent with the final state. Also covers the
 * validation, not-found, and auth guard cases for POST /api/votes.
 */
class VoteApiIntegrationTest extends IntegrationTestBase {

    @Test
    void castingSameDirectionAgainTogglesTheVoteOff() throws Exception {
        Signup voter = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(voter.token(), restaurantId, 5, "Snippet");
        String commentId = createComment(voter.token(), reviewId, "Toggle me", null);

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.myVote").value(1));

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(0))
                .andExpect(jsonPath("$.myVote").doesNotExist());
    }

    @Test
    void switchingDirectionReplacesTheVote() throws Exception {
        Signup voter = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(voter.token(), restaurantId, 5, "Snippet");
        String commentId = createComment(voter.token(), reviewId, "Switch me", null);

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":-1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(-1))
                .andExpect(jsonPath("$.myVote").value(-1));

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.myVote").value(1));
    }

    @Test
    void scoresAccumulateAcrossUsers() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup voterOne = signup(uniqueEmail());
        Signup voterTwo = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Snippet");
        String commentId = createComment(author.token(), reviewId, "Count me", null);

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voterOne.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1));

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voterTwo.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(2))
                .andExpect(jsonPath("$.myVote").value(1));
    }

    @Test
    void invalidVoteValueIsRejected() throws Exception {
        Signup voter = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(voter.token(), restaurantId, 5, "Snippet");
        String commentId = createComment(voter.token(), reviewId, "Invalid", null);

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":2}
                                """.formatted(commentId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingVotableIsNotFound() throws Exception {
        Signup voter = signup(uniqueEmail());

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"00000000-0000-0000-0000-000000000000","voteValue":1}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void anonymousVoteIsUnauthorized() throws Exception {
        Signup author = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Snippet");
        String commentId = createComment(author.token(), reviewId, "Anon vote", null);

        mockMvc.perform(post("/api/votes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isUnauthorized());
    }
}
