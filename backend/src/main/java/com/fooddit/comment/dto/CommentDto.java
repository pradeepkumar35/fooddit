package com.fooddit.comment.dto;

import com.fooddit.comment.entity.Comment;
import com.fooddit.user.dto.UserDto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A node in the threaded reply tree. {@code replies} is empty for leaf comments
 * and holds the nested children otherwise. {@code parentCommentId} is null for
 * top-level comments. {@code score} is the net vote count and {@code myVote}
 * the acting user's vote (-1/1, or null when anonymous or they haven't voted).
 */
public record CommentDto(
        UUID id,
        UUID reviewId,
        UUID parentCommentId,
        UserDto author,
        String content,
        Instant createdAt,
        Instant editedAt,
        boolean deleted,
        List<CommentDto> replies,
        int score,
        Integer myVote
) {

    public static CommentDto from(Comment comment) {
        return new CommentDto(
                comment.getId(),
                comment.getReview().getId(),
                comment.getParentComment() != null ? comment.getParentComment().getId() : null,
                UserDto.from(comment.getUser()),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getEditedAt(),
                comment.isDeleted(),
                new ArrayList<>(),
                0,
                null);
    }
}
