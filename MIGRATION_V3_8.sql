-- MT56251 V3.8: shared project collaborators (additive, preserves existing tasks).
-- Run as database owner after previous migrations, including V3.5 and V3.7.
begin;
create table if not exists public.task_collaborators (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (task_id,user_id)
);
create index if not exists task_collaborators_user_idx on public.task_collaborators(user_id);
alter table public.task_collaborators enable row level security;
revoke all on public.task_collaborators from public, anon, authenticated;
grant select on public.task_collaborators to authenticated;
create policy team38_collaborator_read on public.task_collaborators for select to authenticated using (
  exists (select 1 from public.tasks t where t.id=task_id and t.deleted_at is null)
);

-- Changes are made ONLY through this RPC; ordinary members cannot directly insert/delete rows.
create or replace function public.team38_set_collaborators(p_task_id uuid,p_member_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  taskrow public.tasks%rowtype;
  normalized uuid[];
  old_ids uuid[];
  new_ids uuid[];
  actor_is_admin boolean;
begin
  if actor is null then raise exception 'Login required'; end if;
  select * into taskrow from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found'; end if;
  select exists(select 1 from public.profiles where id=actor and role='admin') into actor_is_admin;
  if not (actor_is_admin or taskrow.created_by=actor or taskrow.assigned_to=actor) then
    raise exception 'Not permitted to edit this task';
  end if;
  select coalesce(array_agg(distinct x),array[]::uuid[]) into normalized
    from unnest(coalesce(p_member_ids,array[]::uuid[])) x
    where x is not null and x is distinct from taskrow.assigned_to;
  if exists(select 1 from unnest(normalized) x where not exists(select 1 from public.profiles p where p.id=x)) then
    raise exception 'Unknown member in Co-PIC list';
  end if;
  select coalesce(array_agg(user_id order by user_id),array[]::uuid[]) into old_ids
    from public.task_collaborators where task_id=p_task_id;
  delete from public.task_collaborators where task_id=p_task_id and not (user_id=any(normalized));
  insert into public.task_collaborators(task_id,user_id)
    select p_task_id,x from unnest(normalized) x on conflict do nothing;
  select coalesce(array_agg(user_id order by user_id),array[]::uuid[]) into new_ids
    from public.task_collaborators where task_id=p_task_id;
  if old_ids is distinct from new_ids then
    insert into public.task_edit_history(task_id,changed_by,changes)
    values(p_task_id,actor,jsonb_build_object('co_pic',jsonb_build_object('old',to_jsonb(old_ids),'new',to_jsonb(new_ids))));
  end if;
end $$;
revoke all on function public.team38_set_collaborators(uuid,uuid[]) from public,anon;
grant execute on function public.team38_set_collaborators(uuid,uuid[]) to authenticated;

-- Notify newly added collaborators and co-PICs when the project is completed or commented on.
create or replace function public.team38_notify_collaborator() returns trigger
language plpgsql security definer set search_path='' as $$
declare task_title text;
begin
  select title into task_title from public.tasks where id=new.task_id;
  if new.user_id is distinct from auth.uid() then
    insert into public.team_notifications(recipient_id,task_id,kind,title,message)
    values(new.user_id,new.task_id,'assigned','ได้รับมอบหมายงานร่วม',coalesce(task_title,''));
  end if;
  return new;
end $$;
drop trigger if exists team38_notify_collaborator on public.task_collaborators;
create trigger team38_notify_collaborator after insert on public.task_collaborators
for each row execute function public.team38_notify_collaborator();

create or replace function public.team38_notify_collaborator_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare task_title text;
begin
  if tg_table_name='tasks' then
    if new.status='Completed' and old.status is distinct from 'Completed' then
      insert into public.team_notifications(recipient_id,task_id,kind,title,message)
      select c.user_id,new.id,'completed','งานร่วมเสร็จสิ้น',new.title
      from public.task_collaborators c where c.task_id=new.id and c.user_id is distinct from auth.uid();
    end if;
  elsif tg_table_name='comments' then
    select title into task_title from public.tasks where id=new.task_id;
    insert into public.team_notifications(recipient_id,task_id,kind,title,message)
    select c.user_id,new.task_id,'comment','ความคิดเห็นใหม่ในงานร่วม',left(coalesce(new.message,''),180)
    from public.task_collaborators c where c.task_id=new.task_id and c.user_id is distinct from new.author_id;
  end if;
  return new;
end $$;
drop trigger if exists team38_notify_completed on public.tasks;
create trigger team38_notify_completed after update of status on public.tasks
for each row execute function public.team38_notify_collaborator_activity();
drop trigger if exists team38_notify_comment on public.comments;
create trigger team38_notify_comment after insert on public.comments
for each row execute function public.team38_notify_collaborator_activity();

-- Realtime updates for the team list, when supported by the project's publication.
do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_collaborators') then
  alter publication supabase_realtime add table public.task_collaborators;
 end if;
end $$;
commit;
