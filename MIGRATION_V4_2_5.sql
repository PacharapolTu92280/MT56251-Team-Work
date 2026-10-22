-- MT56251 V4.2.5 - run only after backup and review on staging.
-- The existing team39_review_request RPC remains untouched.
ALTER TABLE public.task_requests ADD COLUMN IF NOT EXISTS linked_task_id uuid;
ALTER TABLE public.task_requests ADD COLUMN IF NOT EXISTS tracking_token_hash text;
CREATE INDEX IF NOT EXISTS task_requests_linked_task_idx ON public.task_requests(linked_task_id);
-- Ensure only Admin can link a request to an existing task.
CREATE OR REPLACE FUNCTION public.team425_link_request_task(p_request_id uuid,p_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_task_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tasks WHERE id=p_task_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Task not found'; END IF;
 UPDATE public.task_requests SET linked_task_id=p_task_id WHERE id=p_request_id AND status='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Approved request not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.team425_link_request_task(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.team425_link_request_task(uuid,uuid) TO authenticated;
-- Protect token hashes even from authenticated clients; Edge Functions use service role.
REVOKE SELECT(tracking_token_hash) ON public.task_requests FROM anon,authenticated;
