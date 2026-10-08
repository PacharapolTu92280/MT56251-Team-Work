-- Run once in Supabase SQL Editor, Database mode.
-- Only allow authenticated users to update their own profile.
-- Existing protect_profile_fields trigger still blocks role/id changes.
create policy "profiles_self_update"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Restrict editable columns for the client role.
revoke update on public.profiles from authenticated;
grant update (display_name, user_color) on public.profiles to authenticated;
