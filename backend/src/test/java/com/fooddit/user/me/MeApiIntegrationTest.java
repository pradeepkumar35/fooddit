package com.fooddit.user.me;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/me endpoints: reading the acting user's details and preferences, changing
 * the display name, and partial preference updates with validation.
 */
class MeApiIntegrationTest extends IntegrationTestBase {

    @Test
    void getReturnsAccountWithDefaultPreferences() throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.userId()))
                .andExpect(jsonPath("$.email").value(user.email()))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.displayMode").value("SYSTEM"))
                .andExpect(jsonPath("$.notifyOnReviewReply").value(true))
                .andExpect(jsonPath("$.notifyOnCommentReply").value(true));
    }

    @Test
    void updateNameChangesDisplayName() throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(patch("/api/me")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Foodie\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Foodie"));

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Foodie"));
    }

    @Test
    void blankNameIsRejected() throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(patch("/api/me")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePreferencesIsPartial() throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(patch("/api/me/preferences")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayMode\":\"DARK\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayMode").value("DARK"))
                .andExpect(jsonPath("$.notifyOnCommentReply").value(true));
    }

    @Test
    void invalidDisplayModeIsRejected() throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(patch("/api/me/preferences")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayMode\":\"SEPIA\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anonymousMeIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }
}
