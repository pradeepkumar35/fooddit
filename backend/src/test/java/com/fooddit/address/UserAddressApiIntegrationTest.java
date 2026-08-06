package com.fooddit.address;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserAddressApiIntegrationTest extends IntegrationTestBase {

    private String token;

    private void signUp() throws Exception {
        token = signup(uniqueEmail()).token();
    }

    private String createAddress(String label, boolean isDefault) throws Exception {
        var result = mockMvc.perform(post("/api/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"label":"%s","addressLine":"42 Indiranagar","locality":"Indiranagar","cityName":"Mumbai","citySlug":"mumbai","isDefault":%s}
                                """.formatted(label, isDefault)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test
    void firstAddressBecomesDefault() throws Exception {
        signUp();
        mockMvc.perform(post("/api/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"label":"Home","addressLine":"42 Indiranagar","cityName":"Mumbai","citySlug":"mumbai"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(true));
    }

    @Test
    void unsupportedCityIsRejected() throws Exception {
        signUp();
        mockMvc.perform(post("/api/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"label":"Home","addressLine":"1 Nowhere St","cityName":"Atlantis","citySlug":"atlantis"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addressesAreScopedToTheOwner() throws Exception {
        signUp();
        String other = signup(uniqueEmail()).token();
        String first = createAddress("Home", true);

        mockMvc.perform(get("/api/me/addresses").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(first));

        mockMvc.perform(get("/api/me/addresses").header("Authorization", "Bearer " + other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/me/addresses/" + first)
                        .header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyOneDefaultAddress() throws Exception {
        signUp();
        String home = createAddress("Home", true);
        String office = createAddress("Office", true);

        mockMvc.perform(get("/api/me/addresses").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(office))
                .andExpect(jsonPath("$[0].isDefault").value(true))
                .andExpect(jsonPath("$[1].id").value(home))
                .andExpect(jsonPath("$[1].isDefault").value(false));
    }

    @Test
    void setDefaultSwitchesAndDeletingDefaultPromotesAnother() throws Exception {
        signUp();
        String home = createAddress("Home", true);
        String office = createAddress("Office", false);

        mockMvc.perform(post("/api/me/addresses/" + home + "/default")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDefault").value(true));

        mockMvc.perform(delete("/api/me/addresses/" + home)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me/addresses").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(office))
                .andExpect(jsonPath("$[0].isDefault").value(true));
    }

    @Test
    void updateMutatesFields() throws Exception {
        signUp();
        String id = createAddress("Home", true);

        mockMvc.perform(patch("/api/me/addresses/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"New Home\",\"locality\":\"Koramangala\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("New Home"))
                .andExpect(jsonPath("$.locality").value("Koramangala"))
                .andExpect(jsonPath("$.addressLine").value("42 Indiranagar"));
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/me/addresses"))
                .andExpect(status().isUnauthorized());
    }
}
