package com.fooddit.restaurant;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The filtered feed: the price filter was removed and replaced by city and
 * minimum-rating filters (e.g. rating=4 means 4+ stars). Restaurants now carry
 * a city (Chennai/Mumbai/Delhi) from the seed data.
 */
class RestaurantFilterIntegrationTest extends IntegrationTestBase {

    @Test
    void listExposesCity() throws Exception {
        mockMvc.perform(get("/api/restaurants").param("city", "mumbai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cityName").isNotEmpty());
    }

    @Test
    void cityIsRequired() throws Exception {
        mockMvc.perform(get("/api/restaurants"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cityFilterNarrowsResults() throws Exception {
        mockMvc.perform(get("/api/restaurants?city=chennai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6));
    }

    @Test
    void localityFilterNarrowsWithinCity() throws Exception {
        mockMvc.perform(get("/api/restaurants").param("city", "mumbai").param("locality", "Colaba"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].locality").value(org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.containsStringIgnoringCase("Colaba"))))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void ratingFilterIsAMinimumThreshold() throws Exception {
        mockMvc.perform(get("/api/restaurants?city=mumbai&rating=4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].avgRating").value(org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.greaterThanOrEqualTo(4.0))));
    }

    @Test
    void cityAndCuisineCombine() throws Exception {
        mockMvc.perform(get("/api/restaurants")
                        .param("city", "mumbai")
                        .param("cuisine", "South Indian"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Dosa Dynasty"));
    }

    @Test
    void unknownCityReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/restaurants?city=atlantis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void cuisinesEndpointListsDistinctCuisines() throws Exception {
        mockMvc.perform(get("/api/restaurants/cuisines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@ == 'South Indian')]").exists());
    }

    @Test
    void suggestionsAreScopedToCityAndMatchByName() throws Exception {
        mockMvc.perform(get("/api/restaurants/suggestions")
                        .param("city", "mumbai")
                        .param("q", "dosa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Dosa Dynasty"))
                .andExpect(jsonPath("$[0].locality").isNotEmpty())
                .andExpect(jsonPath("$[0].id").exists());
    }

    @Test
    void suggestionsReturnNothingForBlankQueryOrWrongCity() throws Exception {
        mockMvc.perform(get("/api/restaurants/suggestions")
                        .param("city", "mumbai")
                        .param("q", "  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/restaurants/suggestions")
                        .param("city", "mumbai")
                        .param("q", "biryani-nowhere"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
