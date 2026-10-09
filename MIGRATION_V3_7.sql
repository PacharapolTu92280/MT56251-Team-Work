-- MT56251 V3.7 Notification Center (additive; run once in SQL Editor).
create table if not exists public.team_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid references public.tasks(id) on delete set null,
 kind text not null check(kind in ('due_soon','overdue','assigned','comment','completed')),
 title text not null,
 message text not null default '',
 dedupe_key text,
 is_read boolean not null default false,
 created_at timestamptz not null default now(),
 constraint team_notifications_recipient_dedupe unique(recipient_id,dedupe_key)
);
create index if not exists team_notifications_recipient_idx on public.team_notifications(recipient_id,created_at desc);
alter table public.team_notifications enable row level security;
revoke all on public.team_notifications from anon,authenticated;
grant select,update on public.team_notifications to authenticated;
grant all on public.team_notifications to service_role;
drop policy if exists team37_notification_read on public.team_notifications;
create policy team37_notification_read on public.team_notifications for select to authenticated using(recipient_id=auth.uid());
drop policy if exists team37_notification_update on public.team_notifications;
create policy team37_notification_update on public.team_notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
-- Prevent user edits to notification content: only is_read may be changed by users.
create or replace function public.team37_guard_notification_update() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user <> 'postgres' and current_user <> 'service_role' then
   if new.id is distinct from old.id or new.recipient_id is distinct from old.recipient_id or new.task_id is distinct from old.task_id or new.kind is distinct from old.kind or new.title is distinct from old.title or new.message is distinct from old.message or new.dedupe_key is distinct from old.dedupe_key or new.created_at is distinct from old.created_at then
     raise exception 'Only read state may be changed';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists team37_guard_notification_update on public.team_notifications;
create trigger team37_guard_notification_update before update on public.team_notifications for each row execute function public.team37_guard_notification_update();

create or replace function public.team37_task_notify() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();
begin
 if tg_op='INSERT' then
  if new.assigned_to is not null and new.assigned_to is distinct from actor then
   insert into public.team_notifications(recipient_id,task_id,kind,title,message)
   values(new.assigned_to,new.id,'assigned','ได้รับมอบหมายงาน',new.title);
  end if;
 elsif tg_op='UPDATE' then
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null and new.assigned_to is distinct from actor then
   insert into public.team_notifications(recipient_id,task_id,kind,title,message)
   values(new.assigned_to,new.id,'assigned','ได้รับมอบหมายงาน',new.title);
  end if;
  if new.status='Completed' and old.status is distinct from 'Completed' then
   insert into public.team_notifications(recipient_id,task_id,kind,title,message)
   select distinct recipient,new.id,'completed','งานเสร็จสิ้น',new.title
   from (values(new.created_by),(new.assigned_to)) as v(recipient)
   where recipient is not null and recipient is distinct from actor;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists team37_task_notify on public.tasks;
create trigger team37_task_notify after insert or update of assigned_to,status on public.tasks for each row execute function public.team37_task_notify();

create or replace function public.team37_comment_notify() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.team_notifications(recipient_id,task_id,kind,title,message)
 select distinct recipient,new.task_id,'comment','ความคิดเห็นใหม่',left(coalesce(new.message,''),180)
 from public.tasks t cross join lateral (values(t.created_by),(t.assigned_to)) as v(recipient)
 where t.id=new.task_id and recipient is not null and recipient is distinct from new.author_id;
 return new;
end $$;
drop trigger if exists team37_comment_notify on public.comments;
create trigger team37_comment_notify after insert on public.comments for each row execute function public.team37_comment_notify();

-- Generates reminders when the recipient opens/refeshes the app; no external scheduler.
create or replace function public.team37_refresh_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare me uuid := auth.uid(); n integer := 0;
begin
 if me is null then raise exception 'Login required'; end if;
 insert into public.team_notifications(recipient_id,task_id,kind,title,message,dedupe_key)
 select me,t.id,
 case when t.due_date < (now() at time zone 'Asia/Bangkok')::date then 'overdue' else 'due_soon' end,
 case when t.due_date < (now() at time zone 'Asia/Bangkok')::date then 'งานเกินกำหนด' else 'งานใกล้ครบกำหนด' end,
 t.title || ' — Due ' || t.due_date::text,
 (case when t.due_date < (now() at time zone 'Asia/Bangkok')::date then 'overdue:' else 'due_soon:' end) || t.id::text || ':' || t.due_date::text
 from public.tasks t
 where t.assigned_to=me and t.deleted_at is null and t.status is distinct from 'Completed'
 and t.due_date is not null and t.due_date <= (now() at time zone 'Asia/Bangkok')::date + 2
 on conflict(recipient_id,dedupe_key) do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function public.team37_refresh_reminders() from public,anon;
grant execute on function public.team37_refresh_reminders() to authenticated;
-- Realtime: best-effort; requires publication configuration and working websocket.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
 select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_notifications') then
 alter publication supabase_realtime add table public.team_notifications;
 end if;
end $$;
