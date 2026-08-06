package com.fooddit.stream;

import com.fooddit.vote.entity.VotableType;

import java.util.UUID;

/**
 * Fired whenever a vote changes a review or comment score. Carries the new net
 * score; clients update the visible tally without waiting for a page reload.
 */
public record VoteUpdatedEvent(VotableType votableType, UUID votableId, int score) {
}