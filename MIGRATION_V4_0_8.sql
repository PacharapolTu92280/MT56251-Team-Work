-- MT56251 V4.0.8: secure priority update for task participants.
-- Run once in Supabase SQL Editor. Rank is NOT changed by this function.
BEGIN;
CREATE OR REPLACE FUNCTION public.team408_set_task_priority(p_task_id uuid, p_priority text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE actor uuid; actor_role text;
BEGIN
 actor := (SELECT auth.uid());
 IF actor IS NULL OR (SELECT auth.role()) <> 'authenticated' THEN
   RAISE EXCEPTION 'Login required' USING ERRCODE='42501';
 END IF;
 SELECT role INTO actor_role FROM public.profiles WHERE id=actor;
 IF actor_role NOT IN ('admin','member') OR actor_role IS NULL THEN
   RAISE EXCEPTION 'Member or Admin only' USING ERRCODE='42501';
 END IF;
 IF p_priority IS NULL OR p_priority NOT IN ('P1','P2','P3','P4') THEN
   RAISE EXCEPTION 'Invalid priority' USING ERRCODE='22023';
 END IF;
 -- Members may modify priority only on tasks they created, own, or co-own.
 -- Admins may modify any active task.
 UPDATE public.tasks AS t SET priority=p_priority
 WHERE t.id=p_task_id AND t.deleted_at IS NULL
   AND (actor_role='admin' OR t.assigned_to=actor OR t.created_by=actor
        OR EXISTS (SELECT 1 FROM public.task_collaborators AS c
                   WHERE c.task_id=t.id AND c.user_id=actor));
 IF NOT FOUND THEN RAISE EXCEPTION 'Task not found or not authorized' USING ERRCODE='42501'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.team408_set_task_priority(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.team408_set_task_priority(uuid,text) TO authenticated;
COMMIT;
