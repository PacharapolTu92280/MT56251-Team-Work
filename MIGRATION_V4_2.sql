-- Execute after reviewing existing RLS policies and the current database schema.
-- This RPC authorizes priority changes only for Admin or the current Main PIC.
CREATE OR REPLACE FUNCTION public.team42_set_main_pic_priority(p_task_id uuid,p_priority text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE caller uuid := auth.uid();
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Login required' USING ERRCODE='42501'; END IF;
 IF p_priority NOT IN ('P1','P2','P3','P4') OR p_priority IS NULL THEN
  RAISE EXCEPTION 'Invalid priority';
 END IF;
 UPDATE public.tasks AS t SET priority=p_priority
 WHERE t.id=p_task_id AND t.deleted_at IS NULL AND
 (EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=caller AND p.role='admin')
 OR (t.assigned_to=caller AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=caller AND p.role='member')));
 IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized or task not found' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.team42_set_main_pic_priority(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team42_set_main_pic_priority(uuid,text) TO authenticated;
-- NOTE: Existing UPDATE policies for tasks and collaborator RPC must be audited
-- to enforce Main PIC restrictions for general edits and attachment writes.
