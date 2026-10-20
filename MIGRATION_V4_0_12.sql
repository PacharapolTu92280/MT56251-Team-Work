-- MT56251 V4.0.12: disable legacy signed-in Request submission RPC.
-- Guest Portal continues using Edge Function team-guest-request -> team391_submit_guest_request.
-- Admin approval RPC team39_review_request is not modified.
BEGIN;
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='team39_submit_request'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    RAISE NOTICE 'Disabled direct submission via %', f.signature;
  END LOOP;
END $$;
COMMIT;
