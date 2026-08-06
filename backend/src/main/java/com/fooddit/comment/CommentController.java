package com.fooddit.comment;

import com.fooddit.comment.dto.CommentDto;
import com.fooddit.comment.dto.CreateCommentRequest;
import com.fooddit.comment.dto.UpdateCommentRequest;
import com.fooddit.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reviews/{reviewId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * Returns the comment tree. {@code sort} orders siblings within each
     * nesting level: {@code best} (time-decayed net score), {@code top} (raw
     * score) or {@code new} (chronological); a reply always stays under its
     * parent regardless of sort.
     */
    @GetMapping
    public List<CommentDto> getThread(@PathVariable UUID reviewId,
                                      @RequestParam(defaultValue = "best") String sort,
                                      @AuthenticationPrincipal Object principal) {
        return commentService.getThread(reviewId, CurrentUser.orNull(principal), sort);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto create(@PathVariable UUID reviewId,
                             @Valid @RequestBody CreateCommentRequest request,
                             @AuthenticationPrincipal UUID currentUserId) {
        return commentService.create(reviewId, currentUserId, request);
    }

    @PatchMapping("/{commentId}")
    public CommentDto update(@PathVariable UUID reviewId,
                             @PathVariable UUID commentId,
                             @Valid @RequestBody UpdateCommentRequest request,
                             @AuthenticationPrincipal UUID currentUserId) {
        return commentService.update(commentId, currentUserId, request);
    }
}
