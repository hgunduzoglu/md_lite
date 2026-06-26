-- Manual user approval
--
-- A signed-up user can read public documents but cannot create or edit anything
-- until they are approved. Approval is intentionally manual: copy the user's id
-- from the Supabase Auth users list (Authentication > Users) and insert it here.
--
-- Replace AUTH_USER_ID with the real UUID before running.

insert into public.app_members (user_id, role)
values ('AUTH_USER_ID', 'writer');
