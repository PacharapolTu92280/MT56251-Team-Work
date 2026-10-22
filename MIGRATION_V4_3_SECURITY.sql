-- Run on STAGING first. Back up before applying to Production.
-- Per-IP rate limit for Guest tracking (10 checks/hour).
CREATE TABLE IF NOT EXISTS public.team43_tracking_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL CHECK (length(ip_hash)=64),
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team43_tracking_attempts_lookup ON public.team43_tracking_attempts(ip_hash, attempted_at DESC);
ALTER TABLE public.team43_tracking_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team43_tracking_attempts FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.team43_track_attempt(p_ip_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer;
BEGIN
 IF p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid hash'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_ip_hash));
 SELECT count(*) INTO n FROM public.team43_tracking_attempts WHERE ip_hash=p_ip_hash AND attempted_at>now()-interval '1 hour';
 IF n>=10 THEN RETURN false; END IF;
 INSERT INTO public.team43_tracking_attempts(ip_hash) VALUES(p_ip_hash);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.team43_track_attempt(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.team43_track_attempt(text) TO service_role;
-- Run scheduled cleanup separately as needed:
-- DELETE FROM public.team43_tracking_attempts WHERE attempted_at < now()-interval '7 days';
