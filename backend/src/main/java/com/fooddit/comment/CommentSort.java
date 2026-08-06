package com.fooddit.comment;

import com.fooddit.comment.entity.Comment;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Orders a thread's flat comment list per the requested sort strategy. Sorting
 * happens on the flat list BEFORE tree assembly, which has a useful property:
 * {@link CommentThreadAssembler} attaches every child to its parent in the
 * order it appears in the flat list, so sorting the flat list orders siblings
 * at every nesting level — the tree stays attached to its parent no matter the
 * sort, satisfying the "sort within each level, not globally" requirement.
 */
public final class CommentSort {

    private static final double GRAVITY = 1.5;

    private CommentSort() {
    }

    public static List<Comment> order(List<Comment> flat, Map<UUID, Integer> scores, String sort) {
        String key = sort == null ? "best" : sort.trim().toLowerCase(Locale.ROOT);
        return switch (key) {
            case "new" -> flat.stream()
                    .sorted(Comparator.comparing(Comment::getCreatedAt, Comparator.reverseOrder()))
                    .toList();
            case "top" -> flat.stream()
                    .sorted(scoreComparator(scores).thenComparing(Comment::getCreatedAt, Comparator.reverseOrder()))
                    .toList();
            default -> { // "best": net score with a time-decay so old comments don't permanently dominate
                Instant now = Instant.now();
                Comparator<Comment> byRank = Comparator
                        .comparingDouble((Comment c) -> rank(c, scores, now))
                        .reversed()
                        .thenComparing(Comment::getCreatedAt, Comparator.reverseOrder());
                yield flat.stream().sorted(byRank).toList();
            }
        };
    }

    private static Comparator<Comment> scoreComparator(Map<UUID, Integer> scores) {
        return Comparator.comparingInt((Comment c) -> scores.getOrDefault(c.getId(), 0)).reversed();
    }

    private static double rank(Comment comment, Map<UUID, Integer> scores, Instant now) {
        double score = scores.getOrDefault(comment.getId(), 0);
        long ageHours = Math.max(0, Duration.between(comment.getCreatedAt(), now).toHours());
        return score / Math.pow(ageHours + 2.0, GRAVITY);
    }
}
