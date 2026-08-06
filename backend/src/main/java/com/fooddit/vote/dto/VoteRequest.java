package com.fooddit.vote.dto;

import com.fooddit.vote.entity.VotableType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record VoteRequest(
        @NotNull(message = "votableType is required")
        VotableType votableType,

        @NotNull(message = "votableId is required")
        UUID votableId,

        // -1 (downvote) or 1 (upvote); validated further in the service
        @NotNull(message = "voteValue is required")
        Integer voteValue
) {
}
