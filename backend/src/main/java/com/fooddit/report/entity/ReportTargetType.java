package com.fooddit.report.entity;

/**
 * The kind of content a report targets. The target id itself is polymorphic
 * (a report points at a review OR a comment), so it has no FK constraint,
 * mirroring the existing votes table.
 */
public enum ReportTargetType {
    REVIEW,
    COMMENT
}
