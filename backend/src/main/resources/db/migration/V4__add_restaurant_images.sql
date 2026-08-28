-- V4: Restaurant imagery with provenance tracking.
--
-- Each restaurant ends up with an image via a resolution chain, and
-- image_source records HOW it was resolved so placeholders can be upgraded
-- later:
--   DIRECT             - the restaurant's own sourced image
--   BRANCH_FALLBACK    - same-name chain, image borrowed from another branch
--   CUISINE_PLACEHOLDER- curated per-cuisine placeholder asset
--   NONE               - generic fallback (cuisine didn't match any category)
--
-- image_url holds either an external CDN link (DIRECT/BRANCH_FALLBACK) or a
-- self-hosted /images/cuisine/*.svg path (placeholders). Portable DDL
-- (works on H2 PostgreSQL-mode and real Postgres).

ALTER TABLE restaurants ADD COLUMN image_url TEXT;

ALTER TABLE restaurants ADD COLUMN image_source VARCHAR(20) NOT NULL DEFAULT 'NONE'
    CONSTRAINT chk_restaurants_image_source
    CHECK (image_source IN ('DIRECT', 'BRANCH_FALLBACK', 'CUISINE_PLACEHOLDER', 'NONE'));

-- Supports "find me everything still on a placeholder" upgrade queries.
CREATE INDEX idx_restaurants_image_source ON restaurants (image_source);
