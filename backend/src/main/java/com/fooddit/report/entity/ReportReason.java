package com.fooddit.report.entity;

/**
 * Fixed set of report reasons offered by the UI. Storing an enum keeps the
 * data clean for a future moderation dashboard.
 */
public enum ReportReason {
    SPAM,
    FAKE_REVIEW,
    HARASSMENT,
    OFF_TOPIC
}
