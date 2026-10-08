-- Run once in SQL Editor, Database mode. Existing tasks and users remain intact.
begin;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- The existing trigger rejects all role changes. Permit changes only when a
-- privileged SECURITY DEFINER routine is executing as the postgres owner.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Cannot change profile ID';
  end if;
  if new.role is distinct from old.role and current_user <> 'postgres' then
    raise exception 'Role changes require privileged operation';
  end if;
  return new;
end;
$$;

create or replace function public.team_set_role(target_id uuid, new_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  old_role text;
  admin_count integer;
begin
  if new_role not in ('admin','member') then raise exception 'Invalid role'; end if;
  -- Serialize role changes to prevent simultaneous last-admin demotions.
  perform pg_catalog.pg_advisory_xact_lock(56251, 33);
  select role into old_role from public.profiles where id = target_id for update;
  if old_role is null then raise exception 'User not found'; end if;
  if old_role = 'admin' and new_role = 'member' then
    select count(*) into admin_count from public.profiles where role = 'admin';
    if admin_count <= 1 then raise exception 'Cannot remove last admin'; end if;
  end if;
  update public.profiles set role = new_role where id = target_id;
end;
$$;
revoke all on function public.team_set_role(uuid,text) from public, anon, authenticated;
grant execute on function public.team_set_role(uuid,text) to service_role;

-- Allow users to change their own display name and color but NOT the role or
-- password-change flag. The server service_role can set the flag.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id then raise exception 'Cannot change profile ID'; end if;
  if (new.role is distinct from old.role or
      new.must_change_password is distinct from old.must_change_password)
      and current_user <> 'postgres' and current_user <> 'service_role' then
    raise exception 'Protected profile fields cannot be changed';
  end if;
  return new;
end;
$$;

-- Role column must not be writable directly by authenticated clients.
revoke update on public.profiles from authenticated;
grant update (display_name, user_color) on public.profiles to authenticated;
-- Existing self-update RLS from V3.1 still applies.
commit;
