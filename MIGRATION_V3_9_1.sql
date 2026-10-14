-- Run AFTER MIGRATION_V3_9.sql. Existing requests and tasks remain unchanged.
begin;
alter table public.task_requests alter column requester_id drop not null;
create table if not exists public.team_guest_request_limits (
  ip_hash text not null, created_at timestamptz not null default now()
);
create index if not exists team_guest_limits_idx on public.team_guest_request_limits(ip_hash,created_at desc);
alter table public.team_guest_request_limits enable row level security;
revoke all on public.team_guest_request_limits from public,anon,authenticated;
-- This RPC is callable only with the service role from the Edge Function.
create or replace function public.team391_submit_guest_request(
 p_ip_hash text,p_requester_name text,p_contact_email text,p_title text,p_details text,
 p_category text,p_priority text,p_due_date date default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; n int;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Forbidden'; end if;
 if length(coalesce(p_ip_hash,''))<>64 or p_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid client'; end if;
 if length(trim(coalesce(p_requester_name,''))) not between 1 and 100 or
    length(trim(coalesce(p_title,''))) not between 1 and 200 or
    length(coalesce(p_details,''))>3000 or
    length(coalesce(p_contact_email,'')) not between 3 and 254 or
    p_contact_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' or
    p_category not in ('Daily Operations','Project Response','Process Improvement') or
    p_priority not in ('P1','P2','P3','P4') or
    (p_due_date is not null and (p_due_date<current_date-1 or p_due_date>current_date+730))
 then raise exception 'Invalid request fields'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_ip_hash));
 select count(*) into n from public.team_guest_request_limits where ip_hash=p_ip_hash and created_at>now()-interval '1 hour';
 if n>=3 then raise exception 'Rate limit exceeded'; end if;
 insert into public.task_requests(requester_id,requester_name,contact_email,title,details,category,requested_priority,requested_due_date)
 values(null,trim(p_requester_name),lower(trim(p_contact_email)),trim(p_title),coalesce(p_details,''),p_category,p_priority,p_due_date) returning id into rid;
 insert into public.team_guest_request_limits(ip_hash) values(p_ip_hash);
 return rid;
end $$;
revoke all on function public.team391_submit_guest_request(text,text,text,text,text,text,text,date) from public,anon,authenticated;
grant execute on function public.team391_submit_guest_request(text,text,text,text,text,text,text,date) to service_role;
commit;
