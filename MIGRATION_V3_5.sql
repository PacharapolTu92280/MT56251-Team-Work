-- MT56251 V3.5: append-only task edit history
-- Run ONCE in Supabase SQL Editor as the project database owner.
-- Existing tasks, profiles and comments are not modified or deleted.
begin;
create table if not exists public.task_edit_history (
  id bigint generated always as identity primary key,
  task_id uuid not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  changes jsonb not null
);
create index if not exists task_edit_history_task_date_idx
  on public.task_edit_history (task_id, changed_at desc);

alter table public.task_edit_history enable row level security;
-- No browser INSERT/UPDATE/DELETE permissions; records are written by trigger only.
revoke all on table public.task_edit_history from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.task_edit_history to authenticated;
drop policy if exists task_history_read on public.task_edit_history;
create policy task_history_read on public.task_edit_history
  for select to authenticated using (
    exists (select 1 from public.tasks t where t.id = task_id)
  );

create or replace function public.mt56251_record_task_edit()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  fields text[] := array['title','description','category','status','progress','assigned_to','start_date','due_date'];
  field text;
  before_row jsonb := to_jsonb(old);
  after_row jsonb := to_jsonb(new);
  delta jsonb := '{}'::jsonb;
begin
  foreach field in array fields loop
    if (before_row -> field) is distinct from (after_row -> field) then
      delta := delta || jsonb_build_object(field, jsonb_build_object(
        'old', before_row -> field, 'new', after_row -> field
      ));
    end if;
  end loop;
  if delta <> '{}'::jsonb then
    insert into public.task_edit_history (task_id, changed_by, changes)
    values (new.id, (select auth.uid()), delta);
  end if;
  return new;
end;
$$;
revoke all on function public.mt56251_record_task_edit() from public, anon, authenticated;

drop trigger if exists mt56251_task_edit_history_trigger on public.tasks;
create trigger mt56251_task_edit_history_trigger
  after update on public.tasks
  for each row execute function public.mt56251_record_task_edit();
commit;
