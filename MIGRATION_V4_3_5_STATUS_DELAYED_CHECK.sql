-- Run this diagnostic first in Supabase SQL Editor. It does not change data.
-- A PostgreSQL CHECK constraint or ENUM may reject the new Delayed status.
SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'tasks' AND c.contype = 'c';

SELECT a.attname, format_type(a.atttypid,a.atttypmod) AS column_type
FROM pg_attribute a
WHERE a.attrelid = 'public.tasks'::regclass
  AND a.attname = 'status' AND a.attnum > 0;

-- If status is TEXT with a CHECK constraint, review its exact name and
-- definition before replacing it to allow 'Delayed'. Do not drop unrelated
-- constraints. If status is an ENUM, ALTER TYPE ... ADD VALUE IF NOT EXISTS
-- must target the exact type returned by the diagnostic.
