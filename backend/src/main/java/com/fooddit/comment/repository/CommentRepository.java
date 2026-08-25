package com.fooddit.comment.repository;

import com.fooddit.comment.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    /**
     * Returns all comments for a review as a flat list ordered by creation
     * time. The service layer builds the reply tree from this list in memory.
     * Author and parent are fetched eagerly to avoid N+1 lazy loads.
     */
    @Query("""
            select c from Comment c
            left join fetch c.parentComment
            left join fetch c.user
            where c.review.id = :reviewId
            order by c.createdAt asc
            """)
    List<Comment> findByReviewIdOrderByCreatedAtAsc(@Param("reviewId") UUID reviewId);

    List<Comment> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * The distinct users who have commented on a review (at any nesting depth),
     * used to notify the rest of a discussion thread about new activity. A
     * scalar projection, so only the ids are loaded — the service resolves the
     * ones it actually needs in a single batched query.
     */
    @Query("select distinct c.user.id from Comment c where c.review.id = :reviewId")
    List<UUID> findDistinctUserIdsByReviewId(@Param("reviewId") UUID reviewId);

    /**
     * All of a user's comments with the review and restaurant eagerly fetched,
     * so profile rendering avoids N+1 lazy loads.
     */
    @Query("""
            select c from Comment c
            join fetch c.review r
            join fetch r.restaurant
            join fetch c.user
            where c.user.id = :userId
            order by c.createdAt desc
            """)
    List<Comment> findByUserIdWithReview(@Param("userId") UUID userId);

    /**
     * Comment count per restaurant, used by the "Most discussed" feed sort.
     */
    @Query("""
            select c.review.restaurant.id as restaurantId, count(c) as count
            from Comment c
            group by c.review.restaurant.id
            """)
    List<RestaurantCommentCount> countGroupedByRestaurant();

    interface RestaurantCommentCount {
        UUID getRestaurantId();

        long getCount();
    }

    /**
     * Latest live comment per restaurant, author fetched eagerly. Ties across
     * restaurants are possible (same max timestamp); callers dedupe by
     * restaurant id keeping the newest.
     */
    @Query("""
            select c from Comment c
            join fetch c.user
            where c.deleted = false
              and c.review.restaurant.id in :ids
              and c.createdAt = (
                  select max(c2.createdAt) from Comment c2
                  where c2.review.restaurant.id = c.review.restaurant.id
                    and c2.deleted = false)
            """)
    List<Comment> findLatestPerRestaurant(@Param("ids") Collection<UUID> ids);

    /** Most recent live comment timestamp per restaurant (discussion pulse). */
    @Query("""
            select c.review.restaurant.id as rid, max(c.createdAt) as latest
            from Comment c
            where c.deleted = false and c.review.restaurant.id in :ids
            group by c.review.restaurant.id
            """)
    List<RestaurantLatestActivity> latestActivityByRestaurantIds(@Param("ids") Collection<UUID> ids);

    interface RestaurantLatestActivity {
        UUID getRid();

        Instant getLatest();
    }

    /** [authorId, commentId] pairs for a set of authors (reputation sums). */
    @Query("""
            select c.user.id as authorId, c.id as commentId
            from Comment c
            where c.user.id in :ids
            """)
    List<Object[]> findAuthorAndIdByAuthorIds(@Param("ids") Collection<UUID> ids);
}
