package com.fooddit.restaurant;

import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The City Ledger contract: server-side pagination envelope (the client never
 * slices), per-row discussion aggregates, city-wide standing ranks independent
 * of filters/sort, the dossier stats payload, and batched reputation sums.
 */
class LedgerIntegrationTest extends IntegrationTestBase {

    private String getLedger(String params) throws Exception {
        return mockMvc.perform(get("/api/restaurants/ledger?" + params))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
    }

    @Test
    void ledgerRequiresCity() throws Exception {
        mockMvc.perform(get("/api/restaurants/ledger"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returnsPaginatedEnvelopeWithEnrichedRows() throws Exception {
        String body = getLedger("city=mumbai&size=2&page=0");

        assertThat(objectMapper.readTree(body).get("content").size()).isEqualTo(2);
        assertThat(objectMapper.readTree(body).get("page").asInt()).isZero();
        assertThat(objectMapper.readTree(body).get("size").asInt()).isEqualTo(2);
        assertThat(objectMapper.readTree(body).get("totalElements").asInt()).isGreaterThanOrEqualTo(3);
        assertThat(objectMapper.readTree(body).get("totalPages").asInt()).isGreaterThanOrEqualTo(2);

        var row = objectMapper.readTree(body).get("content").get(0);
        assertThat(row.get("rank").asInt()).isPositive();
        assertThat(row.get("tier").asText()).isIn("ELITE", "GREAT", "SOLID");
        assertThat(row.get("commentCount").asLong()).isGreaterThanOrEqualTo(0);
        assertThat(row.get("monthlyVotes").asLong()).isGreaterThanOrEqualTo(0);
        assertThat(row.has("lastActivityAt")).isTrue();
    }

    @Test
    void paginationWalksDistinctRowsServerSide() throws Exception {
        int size = 1;
        Set<String> seen = new HashSet<>();
        long totalElements = 0;
        int totalPages;

        for (int page = 0; page < 10; page++) {
            var node = objectMapper.readTree(getLedger("city=mumbai&size=" + size + "&page=" + page));
            if (page == 0) {
                totalElements = node.get("totalElements").asLong();
                totalPages = node.get("totalPages").asInt();
                assertThat(totalPages).isEqualTo((int) Math.ceil(totalElements / (double) size));
            }
            var content = node.get("content");
            for (var row : content) {
                String id = row.get("id").asText();
                assertThat(seen.contains(id)).as("row %s repeated across pages", id).isFalse();
                seen.add(id);
            }
            if (node.get("content").isEmpty()) break;
            if (seen.size() >= totalElements) break;
        }
        assertThat(seen.size()).isEqualTo((int) totalElements);
    }

    @Test
    void mostDiscussedIsDefaultSortAndDiscussionFloatsToTop() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup commenter = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        String reviewId = createReview(author.token(), restaurantId, 5, "Ledger default-sort probe.");
        createComment(commenter.token(), reviewId, "This place should lead the ledger now.", null);

        var content = objectMapper.readTree(getLedger("city=mumbai")).get("content");
        assertThat(content.get(0).get("id").asText()).isEqualTo(restaurantId);
        // Rank is standing-by-rating, not browse order: it stays bounded while
        // this row also happens to carry the thread.
        int rank = content.get(0).get("rank").asInt();
        assertThat(rank).isBetween(1, content.size());

        // The expanded-row preview surfaces the newest review verbatim.
        assertThat(content.get(0).get("latestReview").get("content").asText())
                .contains("Ledger default-sort probe.");
        assertThat(content.get(0).get("commentCount").asLong()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void statsEndpointExposesRankDistributionAndProvenance() throws Exception {
        Signup criticA = signup(uniqueEmail());
        Signup criticB = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        createReview(criticA.token(), restaurantId, 5, "Stats probe five.");
        createReview(criticB.token(), restaurantId, 4, "Stats probe four.");

        var stats = mockMvc.perform(get("/api/restaurants/" + restaurantId + "/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rank").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.tier").exists())
                .andExpect(jsonPath("$.firstReviewedAt").exists())
                .andReturn().getResponse().getContentAsString();

        var dist = objectMapper.readTree(stats).get("distribution");
        assertThat(dist.get("5").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(dist.get("4").asLong()).isGreaterThanOrEqualTo(1);

        long histogramSum = 0;
        for (var key : List.of("1", "2", "3", "4", "5")) {
            if (dist.has(key)) histogramSum += dist.get(key).asLong();
        }
        assertThat(histogramSum).isGreaterThanOrEqualTo(2);
    }

    @Test
    void reputationsSumNetUpvotesAcrossReviewsAndComments() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup voter = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        String reviewId = createReview(author.token(), restaurantId, 4, "Reputation probe.");
        String commentId = createComment(author.token(), reviewId, "Author replies too.", null);

        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"votableType\":\"REVIEW\",\"votableId\":\"" + reviewId + "\",\"voteValue\":1}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"votableType\":\"COMMENT\",\"votableId\":\"" + commentId + "\",\"voteValue\":1}"))
                .andExpect(status().isOk());

        var rep = objectMapper.readTree(mockMvc
                .perform(get("/api/users/reputations").param("ids", author.userId()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(rep.get(author.userId()).asLong()).isEqualTo(2);
    }

    @Test
    void monthlyVoteDeltaCountsTrailingWindowVotes() throws Exception {
        Signup author = signup(uniqueEmail());
        Signup voter = signup(uniqueEmail());
        String restaurantId = restaurantId(1);

        String reviewId = createReview(author.token(), restaurantId, 4, "Delta probe.");
        mockMvc.perform(post("/api/votes")
                        .header("Authorization", "Bearer " + voter.token())
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"votableType\":\"REVIEW\",\"votableId\":\"" + reviewId + "\",\"voteValue\":1}"))
                .andExpect(status().isOk());

        var content = objectMapper.readTree(getLedger("city=mumbai&sort=new")).get("content");
        com.fasterxml.jackson.databind.JsonNode matched = null;
        for (var row : content) {
            if (row.get("id").asText().equals(restaurantId)) matched = row;
        }
        assertThat(matched).isNotNull();
        assertThat(matched.get("monthlyVotes").asLong()).isGreaterThanOrEqualTo(1);
    }
}