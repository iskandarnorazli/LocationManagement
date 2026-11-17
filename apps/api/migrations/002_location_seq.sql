-- D22: preserve insertion order when multiple rows share created_at.
ALTER TABLE locations ADD COLUMN seq bigint GENERATED ALWAYS AS IDENTITY;
