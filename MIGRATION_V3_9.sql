-- MT56251 V3.9: Guest, Request Task, Priority & Rank.
-- Prerequisites: V3.8 and prior migrations. Run with database owner permissions.
-- IMPORTANT: Review the policy/constraint audit at the end before inviting Guests.
begin;

-- Expand any existing role CHECK constraints that only allow admin/member.
do $$ declare c record;
begin
 for c in select conname, pg_get_constraintdef(oid) as def from pg_constraint
          where conrelid='public.profiles'::regclass and contype='c' loop
   if c.def ilike '%role%' and c.def ilike '%member%' then
     execute format('alter table public.profiles drop constraint %I',c.conname);
   end if;
 end loop;
end $$;
alter table public.profiles add constraint team39_profiles_role_check check (role in ('admin','member','guest'));

alter table public.tasks add column if not exists priority text not null default 'P3';
alter table public.tasks add column if not exists rank_order integer;
alter table public.tasks add constraint team39_priority_check check (priority in ('P1','P2','P3','P4'));
create index if not exists team39_task_priority_idx on public.tasks(priority,rank_order);

create table if not exists public.task_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id),
 requester_name text not null check(length(trim(requester_name)) between 1 and 100),
 contact_email text not null check(length(contact_email) between 3 and 254),
 title text not null check(length(trim(title)) between 1 and 200),
 details text not null default '',
 category text not null check(category in ('Daily Operations','Project Response','Process Improvement')),
 requested_priority text not null default 'P3' check(requested_priority in ('P1','P2','P3','P4')),
 requested_due_date date,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 review_note text, final_priority text check(final_priority in ('P1','P2','P3','P4')),
 final_rank integer, created_task_id uuid references public.tasks(id),
 created_at timestamptz not null default now()
);
create index if not exists team39_request_user_idx on public.task_requests(requester_id,created_at desc);
alter table public.task_requests enable row level security;
revoke all on public.task_requests from public,anon,authenticated;
grant select on public.task_requests to authenticated;
drop policy if exists team39_request_read on public.task_requests;
create policy team39_request_read on public.task_requests for select to authenticated using (
 requester_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

-- Guest must not be able to use old permissive RLS policies to read team data.
-- Restrictive policies apply in addition to all existing permissive policies.
create or replace function public.team39_is_staff() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','member'));
$$;
revoke all on function public.team39_is_staff() from public,anon;
grant execute on function public.team39_is_staff() to authenticated;

do $$ declare t text;
begin
 foreach t in array array['tasks','comments','task_edit_history','task_attachments','task_collaborators','team_notifications'] loop
   if to_regclass('public.'||t) is not null then
     execute format('drop policy if exists team39_staff_gate on public.%I',t);
     execute format('create policy team39_staff_gate on public.%I as restrictive for all to authenticated using (public.team39_is_staff()) with check (public.team39_is_staff())',t);
   end if;
 end loop;
end $$;
-- Guest may read only own profile; staff retain pre-existing RLS.
drop policy if exists team39_profiles_gate on public.profiles;
create policy team39_profiles_gate on public.profiles as restrictive for all to authenticated
 using (public.team39_is_staff() or id=auth.uid())
 with check (public.team39_is_staff() or id=auth.uid());
-- Guest cannot browse task files via Storage even if legacy storage policies allow it.
drop policy if exists team39_storage_gate on storage.objects;
create policy team39_storage_gate on storage.objects as restrictive for all to authenticated
 using (bucket_id <> 'task-files' or public.team39_is_staff())
 with check (bucket_id <> 'task-files' or public.team39_is_staff());

-- Only trusted server-side service_role may change user roles.
create or replace function public.team39_set_role(target_id uuid,new_role text)
returns void language plpgsql security definer set search_path='' as $$
declare old_role text; n int;
begin
 if new_role not in ('admin','member','guest') then raise exception 'Invalid role'; end if;
 perform pg_catalog.pg_advisory_xact_lock(56251,39);
 select role into old_role from public.profiles where id=target_id for update;
 if old_role is null then raise exception 'User not found'; end if;
 if old_role='admin' and new_role<>'admin' then
  select count(*) into n from public.profiles where role='admin';
  if n<=1 then raise exception 'Cannot remove last admin'; end if;
 end if;
 update public.profiles set role=new_role where id=target_id;
end $$;
revoke all on function public.team39_set_role(uuid,text) from public,anon,authenticated;
grant execute on function public.team39_set_role(uuid,text) to service_role;

-- Authenticated user submits own request; user ID comes from JWT, never the browser.
create or replace function public.team39_submit_request(
 p_requester_name text,p_contact_email text,p_title text,p_details text,
 p_category text,p_requested_priority text,p_due_date date default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Login required'; end if;
 if not exists(select 1 from public.profiles where id=uid and role in ('guest','member','admin')) then raise exception 'Profile missing'; end if;
 if length(trim(coalesce(p_requester_name,''))) not between 1 and 100
    or length(trim(coalesce(p_title,''))) not between 1 and 200
    or length(coalesce(p_details,''))>3000
    or length(coalesce(p_contact_email,'')) not between 3 and 254
    or p_contact_email !~ '^[^ @]+@[^ @]+\.[^ @]+$'
    or p_category not in ('Daily Operations','Project Response','Process Improvement')
    or p_requested_priority not in ('P1','P2','P3','P4') then
   raise exception 'Invalid request fields';
 end if;
 insert into public.task_requests(requester_id,requester_name,contact_email,title,details,category,requested_priority,requested_due_date)
 values(uid,trim(p_requester_name),lower(trim(p_contact_email)),trim(p_title),coalesce(p_details,''),p_category,p_requested_priority,p_due_date)
 returning id into rid;
 return rid;
end $$;
revoke all on function public.team39_submit_request(text,text,text,text,text,text,date) from public,anon;
grant execute on function public.team39_submit_request(text,text,text,text,text,text,date) to authenticated;

-- Atomic approval: lock request, create exactly one task, record decision.
create or replace function public.team39_review_request(
 p_request_id uuid,p_decision text,p_priority text default 'P3',p_rank integer default null,
 p_main_pic uuid default null,p_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.task_requests%rowtype; new_task uuid; actor uuid:=auth.uid(); rankval integer;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and role='admin') then
   raise exception 'Admin only';
 end if;
 if p_decision not in ('approve','reject') then raise exception 'Invalid decision'; end if;
 select * into r from public.task_requests where id=p_request_id for update;
 if not found then raise exception 'Request not found'; end if;
 if r.status<>'pending' then raise exception 'Already reviewed'; end if;
 if length(coalesce(p_note,''))>1000 then raise exception 'Note too long'; end if;
 if p_decision='reject' then
   update public.task_requests set status='rejected',reviewed_by=actor,reviewed_at=now(),review_note=p_note where id=p_request_id;
   return null;
 end if;
 if p_priority not in ('P1','P2','P3','P4') then raise exception 'Invalid priority'; end if;
 if p_rank is not null and (p_rank<1 or p_rank>999999) then raise exception 'Invalid rank'; end if;
 if p_main_pic is not null and not exists(select 1 from public.profiles where id=p_main_pic and role in ('admin','member')) then
   raise exception 'Main PIC must be staff';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(56251,390);
 select coalesce(p_rank,(select coalesce(max(rank_order),0)+1 from public.tasks where deleted_at is null)) into rankval;
 insert into public.tasks(title,description,category,status,progress,due_date,assigned_to,created_by,priority,rank_order)
 values(r.title,r.details,r.category,'Pending',0,r.requested_due_date,p_main_pic,actor,p_priority,rankval)
 returning id into new_task;
 update public.task_requests set status='approved',reviewed_by=actor,reviewed_at=now(),review_note=p_note,
 final_priority=p_priority,final_rank=rankval,created_task_id=new_task where id=p_request_id;
 return new_task;
end $$;
revoke all on function public.team39_review_request(uuid,text,text,integer,uuid,text) from public,anon;
grant execute on function public.team39_review_request(uuid,text,text,integer,uuid,text) to authenticated;

-- Priority/rank editing after approval: Admin only.
create or replace function public.team39_set_task_rank(p_task_id uuid,p_priority text,p_rank integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin only'; end if;
 if p_priority not in ('P1','P2','P3','P4') or p_rank is null or p_rank<1 or p_rank>999999 then raise exception 'Invalid priority/rank'; end if;
 update public.tasks set priority=p_priority,rank_order=p_rank where id=p_task_id and deleted_at is null;
 if not found then raise exception 'Task not found'; end if;
end $$;
revoke all on function public.team39_set_task_rank(uuid,text,integer) from public,anon;
grant execute on function public.team39_set_task_rank(uuid,text,integer) to authenticated;

commit;
