package com.fooddit.vote.repository;

import com.fooddit.vote.entity.VotableType;
import com.fooddit.vote.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, UUID> {

    Optional<Vote> findByUserIdAndVotableTypeAndVotableId(UUID userId, VotableType votableType, UUID votableId);

    @Query("select coalesce(sum(v.voteValue), 0) from Vote v where v.votableType = :type and v.votableId = :votableId")
    int scoreByVotable(@Param("type") VotableType type, @Param("votableId") UUID votableId);

    /**
     * Net score for every votable id in the given set, as [votableId, score]
     * rows. Used to enrich a batch of reviews/comments in a single query.
     */
    @Query("""
            select v.votableId, coalesce(sum(v.voteValue), 0)
            from Vote v
            where v.votableType = :type and v.votableId in :votableIds
            group by v.votableId
            """)
    List<Object[]> scoresByVotableIds(@Param("type") VotableType type, @Param("votableIds") Collection<UUID> votableIds);

    @Query("""
            select v from Vote v
            where v.user.id = :userId and v.votableType = :type and v.votableId in :votableIds
            """)
    List<Vote> findByUserAndVotableTypeAndVotableIdIn(@Param("userId") UUID userId,
                                                      @Param("type") VotableType type,
                                                      @Param("votableIds") Collection<UUID> votableIds);

    /**
     * Vote count cast since {@code since} per review id — feeds the Ledger's
     * "votes this month" delta (aggregated to restaurants by the caller).
     */
    @Query("""
            select v.votableId as votableId, count(v) as cnt
            from Vote v
            where v.votableType = 'REVIEW' and v.votableId in :reviewIds and v.createdAt >= :since
            group by v.votableId
            """)
    List<RecentCount> countRecentByReviewIds(@Param("reviewIds") Collection<UUID> reviewIds,
                                             @Param("since") Instant since);

    interface RecentCount {
        UUID getVotableId();

        long getCnt();
    }
}
