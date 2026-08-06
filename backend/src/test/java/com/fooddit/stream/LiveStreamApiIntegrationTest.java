package com.fooddit.stream;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end realtime test against a real HTTP server on a random port: opens
 * an SSE connection to a restaurant's stream, then drives comments/votes through
 * the REST API and asserts the events arrive on the wire.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class LiveStreamApiIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private ObjectMapper objectMapper;

    @LocalServerPort
    private int port;

    private record Token(String value) {
    }

    private Token signup(String email) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> res = rest.exchange("/api/auth/signup", HttpMethod.POST,
                new HttpEntity<>("{\"name\":\"Test User\",\"email\":\"%s\",\"password\":\"password123\"}".formatted(email),
                        headers),
                String.class);
        assertThat(res.getStatusCode().is2xxSuccessful())
                .as("signup response: %s %s", res.getStatusCode(), res.getBody())
                .isTrue();
        return new Token(read(res).get("token").asText());
    }

    private JsonNode read(ResponseEntity<String> res) {
        try {
            return objectMapper.readTree(res.getBody());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String firstRestaurantId() {
        ResponseEntity<String> res = rest.getForEntity("/api/restaurants?city=mumbai", String.class);
        return read(res).get(0).get("id").asText();
    }

    private String createReview(Token token, String restaurantId, String content) {
        HttpHeaders headers = headers(token);
        ResponseEntity<String> res = rest.exchange("/api/restaurants/" + restaurantId + "/reviews", HttpMethod.POST,
                new HttpEntity<>("{\"rating\":5,\"content\":\"%s\"}".formatted(content), headers), String.class);
        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        return read(res).get("id").asText();
    }

    private void createComment(Token token, String reviewId, String content) {
        HttpHeaders headers = headers(token);
        ResponseEntity<String> res = rest.exchange("/api/reviews/" + reviewId + "/comments", HttpMethod.POST,
                new HttpEntity<>("{\"content\":\"%s\"}".formatted(content), headers), String.class);
        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
    }

    private void castVote(Token token, String reviewId) {
        HttpHeaders headers = headers(token);
        ResponseEntity<String> res = rest.exchange("/api/votes", HttpMethod.POST,
                new HttpEntity<>("{\"votableType\":\"REVIEW\",\"votableId\":\"%s\",\"voteValue\":1}".formatted(reviewId),
                        headers),
                String.class);
        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
    }

    private HttpHeaders headers(Token token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token.value());
        return headers;
    }

    private BufferedReader openStream(String restaurantId) throws Exception {
        URL url = new URL("http://localhost:" + port + "/api/stream/restaurants/" + restaurantId);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Accept", "text/event-stream");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(10_000);
        assertThat(conn.getResponseCode()).isEqualTo(200);
        assertThat(conn.getContentType()).contains("text/event-stream");
        return new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
    }

    /**
     * Reads SSE frames until a {@code data:} payload containing {@code marker}
     * arrives (ignoring heartbeat comment lines), or fails on timeout.
     */
    private String awaitData(BufferedReader reader, String marker) throws Exception {
        StringBuilder frame = new StringBuilder();
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            String line = reader.readLine();
            if (line == null) {
                throw new AssertionError("Stream closed before event containing " + marker);
            }
            if (line.startsWith("data:")) {
                frame.append(line.substring(5).trim());
                if (frame.toString().contains(marker)) {
                    return frame.toString();
                }
                frame.setLength(0);
            }
        }
        throw new AssertionError("Timeout waiting for event containing " + marker);
    }

    @Test
    void subscriberReceivesCommentAndVoteEvents() throws Exception {
        Token token = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();
        String reviewId = createReview(token, restaurantId, "Real-time review");

        BufferedReader stream = openStream(restaurantId);

        createComment(token, reviewId, "live comment payload");
        String commentFrame = awaitData(stream, "live comment payload");
        assertThat(commentFrame).contains("live comment payload");

        castVote(token, reviewId);
        String voteFrame = awaitData(stream, reviewId);
        assertThat(voteFrame).contains("\"score\":1");

        stream.close();
    }

    @Test
    void eventForAnotherRestaurantIsNotDelivered() throws Exception {
        Token token = signup(uniqueEmail());
        String first = firstRestaurantId();
        ResponseEntity<String> restaurants = rest.getForEntity("/api/restaurants?city=mumbai", String.class);
        String second = read(restaurants).get(1).get("id").asText();
        String secondReview = createReview(token, second, "Other restaurant review");

        BufferedReader stream = openStream(first);
        createComment(token, secondReview, "should not leak");

        // The subscribed connection must NOT receive the other restaurant's event:
        // read until the socket times out (no event arrived) rather than hanging.
        boolean leaked = false;
        try {
            long deadline = System.currentTimeMillis() + 1500;
            while (System.currentTimeMillis() < deadline) {
                String line = stream.readLine();
                if (line == null) {
                    break;
                }
                if (line.contains("comment.created") || line.contains("should not leak")) {
                    leaked = true;
                    break;
                }
            }
        } catch (java.net.SocketTimeoutException expected) {
            // No event arrived before the read timeout; this is the expected outcome.
        } finally {
            stream.close();
        }
        assertThat(leaked).isFalse();
    }

    @Test
    void subscriberReceivesReviewCreatedEvent() throws Exception {
        Token token = signup(uniqueEmail());
        String restaurantId = firstRestaurantId();

        BufferedReader stream = openStream(restaurantId);

        String reviewId = createReview(token, restaurantId, "brand new live review");
        String frame = awaitData(stream, reviewId);
        assertThat(frame).contains(reviewId);
        assertThat(frame).contains("\"rating\":5");
        assertThat(frame).contains("\"content\":\"brand new live review\"");

        stream.close();
    }

    private static String uniqueEmail() {
        return "stream-" + UUID.randomUUID() + "@example.com";
    }
}