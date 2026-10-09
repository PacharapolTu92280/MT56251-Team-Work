-- MT56251 V3.5.8: add optional time columns, preserving existing tasks.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_time time without time zone,
  ADD COLUMN IF NOT EXISTS end_time time without time zone;

-- If dates and both times are provided on the same day, end must not precede start.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_same_day_time_order;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_same_day_time_order CHECK (
  start_date IS NULL OR due_date IS NULL OR start_date <> due_date
  OR start_time IS NULL OR end_time IS NULL OR end_time >= start_time
);

-- Extend V3.5 history trigger to include the two time fields.
-- Keep the same trigger name and permissions; only replace its function body.
CREATE OR REPLACE FUNCTION public.mt56251_record_task_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  fields text[] := array['title','description','category','status','progress',
    'assigned_to','start_date','due_date','start_time','end_time'];
  field text;
  before_row jsonb := to_jsonb(old);
  after_row jsonb := to_jsonb(new);
  delta jsonb := '{}'::jsonb;
BEGIN
  FOREACH field IN ARRAY fields LOOP
    IF (before_row -> field) IS DISTINCT FROM (after_row -> field) THEN
      delta := delta || jsonb_build_object(field, jsonb_build_object(
        'old', before_row -> field, 'new', after_row -> field));
    END IF;
  END LOOP;
  IF delta <> '{}'::jsonb THEN
    INSERT INTO public.task_edit_history (task_id, changed_by, changes)
    VALUES (new.id, (SELECT auth.uid()), delta);
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.mt56251_record_task_edit()
  FROM public, anon, authenticated;
