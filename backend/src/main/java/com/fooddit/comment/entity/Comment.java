package com.fooddit.comment.entity;

import com.fooddit.review.entity.Review;
import com.fooddit.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A comment belongs to a review and may optionally reply to another comment on
 * the same review. A null {@code parentComment} marks a top-level comment; a
 * non-null one makes it a nested reply. This self-reference is what enables
 * Reddit-style threading.
 */
@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false)
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private Comment parentComment;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Null until the comment is edited; set on PATCH. Non-null is how the UI
     * decides whether to render an "(edited)" label.
     */
    @Column(name = "edited_at")
    private Instant editedAt;

    public Comment(Review review, User user, Comment parentComment, String content) {
        this.review = review;
        this.user = user;
        this.parentComment = parentComment;
        this.content = content;
    }
}
