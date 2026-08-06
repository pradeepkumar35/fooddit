-- V2: real-dataset columns + user addresses.
--
-- Import source columns (restaurants.parquet): restaurant_id, name, area,
-- locality, city_name, city_slug, latitude, longitude, cuisines (pipe-delimited),
-- avg_rating, total_ratings, cost_for_two, delivery_time_mins, is_veg, is_open,
-- menu_category_count, menu_item_count.
--
-- Notes:
--   * The existing display "city" column is renamed to "city_name" (matches the
--     source). city_slug is the value discovery queries filter on.
--   * cuisines is normalized into a join table (portable DDL across H2/Postgres;
--     enables cuisine filtering). Source is a "A|B|C" pipe-delimited string.
--   * latitude/longitude are NUMERIC to avoid float precision drift (distance
--     sorting later).
--   * is_veg/is_open are BOOLEAN; the import normalizes "True"/"" string values.

-- 1) Restaurant location + dataset columns
ALTER TABLE restaurants RENAME COLUMN city TO city_name;

ALTER TABLE restaurants ADD COLUMN external_id        VARCHAR(20);
ALTER TABLE restaurants ADD COLUMN area               VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN locality           VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN city_slug          VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN latitude           NUMERIC(9, 6);
ALTER TABLE restaurants ADD COLUMN longitude          NUMERIC(9, 6);
ALTER TABLE restaurants ADD COLUMN total_ratings      INTEGER;
ALTER TABLE restaurants ADD COLUMN cost_for_two       INTEGER;
ALTER TABLE restaurants ADD COLUMN delivery_time_mins INTEGER;
ALTER TABLE restaurants ADD COLUMN is_veg             BOOLEAN;
ALTER TABLE restaurants ADD COLUMN is_open            BOOLEAN;
ALTER TABLE restaurants ADD COLUMN menu_category_count INTEGER;
ALTER TABLE restaurants ADD COLUMN menu_item_count     INTEGER;

-- Upsert key for the import script + discovery indexes
CREATE UNIQUE INDEX uk_restaurants_external_id ON restaurants (external_id);
CREATE INDEX idx_restaurants_city_slug   ON restaurants (city_slug);
CREATE INDEX idx_restaurants_locality    ON restaurants (locality);

-- 2) Cuisines (normalized)
CREATE TABLE restaurant_cuisines (
    restaurant_id UUID NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
    cuisine       VARCHAR(100) NOT NULL,
    PRIMARY KEY (restaurant_id, cuisine)
);

CREATE INDEX idx_restaurant_cuisines_cuisine ON restaurant_cuisines (cuisine);

-- 3) User addresses (Swiggy/Zomato-style saved locations)
CREATE TABLE user_addresses (
    id           UUID PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users (id),
    label        VARCHAR(50),
    address_line VARCHAR(255) NOT NULL,
    locality     VARCHAR(255),
    city_name    VARCHAR(255) NOT NULL,
    city_slug    VARCHAR(255) NOT NULL,
    latitude     NUMERIC(9, 6),
    longitude    NUMERIC(9, 6),
    is_default   BOOLEAN NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_user_addresses_user ON user_addresses (user_id);
