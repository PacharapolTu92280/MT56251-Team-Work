-- Soft delete: preserves tasks, comments and edit history.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);
GRANT SELECT, UPDATE ON public.tasks TO service_role;
-- Do not allow ordinary authenticated users to change deletion markers through Data API.
CREATE OR REPLACE FUNCTION public.mt56251_protect_delete_markers()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by)
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Delete markers may only be changed by server';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_mt56251_protect_delete_markers ON public.tasks;
CREATE TRIGGER trg_mt56251_protect_delete_markers BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.mt56251_protect_delete_markers();
-- Existing tasks_read policy is replaced to hide archived tasks from direct reads.
DROP POLICY IF EXISTS tasks_read ON public.tasks;
CREATE POLICY tasks_read ON public.tasks FOR SELECT TO authenticated USING (deleted_at IS NULL);
