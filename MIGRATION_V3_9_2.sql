-- MT56251 V3.9.2 - Public Guest Calendar (opt-in, private by default)
-- Run with the Supabase SQL Editor. Does not delete or expose existing tasks.
begin;
alter table public.tasks add column if not exists guest_visible boolean not null default false;
-- Only authenticated admins may toggle publication; don't allow direct client updates of guest_visible.
create or replace function public.team392_set_guest_visibility(p_task_id uuid,p_visible boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.role(),'') <> 'authenticated' then
    raise exception 'Login required' using errcode='42501';
  end if;
  if not exists (select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'Admin only' using errcode='42501';
  end if;
  update public.tasks set guest_visible=p_visible
  where id=p_task_id and deleted_at is null;
  if not found then raise exception 'Task not found'; end if;
end;
$$;
revoke all on function public.team392_set_guest_visibility(uuid,boolean) from public,anon,authenticated;
grant execute on function public.team392_set_guest_visibility(uuid,boolean) to authenticated;
-- Protect publication even when existing RLS permits members to edit tasks.
create or replace function public.team392_guard_guest_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.guest_visible is distinct from old.guest_visible then
    if not exists (select 1 from public.profiles where id=auth.uid() and role='admin')
       and coalesce(auth.role(),'') <> 'service_role' then
      raise exception 'Admin only: guest visibility' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists team392_guest_visibility_guard on public.tasks;
create trigger team392_guest_visibility_guard
before update of guest_visible on public.tasks
for each row execute function public.team392_guard_guest_visibility();
commit;
