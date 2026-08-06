package com.fooddit.comment;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CommentApiIntegrationTest extends IntegrationTestBase {

    @Test
    void postsTopLevelCommentAndReturnsIt() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");

        mockMvc.perform(post("/api/reviews/" + reviewId + "/comments")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Paneer was excellent"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Paneer was excellent"))
                .andExpect(jsonPath("$.reviewId").value(reviewId))
                .andExpect(jsonPath("$.parentCommentId").doesNotExist());
    }

    @Test
    void blankCommentReturnsSpecificFieldError() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");

        mockMvc.perform(post("/api/reviews/" + reviewId + "/comments")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.content").value("Comment text is required"));
    }

    @Test
    void buildsNestedReplyTree() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String rootId = createComment(signup.token(), reviewId, "First!", null);
        createComment(signup.token(), reviewId, "Agreed, love it", rootId);

        mockMvc.perform(get("/api/reviews/" + reviewId + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(rootId))
                .andExpect(jsonPath("$[0].replies.length()").value(1))
                .andExpect(jsonPath("$[0].replies[0].content").value("Agreed, love it"))
                .andExpect(jsonPath("$[0].replies[0].parentCommentId").value(rootId));
    }

    @Test
    void replyToCommentOnDifferentReviewIsRejected() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantOne = restaurantId(0);
        String restaurantTwo = restaurantId(1);
        String reviewOne = createReview(signup.token(), restaurantOne, 4, "One");
        String reviewTwo = createReview(signup.token(), restaurantTwo, 4, "Two");
        String rootOnOne = createComment(signup.token(), reviewOne, "belongs to review one", null);

        mockMvc.perform(post("/api/reviews/" + reviewTwo + "/comments")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"wrong thread\",\"parentCommentId\":\"" + rootOnOne + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Parent comment does not belong to this review"));
    }

    @Test
    void authorCanEditOwnComment() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(signup.token(), reviewId, "original", null);

        mockMvc.perform(patch("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"edited text"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("edited text"))
                .andExpect(jsonPath("$.editedAt").exists());
    }

    @Test
    void cannotEditAnotherUsersComment() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup other = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(author.token(), reviewId, "mine", null);

        mockMvc.perform(patch("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + other.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"hijacked"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only edit your own comments"));
    }

    @Test
    void authorCanSoftDeleteOwnComment() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(signup.token(), reviewId, "delete me", null);

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true));

        mockMvc.perform(get("/api/reviews/" + reviewId + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].deleted").value(true))
                .andExpect(jsonPath("$[0].content").value("delete me"));
    }

    @Test
    void cannotDeleteAnotherUsersComment() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup other = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(author.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(author.token(), reviewId, "mine", null);

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + other.token()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only delete your own comments"));
    }

    @Test
    void deletedCommentKeepsNestedReplies() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String rootId = createComment(signup.token(), reviewId, "root", null);
        String replyId = createComment(signup.token(), reviewId, "nested reply", rootId);

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + rootId)
                        .header("Authorization", "Bearer " + signup.token()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/reviews/" + reviewId + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].deleted").value(true))
                .andExpect(jsonPath("$[0].replies.length()").value(1))
                .andExpect(jsonPath("$[0].replies[0].id").value(replyId))
                .andExpect(jsonPath("$[0].replies[0].deleted").value(false));
    }

    @Test
    void deletingAnAlreadyDeletedCommentIsIdempotent() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(signup.token(), reviewId, "delete me", null);

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true));

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true));
    }

    @Test
    void editingAVoteOnADeletedCommentIsRejected() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(signup.token(), reviewId, "do not touch", null);

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token()))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"resurrected"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A deleted comment cannot be edited"));

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"votableType":"COMMENT","votableId":"%s","voteValue":1}
                                """.formatted(commentId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot vote on a deleted comment"));
    }

    @Test
    void reportingADeletedCommentIsRejected() throws Exception {
        Signup signup = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(signup.token(), restaurantId, 5, "Tasty");
        String commentId = createComment(signup.token(), reviewId, "do not report me", null);

        mockMvc.perform(delete("/api/reviews/" + reviewId + "/comments/" + commentId)
                        .header("Authorization", "Bearer " + signup.token()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + signup.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"COMMENT","targetId":"%s","reason":"SPAM"}
                                """.formatted(commentId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot report a deleted comment"));
    }
}
