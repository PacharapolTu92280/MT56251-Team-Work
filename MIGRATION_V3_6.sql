-- MT56251 V3.6: Private task attachments (additive migration).
-- Execute as project database owner in Supabase SQL Editor.
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  file_name text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size between 0 and 10485760),
  created_at timestamptz not null default now()
);
create index if not exists task_attachments_task_id_idx on public.task_attachments(task_id);
alter table public.task_attachments enable row level security;
grant select,insert on public.task_attachments to authenticated;
grant all on public.task_attachments to service_role;
drop policy if exists "mt36_read_attachments" on public.task_attachments;
create policy "mt36_read_attachments" on public.task_attachments
for select to authenticated using (auth.uid() is not null);
drop policy if exists "mt36_add_attachments" on public.task_attachments;
create policy "mt36_add_attachments" on public.task_attachments
for insert to authenticated with check (
 uploaded_by = auth.uid() and
 exists (select 1 from public.tasks t where t.id=task_id and t.deleted_at is null) and
 split_part(storage_path,'/',1)=task_id::text
);
-- Private storage: do not turn the bucket public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('task-files','task-files',false,10485760,
 array['application/pdf','image/png','image/jpeg','text/plain','text/csv',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "mt36_read_task_files" on storage.objects;
create policy "mt36_read_task_files" on storage.objects
for select to authenticated using (bucket_id='task-files');
drop policy if exists "mt36_upload_task_files" on storage.objects;
create policy "mt36_upload_task_files" on storage.objects
for insert to authenticated with check (
 bucket_id='task-files' and
 exists(select 1 from public.tasks t where t.id::text=split_part(name,'/',1) and t.deleted_at is null)
);
drop policy if exists "mt36_cleanup_task_files" on storage.objects;
create policy "mt36_cleanup_task_files" on storage.objects
for delete to authenticated using (bucket_id='task-files' and owner_id=auth.uid()::text);
