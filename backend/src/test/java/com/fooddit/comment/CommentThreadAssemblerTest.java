package com.fooddit.comment;

import com.fooddit.comment.dto.CommentDto;
import com.fooddit.comment.entity.Comment;
import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.review.entity.Review;
import com.fooddit.user.entity.User;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CommentThreadAssemblerTest {

    private UUID id(int n) {
        return UUID.nameUUIDFromBytes(String.valueOf(n).getBytes(StandardCharsets.UTF_8));
    }

    private User user(int n) {
        User u = new User("Tester", "test" + n + "@example.com", "hash");
        u.setId(id(1000 + n));
        return u;
    }

    private Review review() {
        Restaurant r = new Restaurant("Restaurant", "1 Main St", "Italian", "$$", "Chennai");
        r.setId(id(998));
        Review rv = new Review(user(1), r, 5, "great");
        rv.setId(id(997));
        return rv;
    }

    private Comment comment(int n, Comment parent, Review review) {
        Comment c = new Comment(review, user(n), parent, "comment " + n);
        c.setId(id(n));
        return c;
    }

    @Test
    void buildsNestedTreePreservingCreationOrder() {
        Review review = review();
        Comment root1 = comment(1, null, review);
        Comment child = comment(2, root1, review);
        Comment grandchild = comment(3, child, review);
        Comment root2 = comment(4, null, review);

        List<Comment> flat = List.of(root1, child, grandchild, root2);
        List<CommentDto> tree = CommentThreadAssembler.buildTree(flat);

        assertEquals(2, tree.size(), "expected two roots");

        CommentDto firstRoot = tree.get(0);
        assertEquals(root1.getId(), firstRoot.id());
        assertNull(firstRoot.parentCommentId(), "root has no parent");

        assertEquals(1, firstRoot.replies().size());
        CommentDto firstChild = firstRoot.replies().get(0);
        assertEquals(child.getId(), firstChild.id());
        assertEquals(root1.getId(), firstChild.parentCommentId());

        assertEquals(1, firstChild.replies().size());
        assertEquals(grandchild.getId(), firstChild.replies().get(0).id());
        assertEquals(child.getId(), firstChild.replies().get(0).parentCommentId());

        CommentDto secondRoot = tree.get(1);
        assertEquals(root2.getId(), secondRoot.id());
        assertTrue(secondRoot.replies().isEmpty(), "second root has no replies");
    }

    @Test
    void childrenAttachInCreationOrder() {
        Review review = review();
        Comment root = comment(1, null, review);
        Comment replyA = comment(2, root, review);
        Comment replyB = comment(3, root, review);

        List<CommentDto> tree = CommentThreadAssembler.buildTree(List.of(root, replyA, replyB));

        assertEquals(List.of(replyA.getId(), replyB.getId()),
                tree.get(0).replies().stream().map(CommentDto::id).toList());
    }

    @Test
    void handlesOrphanedParentReferenceGracefully() {
        Review review = review();
        Comment parent = comment(1, null, review); // in the list
        Comment orphanedParent = comment(2, null, review);
        Comment childWithMissingParent = comment(3, orphanedParent, review);

        List<Comment> flat = List.of(parent, childWithMissingParent);
        List<CommentDto> tree = CommentThreadAssembler.buildTree(flat);

        // the child whose parent is not in the list surfaces as a root
        assertEquals(2, tree.size());
        assertEquals(childWithMissingParent.getId(), tree.get(1).id());
    }

    @Test
    void emptyListProducesEmptyTree() {
        assertTrue(CommentThreadAssembler.buildTree(List.of()).isEmpty());
    }
}
