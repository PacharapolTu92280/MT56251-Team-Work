-- MT56251 V3.9.3: global Guest Calendar visibility (DEFAULT ON).
-- IMPORTANT: Enabling this setting publishes task titles, dates and status
-- for all non-completed, non-deleted tasks to unauthenticated visitors.
-- Run only after company approval to expose this limited information.
BEGIN;
CREATE TABLE IF NOT EXISTS public.team_guest_calendar_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  is_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_guest_calendar_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.team_guest_calendar_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_guest_calendar_settings TO service_role;
INSERT INTO public.team_guest_calendar_settings (id,is_visible)
VALUES (1,true) ON CONFLICT (id) DO NOTHING;

-- Admin reads the current global setting (never returns task details).
CREATE OR REPLACE FUNCTION public.team393_get_guest_calendar_visibility()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN RAISE EXCEPTION 'Admin only' USING errcode='42501'; END IF;
  SELECT is_visible INTO result FROM public.team_guest_calendar_settings WHERE id=1;
  IF result IS NULL THEN RAISE EXCEPTION 'Setting missing'; END IF;
  RETURN result;
END; $$;

-- Only Admin can change global visibility. Service role reads directly.
CREATE OR REPLACE FUNCTION public.team393_set_guest_calendar_visibility(p_visible boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN RAISE EXCEPTION 'Admin only' USING errcode='42501'; END IF;
  IF p_visible IS NULL THEN RAISE EXCEPTION 'Invalid setting'; END IF;
  UPDATE public.team_guest_calendar_settings
  SET is_visible=p_visible,updated_at=now() WHERE id=1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Setting missing'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.team393_get_guest_calendar_visibility() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.team393_set_guest_calendar_visibility(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.team393_get_guest_calendar_visibility() TO authenticated;
GRANT EXECUTE ON FUNCTION public.team393_set_guest_calendar_visibility(boolean) TO authenticated;
COMMIT;
