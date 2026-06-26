-- md_lite database schema
--
-- Run this against a fresh Supabase project (SQL Editor or `supabase db push`).
-- It creates the four application tables, the permission helper functions,
-- the protective triggers, and the Row Level Security policies that enforce
-- every authorization rule. The frontend talks to these tables directly with
-- the anon key, so RLS is the only thing standing between a user and data they
-- should not see — keep it the source of truth.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create index profiles_email_idx
  on public.profiles(email);

create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'writer',
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references auth.users(id) on delete cascade,

  title text not null default 'Untitled',
  slug text not null unique,

  content_md text not null default '',

  visibility text not null default 'private'
    check (visibility in ('public', 'private')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_owner_id_idx
  on public.documents(owner_id);

create index documents_slug_idx
  on public.documents(slug);

create index documents_updated_at_idx
  on public.documents(updated_at desc);

create table public.document_collaborators (
  id uuid primary key default gen_random_uuid(),

  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  permission text not null
    check (permission in ('read', 'write')),

  created_at timestamptz not null default now(),

  unique (document_id, user_id)
);

create index document_collaborators_document_id_idx
  on public.document_collaborators(document_id);

create index document_collaborators_user_id_idx
  on public.document_collaborators(user_id);

-- ---------------------------------------------------------------------------
-- Profile creation trigger
-- ---------------------------------------------------------------------------

-- A profile row is created automatically whenever a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Permission helper functions
--
-- These run as SECURITY DEFINER so they can read the tables they reference
-- without being subject to RLS. That is deliberate: it lets the documents and
-- document_collaborators policies call each other without recursive policy
-- evaluation.
-- ---------------------------------------------------------------------------

create or replace function public.is_app_member(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_members m
    where m.user_id = target_user_id
  );
$$;

create or replace function public.owns_document(
  target_document_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    where d.id = target_document_id
      and d.owner_id = target_user_id
  );
$$;

create or replace function public.has_document_permission(
  target_document_id uuid,
  target_user_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.document_collaborators dc
    where dc.document_id = target_document_id
      and dc.user_id = target_user_id
      and dc.permission = any(required_permissions)
  );
$$;

-- ---------------------------------------------------------------------------
-- Document triggers
-- ---------------------------------------------------------------------------

-- Refresh updated_at on every document update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_documents_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

-- Protect document identity. id and owner_id can never change; slug and
-- visibility can only be changed by the owner. Write collaborators are left
-- with title and content_md.
create or replace function public.protect_document_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id then
    raise exception 'Document ID cannot be changed';
  end if;

  if new.owner_id <> old.owner_id then
    raise exception 'Document owner cannot be changed';
  end if;

  if old.owner_id <> auth.uid() then
    if new.slug <> old.slug then
      raise exception 'Only the owner can change document slug';
    end if;

    if new.visibility <> old.visibility then
      raise exception 'Only the owner can change document visibility';
    end if;
  end if;

  return new;
end;
$$;

create trigger protect_document_identity_before_update
before update on public.documents
for each row
execute function public.protect_document_identity();

-- A document owner cannot be one of their own document's collaborators.
create or replace function public.prevent_owner_as_collaborator()
returns trigger
language plpgsql
as $$
declare
  document_owner_id uuid;
begin
  select owner_id
  into document_owner_id
  from public.documents
  where id = new.document_id;

  if document_owner_id = new.user_id then
    raise exception 'Document owner cannot be added as collaborator';
  end if;

  return new;
end;
$$;

create trigger prevent_owner_as_collaborator_before_insert
before insert or update on public.document_collaborators
for each row
execute function public.prevent_owner_as_collaborator();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.app_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_collaborators enable row level security;

-- profiles -------------------------------------------------------------------

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "approved users can read profiles"
on public.profiles
for select
to authenticated
using (public.is_app_member(auth.uid()));

-- app_members ----------------------------------------------------------------

create policy "users can read own membership"
on public.app_members
for select
to authenticated
using (user_id = auth.uid());

-- documents ------------------------------------------------------------------

create policy "anyone can read public documents"
on public.documents
for select
to anon, authenticated
using (visibility = 'public');

create policy "owners can read own documents"
on public.documents
for select
to authenticated
using (owner_id = auth.uid());

create policy "collaborators can read shared documents"
on public.documents
for select
to authenticated
using (
  public.is_app_member(auth.uid())
  and public.has_document_permission(
    documents.id,
    auth.uid(),
    array['read', 'write']
  )
);

create policy "approved users can create documents"
on public.documents
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_app_member(auth.uid())
);

create policy "owners and write collaborators can update documents"
on public.documents
for update
to authenticated
using (
  public.is_app_member(auth.uid())
  and (
    owner_id = auth.uid()
    or public.has_document_permission(
      documents.id,
      auth.uid(),
      array['write']
    )
  )
)
with check (
  public.is_app_member(auth.uid())
  and (
    owner_id = auth.uid()
    or public.has_document_permission(
      documents.id,
      auth.uid(),
      array['write']
    )
  )
);

create policy "owners can delete documents"
on public.documents
for delete
to authenticated
using (
  owner_id = auth.uid()
  and public.is_app_member(auth.uid())
);

-- document_collaborators -----------------------------------------------------

create policy "owners can read document collaborators"
on public.document_collaborators
for select
to authenticated
using (
  public.owns_document(document_collaborators.document_id, auth.uid())
);

create policy "collaborators can read own collaborator records"
on public.document_collaborators
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy "owners can add collaborators"
on public.document_collaborators
for insert
to authenticated
with check (
  public.is_app_member(auth.uid())
  and public.owns_document(document_collaborators.document_id, auth.uid())
  and public.is_app_member(document_collaborators.user_id)
);

create policy "owners can update collaborators"
on public.document_collaborators
for update
to authenticated
using (
  public.is_app_member(auth.uid())
  and public.owns_document(document_collaborators.document_id, auth.uid())
)
with check (
  public.is_app_member(auth.uid())
  and public.owns_document(document_collaborators.document_id, auth.uid())
  and public.is_app_member(document_collaborators.user_id)
);

create policy "owners can remove collaborators"
on public.document_collaborators
for delete
to authenticated
using (
  public.is_app_member(auth.uid())
  and public.owns_document(document_collaborators.document_id, auth.uid())
);
