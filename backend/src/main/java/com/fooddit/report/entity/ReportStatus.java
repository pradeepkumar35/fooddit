package com.fooddit.report.entity;

/**
 * Lifecycle of a report. Every new report starts as PENDING; moderation
 * triage (REVIEWED/DISMISSED) is future work but the column exists now.
 */
public enum ReportStatus {
    PENDING,
    REVIEWED,
    DISMISSED
}
