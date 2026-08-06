package com.fooddit.comment;

import com.fooddit.comment.dto.CommentDto;
import com.fooddit.comment.entity.Comment;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Builds a Reddit-style reply tree from a flat list of comments.
 *
 * <p>The comments for a review are fetched as a flat list (ordered by creation
 * time) and nested here in memory: each comment is indexed by id, then attached
 * to its parent's {@code replies}; comments without a known parent become roots.
 * No recursive SQL is involved.
 */
public final class CommentThreadAssembler {

    private CommentThreadAssembler() {
    }

    public static List<CommentDto> buildTree(List<Comment> flatComments) {
        Map<UUID, CommentDto> byId = new LinkedHashMap<>();
        for (Comment comment : flatComments) {
            byId.put(comment.getId(), CommentDto.from(comment));
        }

        List<CommentDto> roots = new ArrayList<>();
        for (Comment comment : flatComments) {
            CommentDto dto = byId.get(comment.getId());
            Comment parent = comment.getParentComment();
            if (parent != null && byId.containsKey(parent.getId())) {
                // children attach to their parent in creation order
                byId.get(parent.getId()).replies().add(dto);
            } else {
                roots.add(dto);
            }
        }
        return roots;
    }
}
