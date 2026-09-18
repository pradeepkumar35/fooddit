-- V5: restaurant coordinate provenance.
--
-- The imported dataset only carried one coordinate pair per city, so every
-- restaurant in a city shared a single point (useless for a real map). The
-- resolution pipeline writes per-restaurant coordinates and records HOW each
-- one was derived, so approximate rows stay identifiable and upgradeable —
-- the same provenance idea as image_source:
--
--   OSM      - matched a real OpenStreetMap food POI by name (street-accurate)
--   LOCALITY - GeoNames centroid of the restaurant's locality (neighbourhood)
--   CITY     - the original per-city point (last resort)
--
-- locality_coords caches the second tier so re-runs and future upgrades don't
-- need the GeoNames dump again. Portable DDL (H2 PostgreSQL-mode + Postgres).

ALTER TABLE restaurants ADD COLUMN coords_source VARCHAR(20) NOT NULL DEFAULT 'CITY'
    CONSTRAINT chk_restaurants_coords_source
    CHECK (coords_source IN ('OSM', 'LOCALITY', 'CITY'));

ALTER TABLE restaurants ADD COLUMN coords_matched_name VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN coords_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_restaurants_coords_source ON restaurants (coords_source);

CREATE TABLE locality_coords (
    city_slug  VARCHAR(255) NOT NULL,
    locality   VARCHAR(255) NOT NULL,
    latitude   NUMERIC(9, 6) NOT NULL,
    longitude  NUMERIC(9, 6) NOT NULL,
    source     VARCHAR(20) NOT NULL CHECK (source IN ('GEONAMES', 'CENTROID')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (city_slug, locality)
);
