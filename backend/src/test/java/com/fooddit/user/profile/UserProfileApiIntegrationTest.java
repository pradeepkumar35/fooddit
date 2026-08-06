package com.fooddit.user.profile;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for the profile Comments tab data: the endpoint must return
 * each user's comments with enough context (restaurant id + name, review id and
 * review snippet) for the frontend to render an out-of-thread list that links
 * back to the original restaurant.
 */
class UserProfileApiIntegrationTest extends IntegrationTestBase {

    @Test
    void returnsUserCommentsWithRestaurantContext() throws Exception {
        Signup author = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Review snippet for context");
        createComment(author.token(), reviewId, "Love this place", null);

        mockMvc.perform(get("/api/users/" + author.userId() + "/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(author.userId()))
                .andExpect(jsonPath("$.reviews.length()").value(1))
                .andExpect(jsonPath("$.comments.length()").value(1))
                .andExpect(jsonPath("$.comments[0].content").value("Love this place"))
                .andExpect(jsonPath("$.comments[0].reviewId").value(reviewId))
                .andExpect(jsonPath("$.comments[0].restaurantId").value(restaurantId))
                .andExpect(jsonPath("$.comments[0].restaurantName").isNotEmpty())
                .andExpect(jsonPath("$.comments[0].reviewContent").value("Review snippet for context"));
    }

    @Test
    void commentsAreOrderedNewestFirst() throws Exception {
        Signup author = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Snippet");
        createComment(author.token(), reviewId, "older comment", null);
        // A tiny delay guarantees a distinct createdAt for the second comment.
        Thread.sleep(5);
        createComment(author.token(), reviewId, "newest comment", null);

        mockMvc.perform(get("/api/users/" + author.userId() + "/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments.length()").value(2))
                .andExpect(jsonPath("$.comments[0].content").value("newest comment"))
                .andExpect(jsonPath("$.comments[1].content").value("older comment"));
    }

    @Test
    void emptyProfileHasEmptyReviewsAndComments() throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(get("/api/users/" + user.userId() + "/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(0))
                .andExpect(jsonPath("$.comments.length()").value(0));
    }

    @Test
    void commentScoreIsEnriched() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup voter = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Snippet");
        String commentId = createComment(author.token(), reviewId, "Score me", null);

        // A second user upvotes the comment.
        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1));

        // The viewer sees myVote=1; an anonymous viewer sees myVote absent.
        mockMvc.perform(get("/api/users/" + author.userId() + "/profile")
                        .header("Authorization", "Bearer " + voter.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments[0].score").value(1))
                .andExpect(jsonPath("$.comments[0].myVote").value(1));

        mockMvc.perform(get("/api/users/" + author.userId() + "/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments[0].score").value(1))
                .andExpect(jsonPath("$.comments[0].myVote").doesNotExist());
    }

    @Test
    void unknownUserReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/users/00000000-0000-0000-0000-000000000000/profile"))
                .andExpect(status().isNotFound());
    }
}