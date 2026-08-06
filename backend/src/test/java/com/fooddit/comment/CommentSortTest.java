package com.fooddit.comment;

import com.fooddit.comment.entity.Comment;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.review.entity.Review;
import com.fooddit.user.entity.User;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CommentSortTest {

    private UUID id(int n) {
        return UUID.nameUUIDFromBytes(String.valueOf(n).getBytes(StandardCharsets.UTF_8));
    }

    private Comment comment(int n, Instant createdAt) {
        User u = new User("Tester", "c" + n + "@example.com", "hash");
        u.setId(id(300 + n));
        Restaurant r = new Restaurant("R", "addr", "cuisine", "$$", "Mumbai");
        r.setId(id(800));
        Review rv = new Review(u, r, 5, "great");
        rv.setId(id(700));
        Comment c = new Comment(rv, u, null, "comment " + n);
        c.setId(id(n));
        c.setCreatedAt(createdAt);
        return c;
    }

    @Test
    void sortsNewestFirstForNewSort() {
        Instant now = Instant.now();
        Comment older = comment(1, now.minusSeconds(100));
        Comment newer = comment(2, now);

        List<Comment> ordered = CommentSort.order(List.of(older, newer), Map.of(), "new");

        assertEquals(List.of(newer.getId(), older.getId()),
                ordered.stream().map(Comment::getId).toList());
    }

    @Test
    void sortsByScoreThenNewestForTopSort() {
        Instant now = Instant.now();
        Comment highScore = comment(1, now.minusSeconds(50));
        Comment lowScoreNew = comment(2, now);
        Comment lowScoreOld = comment(3, now.minusSeconds(200));

        Map<UUID, Integer> scores = Map.of(
                highScore.getId(), 5,
                lowScoreNew.getId(), 1,
                lowScoreOld.getId(), 1);

        List<Comment> ordered = CommentSort.order(
                List.of(lowScoreOld, lowScoreNew, highScore), scores, "top");

        assertEquals(List.of(highScore.getId(), lowScoreNew.getId(), lowScoreOld.getId()),
                ordered.stream().map(Comment::getId).toList());
    }

    @Test
    void nullAndUnknownSortFallBackToBest() {
        Instant now = Instant.now();
        Comment recent = comment(1, now);
        Comment old = comment(2, now.minusSeconds(48 * 3600));

        // Both have score 0; the recent one wins the best ranking (time decay).
        List<Comment> ordered = CommentSort.order(List.of(old, recent), Map.of(), null);

        assertEquals(recent.getId(), ordered.get(0).getId());
    }
}