-- V3: soft delete for comments.
--
-- A deleted comment keeps its row (it may have replies hanging off it), so the
-- reply tree stays intact; the UI renders "[deleted]" instead of content/author.
-- content is retained on the row for audit but is never returned as visible text.

ALTER TABLE comments ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN deleted_at   TIMESTAMP WITH TIME ZONE;
