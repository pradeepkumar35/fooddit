package com.fooddit.notification.entity;

/**
 * The kind of activity that produced a notification.
 * <ul>
 *   <li>{@code REVIEW_REPLY} — someone commented on the recipient's review.</li>
 *   <li>{@code COMMENT_REPLY} — someone replied directly to the recipient's comment.</li>
 *   <li>{@code THREAD_REPLY} — someone commented in a discussion thread the
 *       recipient is participating in (they authored the review or a comment in
 *       the thread, but are not the direct parent or review author of the new
 *       comment).</li>
 * </ul>
 * Self-activity is never notified.
 */
public enum NotificationType {
    REVIEW_REPLY,
    COMMENT_REPLY,
    THREAD_REPLY
}
