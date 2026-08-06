package com.fooddit.notification;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The reply-notification trigger: a top-level comment notifies the review
 * author (REVIEW_REPLY), a nested reply notifies the parent comment author
 * (COMMENT_REPLY), replying to your own review never notifies yourself, and a
 * target's notification preference is honoured.
 */
class NotificationApiIntegrationTest extends IntegrationTestBase {

    @Test
    void topLevelCommentNotifiesReviewAuthor() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup replier = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 5, "Great food");

        createComment(replier.token(), reviewId, "Glad you liked it", null);

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + reviewer.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.notifications[0].type").value("REVIEW_REPLY"))
                .andExpect(jsonPath("$.notifications[0].read").value(false))
                .andExpect(jsonPath("$.notifications[0].commentId").isNotEmpty())
                .andExpect(jsonPath("$.notifications[0].restaurantName").isNotEmpty());
    }

    @Test
    void nestedReplyNotifiesParentCommentAuthor() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup commenter = signup(uniqueEmail());
        Signup replier = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 4, "Tasty");

        String parentId = createComment(commenter.token(), reviewId, "Which dish?", null);
        createComment(replier.token(), reviewId, "The biryani", parentId);

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + commenter.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.notifications[0].type").value("COMMENT_REPLY"))
                .andExpect(jsonPath("$.notifications[0].actorName").value("Test User"));
    }

    @Test
    void replyingToOwnReviewDoesNotNotifySelf() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 5, "Nice");

        createComment(reviewer.token(), reviewId, "Adding my own note", null);

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + reviewer.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.notifications").isEmpty());
    }

    @Test
    void disabledReviewReplyPreferenceSuppressesNotification() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup replier = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 5, "Good");

        mockMvc.perform(patch("/api/me/preferences")
                        .header("Authorization", "Bearer " + reviewer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notifyOnReviewReply\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyOnReviewReply").value(false));

        createComment(replier.token(), reviewId, "Still no ping", null);

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + reviewer.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void markAllReadClearsUnreadBadge() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup replier = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 5, "Great");

        createComment(replier.token(), reviewId, "One reply", null);
        createComment(replier.token(), reviewId, "Two replies", null);

        mockMvc.perform(post("/api/notifications/read-all")
                        .header("Authorization", "Bearer " + reviewer.token()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + reviewer.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.notifications.length()").value(2))
                .andExpect(jsonPath("$.notifications[0].read").value(true));
    }

    @Test
    void threadParticipantIsNotifiedOncePerNewActivity() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup participant = signup(uniqueEmail());
        Signup replier = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 5, "Great");

        createComment(participant.token(), reviewId, "First word", null);
        createComment(replier.token(), reviewId, "More discussion", null);

        // The participant is not the review author or the direct parent, so they
        // get exactly one THREAD_REPLY (deduplicated, no self-notification).
        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + participant.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.notifications.length()").value(1))
                .andExpect(jsonPath("$.notifications[0].type").value("THREAD_REPLY"))
                .andExpect(jsonPath("$.notifications[0].actorName").value("Test User"));
    }

    @Test
    void participantIsNeverNotifiedOfTheirOwnComments() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup participant = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 5, "Great");

        createComment(participant.token(), reviewId, "Me first", null);
        createComment(participant.token(), reviewId, "Me again", null);

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + participant.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.notifications").isEmpty());
    }

    @Test
    void nestedReplyNotifiesParentAuthorAndReviewer() throws Exception {
        Signup reviewer = signup(uniqueEmail());
        Signup commenter = signup(uniqueEmail());
        Signup replier = signup(uniqueEmail());
        String reviewId = createReview(reviewer.token(), firstRestaurantId(), 4, "Tasty");

        String parentId = createComment(commenter.token(), reviewId, "Which dish?", null);
        createComment(replier.token(), reviewId, "The biryani", parentId);

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + commenter.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.notifications[0].type").value("COMMENT_REPLY"));

        mockMvc.perform(get("/api/me/notifications")
                        .header("Authorization", "Bearer " + reviewer.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2))
                .andExpect(jsonPath("$.notifications[0].type").value("THREAD_REPLY"));
    }
}
