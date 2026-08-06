package com.fooddit.vote.entity;

import com.fooddit.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A vote is attached to a review OR a comment via the polymorphic
 * (votableType, votableId) pair. votableId has no FK constraint because it
 * points at two different tables. One user can vote on a given votable at most
 * once (enforced by the unique constraint).
 */
@Entity
@Table(
        name = "votes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_vote_user_votable",
                columnNames = {"user_id", "votable_type", "votable_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "votable_type", nullable = false, length = 16)
    private VotableType votableType;

    @Column(name = "votable_id", nullable = false)
    private UUID votableId;

    @Column(name = "vote_value", nullable = false)
    private Integer voteValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Vote(User user, VotableType votableType, UUID votableId, Integer voteValue) {
        this.user = user;
        this.votableType = votableType;
        this.votableId = votableId;
        this.voteValue = voteValue;
    }
}
