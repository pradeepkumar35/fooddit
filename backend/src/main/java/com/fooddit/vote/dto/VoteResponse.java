package com.fooddit.vote.dto;

import com.fooddit.vote.entity.VotableType;

import java.util.UUID;

/**
 * Result of casting a vote: the new aggregate score for the votable and the
 * acting user's vote after the operation (null when they toggled it off).
 */
public record VoteResponse(
        VotableType votableType,
        UUID votableId,
        int score,
        Integer myVote
) {
}
