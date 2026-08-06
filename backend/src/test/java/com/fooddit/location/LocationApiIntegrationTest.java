package com.fooddit.location;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LocationApiIntegrationTest extends IntegrationTestBase {

    @Test
    void citiesListsServiceableCities() throws Exception {
        mockMvc.perform(get("/api/cities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.citySlug == 'chennai')].cityName").value("Chennai"))
                .andExpect(jsonPath("$[?(@.citySlug == 'mumbai')].cityName").value("Mumbai"));
    }

    @Test
    void localitiesForServiceableCity() throws Exception {
        mockMvc.perform(get("/api/cities/mumbai/localities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@ == 'Colaba Causeway')]").exists());
    }

    @Test
    void unsupportedCityIs404() throws Exception {
        mockMvc.perform(get("/api/cities/atlantis/localities"))
                .andExpect(status().isNotFound());
    }
}