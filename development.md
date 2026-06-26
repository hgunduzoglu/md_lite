# md_lite — Architecture and Development Specification

## 1. Product Definition

md_lite is a Markdown-based document editor and sharing application.

The application allows approved users to create, edit, organize, and share Markdown documents. Documents are stored in Supabase PostgreSQL. Authentication is handled through Supabase Auth. Authorization is enforced through PostgreSQL Row Level Security.

The frontend communicates directly with Supabase through the Supabase JavaScript client. The application does not include a custom backend service.

## 2. Core Features

The application provides the following features:

* Email/password authentication.
* Manual user approval
* Markdown document creation.
* Markdown document editing.
* Live Markdown preview.
* Automatic document saving.
* Document list page.
* Public/private document visibility.
* Public document reading by slug URL.
* Private document access through ownership or collaborator permissions.
* Document deletion by owner.
* Document title editing.
* Document visibility management by owner.
* Collaborator management by owner.
* Read collaborator access.
* Write collaborator access.
* Save status display.
* Responsive editor layout.

## 3. Technology Stack

The application uses the following stack:

```txt
Frontend: Next.js App Router
Language: TypeScript
Styling: Tailwind CSS
Editor: CodeMirror 6
Markdown Rendering: react-markdown
Markdown Extensions: remark-gfm
HTML Sanitization: rehype-sanitize
Authentication: Supabase Auth
Database: Supabase PostgreSQL
Authorization: PostgreSQL Row Level Security
Deployment: Vercel
```

## 4. System Architecture

```txt
User Browser
    |
    | Next.js Application
    | Supabase JavaScript Client
    |
Supabase
    |
    | Auth
    | PostgreSQL
    | Row Level Security
```

The frontend is responsible for:

* Rendering pages and UI components.
* Managing authentication state.
* Calling Supabase Auth methods.
* Calling Supabase database APIs.
* Rendering the Markdown editor.
* Rendering the Markdown preview.
* Managing autosave state.
* Managing collaborator UI state.

Supabase is responsible for:

* User authentication.
* PostgreSQL document storage.
* User profile storage.
* Manual approval storage.
* Document-level collaborator permissions.
* Database-level access control.

The database is the source of truth for users, documents, document visibility, collaborator permissions, and write access.

## 5. Authentication Model

The application uses Supabase email/password authentication.

Users sign up with an email address and password.

After signup, the user exists in Supabase Auth and has a profile row in `profiles`.

A signed-up user does not automatically receive document write access.

Write access is granted by inserting the user’s Supabase Auth user ID into the `app_members` table.

Only users listed in `app_members` are approved application users.

Only approved users can:

* Create documents.
* Own documents.
* Be added as document collaborators.
* Edit documents where they have owner or write collaborator access.

## 6. Authorization Model

The application has four access levels.

### 6.1 Anonymous Visitor

Anonymous visitors can:

* Read public documents.

Anonymous visitors cannot:

* Create documents.
* Edit documents.
* Delete documents.
* Read private documents.
* Access collaborator-only documents.
* Manage collaborators.

### 6.2 Authenticated Unapproved User

Authenticated unapproved users can:

* Sign in.
* Read public documents.
* Read their own profile.
* Read their own approval status.
* View an account-not-approved state.

Authenticated unapproved users cannot:

* Create documents.
* Edit documents.
* Delete documents.
* Be added as collaborators.
* Read private documents owned by another user.
* Manage collaborators.

### 6.3 Approved User

Approved users can:

* Create documents.
* Own documents.
* Read their own documents.
* Edit their own documents.
* Delete their own documents.
* Set their own documents as public or private.
* Add approved users as collaborators to their own documents.
* Grant `read` or `write` permission to collaborators.
* Update collaborator permissions on their own documents.
* Remove collaborators from their own documents.
* Read public documents.

Approved users cannot:

* Edit documents owned by another user unless they have `write` collaborator access.
* Read private documents owned by another user unless they have `read` or `write` collaborator access.
* Delete documents owned by another user.
* Manage collaborators on documents owned by another user.
* Change ownership of a document.

### 6.4 Collaborator

A collaborator is an approved user who has explicit document-level access to a document owned by another user.

Collaborator permissions are:

```txt
read
write
```

A `read` collaborator can:

* Read the shared document.
* Open the shared document in read-only mode.
* Read the shared document even when its visibility is private.

A `write` collaborator can:

* Read the shared document.
* Edit the document title.
* Edit the Markdown content.
* Save document changes.
* Read and edit the shared document even when its visibility is private.

A collaborator cannot:

* Delete the document.
* Change document visibility.
* Add collaborators.
* Remove collaborators.
* Update collaborator permissions.
* Transfer document ownership.
* Change the document owner.
* Change the document slug.

## 7. Collaboration Model

Each document has one owner.

Each document can have multiple collaborators.

Collaborators are stored in the `document_collaborators` table.

Each collaborator row belongs to one document and one approved user.

A collaborator permission is either:

```txt
read
write
```

The owner manages collaborator access from the document settings area.

The application uses last-write-wins persistence for document updates. When multiple write-capable users edit the same document at the same time, the latest successful save becomes the stored document state.

## 8. Data Model

The application uses four database tables:

```txt
profiles
app_members
documents
document_collaborators
```

## 9. profiles Table

The `profiles` table stores application-level user profile information required for collaborator lookup.

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);
```

Fields:

```txt
user_id: Supabase Auth user ID
email: User email address
display_name: Optional display name
created_at: Profile creation timestamp
```

Indexes:

```sql
create index profiles_email_idx
  on public.profiles(email);
```

## 10. Profile Creation Trigger

A profile row is automatically created when a Supabase Auth user signs up.

```sql
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
```

## 11. app_members Table

The `app_members` table stores approved application users.

Only approved users can create documents and be added as collaborators.

```sql
create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'writer',
  created_at timestamptz not null default now()
);
```

Fields:

```txt
user_id: Supabase Auth user ID
role: Application role
created_at: Approval timestamp
```

The initial application role is:

```txt
writer
```

## 12. documents Table

The `documents` table stores Markdown documents.

```sql
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
```

Fields:

```txt
id: Internal document ID
owner_id: Supabase Auth user ID of the document owner
title: Document title
slug: Public URL identifier
content_md: Markdown content
visibility: public or private
created_at: Document creation timestamp
updated_at: Last update timestamp
```

Indexes:

```sql
create index documents_owner_id_idx
  on public.documents(owner_id);

create index documents_slug_idx
  on public.documents(slug);

create index documents_updated_at_idx
  on public.documents(updated_at desc);
```

## 13. document_collaborators Table

The `document_collaborators` table stores explicit document-level sharing permissions.

```sql
create table public.document_collaborators (
  id uuid primary key default gen_random_uuid(),

  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  permission text not null
    check (permission in ('read', 'write')),

  created_at timestamptz not null default now(),

  unique (document_id, user_id)
);
```

Fields:

```txt
id: Internal collaborator row ID
document_id: Shared document ID
user_id: Collaborator user ID
permission: read or write
created_at: Collaborator creation timestamp
```

Indexes:

```sql
create index document_collaborators_document_id_idx
  on public.document_collaborators(document_id);

create index document_collaborators_user_id_idx
  on public.document_collaborators(user_id);
```

## 14. Database Helper Functions

The application uses database helper functions for permission checks inside RLS policies and triggers.

### 14.1 is_app_member

Checks whether a user is approved.

```sql
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
```

### 14.2 owns_document

Checks whether a user owns a document.

```sql
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
```

### 14.3 has_document_permission

Checks whether a user has one of the required collaborator permissions on a document.

```sql
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
```

## 15. Timestamp Trigger

The `updated_at` field is automatically refreshed on every document update.

```sql
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
```

## 16. Document Identity Protection Trigger

Document identity fields are protected during updates.

The following fields cannot be changed after document creation:

```txt
id
owner_id
```

Only the owner can change:

```txt
slug
visibility
```

Write collaborators can update:

```txt
title
content_md
```

Write collaborators cannot update:

```txt
id
owner_id
slug
visibility
```

Trigger:

```sql
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
```

## 17. Collaborator Protection Trigger

Document owners cannot add themselves as collaborators to their own documents.

```sql
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
```

## 18. Row Level Security Setup

Row Level Security is enabled on all application tables.

```sql
alter table public.profiles enable row level security;
alter table public.app_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_collaborators enable row level security;
```

## 19. profiles Policies

Users can read their own profile.

```sql
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());
```

Approved users can read profiles for collaborator lookup.

```sql
create policy "approved users can read profiles"
on public.profiles
for select
to authenticated
using (public.is_app_member(auth.uid()));
```

The frontend does not create, update, or delete profiles directly.

## 20. app_members Policies

Authenticated users can read only their own membership row.

```sql
create policy "users can read own membership"
on public.app_members
for select
to authenticated
using (user_id = auth.uid());
```

The frontend does not create, update, or delete `app_members` records.

User approval is performed manually through Supabase SQL Editor or Supabase Dashboard.

## 21. documents Policies

### 21.1 Public Document Read Access

Public documents are readable by anonymous and authenticated users.

```sql
create policy "anyone can read public documents"
on public.documents
for select
to anon, authenticated
using (visibility = 'public');
```

### 21.2 Owner Document Read Access

Document owners can read their own documents.

```sql
create policy "owners can read own documents"
on public.documents
for select
to authenticated
using (owner_id = auth.uid());
```

### 21.3 Collaborator Document Read Access

Read and write collaborators can read shared documents.

```sql
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
```

### 21.4 Document Creation Access

Approved users can create documents.

```sql
create policy "approved users can create documents"
on public.documents
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_app_member(auth.uid())
);
```

### 21.5 Document Update Access

Document owners and write collaborators can update documents.

```sql
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
```

### 21.6 Document Delete Access

Only document owners can delete documents.

```sql
create policy "owners can delete documents"
on public.documents
for delete
to authenticated
using (
  owner_id = auth.uid()
  and public.is_app_member(auth.uid())
);
```

## 22. document_collaborators Policies

### 22.1 Owner Collaborator Read Access

Owners can read collaborator records for their own documents.

```sql
create policy "owners can read document collaborators"
on public.document_collaborators
for select
to authenticated
using (
  public.owns_document(document_collaborators.document_id, auth.uid())
);
```

### 22.2 Collaborator Own Record Read Access

Collaborators can read their own collaborator records.

```sql
create policy "collaborators can read own collaborator records"
on public.document_collaborators
for select
to authenticated
using (
  user_id = auth.uid()
);
```

### 22.3 Collaborator Insert Access

Owners can add collaborators to their own documents.

The target collaborator must be an approved user.

```sql
create policy "owners can add collaborators"
on public.document_collaborators
for insert
to authenticated
with check (
  public.is_app_member(auth.uid())
  and public.owns_document(document_collaborators.document_id, auth.uid())
  and public.is_app_member(document_collaborators.user_id)
);
```

### 22.4 Collaborator Permission Update Access

Owners can update collaborator permissions on their own documents.

The target collaborator must be an approved user.

```sql
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
```

### 22.5 Collaborator Delete Access

Owners can remove collaborators from their own documents.

```sql
create policy "owners can remove collaborators"
on public.document_collaborators
for delete
to authenticated
using (
  public.is_app_member(auth.uid())
  and public.owns_document(document_collaborators.document_id, auth.uid())
);
```

## 23. Manual User Approval Flow

A user signs up with email/password.

The user ID is copied from Supabase Auth users.

The user is approved by inserting the user ID into `app_members`.

```sql
insert into public.app_members (user_id, role)
values ('AUTH_USER_ID', 'writer');
```

After insertion, the user receives approved-user access.

Approved-user access allows the user to:

* Create documents.
* Own documents.
* Be added as a collaborator.
* Read profiles for collaborator lookup.

## 24. Application Routes

The application uses the following routes:

```txt
/
  Redirects authenticated users to /docs.
  Redirects unauthenticated users to /login.

/login
  Displays the email/password login form.

/signup
  Displays the email/password signup form.

/docs
  Displays the current user’s accessible documents.

/docs/new
  Creates a new document and redirects to the document page.

/d/[slug]
  Displays a document by slug.
  Shows owner editor mode for the owner.
  Shows write collaborator editor mode for write collaborators.
  Shows read-only mode for read collaborators and public visitors.
```

## 25. Page Behavior

### 25.1 Root Page

The root page checks authentication state.

Authenticated users are redirected to:

```txt
/docs
```

Unauthenticated users are redirected to:

```txt
/login
```

### 25.2 Login Page

The login page accepts:

```txt
email
password
```

On successful login, the user is redirected to `/docs`.

On invalid credentials, the page displays an authentication error.

### 25.3 Signup Page

The signup page accepts:

```txt
email
password
```

After successful signup, the user sees an account-created state.

The user does not receive write access until the account is inserted into `app_members`.

### 25.4 Documents Page

The documents page requires authentication.

The page fetches:

* Current user.
* Current user membership.
* Documents owned by the current user.
* Documents shared with the current user.

If the user is not approved, the page displays an account-not-approved state.

If the user is approved, the page displays:

* New document button.
* Owned documents section.
* Shared documents section.
* Document title.
* Document visibility.
* Document access badge.
* Last updated timestamp.
* Open document action.
* Delete action for owned documents.

Shared documents display the collaborator permission:

```txt
read
write
```

### 25.5 New Document Page

The new document page requires authentication and approval.

The page creates a new document with:

```txt
title: Untitled
content_md: empty string
visibility: private
slug: generated unique slug
owner_id: current user ID
```

After creation, the user is redirected to:

```txt
/d/[slug]
```

### 25.6 Document Page

The document page loads the document by slug.

If no document exists, the page displays a not-found state.

If the document is public, anonymous visitors can read it.

If the document is private, only the owner and explicit collaborators can read it.

If the current user is the owner, the page displays:

* Full editor interface.
* Title editing.
* Markdown editing.
* Markdown preview.
* Visibility control.
* Collaborator management controls.
* Delete document action.

If the current user is a `write` collaborator, the page displays:

* Title editing.
* Markdown editor.
* Markdown preview.
* Save status.
* Read-only visibility state.
* No delete action.
* No collaborator management controls.

If the current user is a `read` collaborator, the page displays:

* Read-only Markdown preview.
* Read-only title.
* No editor.
* No delete action.
* No collaborator management controls.

If the current user has no access, the page displays a not-found or access-denied state.

## 26. Editor Permission Matrix

```txt
Permission Level          Read   Edit Title   Edit Content   Visibility   Collaborators   Delete
Anonymous Public Visitor  Yes    No           No             No           No              No
Read Collaborator         Yes    No           No             No           No              No
Write Collaborator        Yes    Yes          Yes            No           No              No
Owner                     Yes    Yes          Yes            Yes          Yes             Yes
```

## 27. Editor Interface

The editor interface contains:

* Document title input.
* Public/private visibility control.
* Save status indicator.
* Markdown editor.
* Markdown preview.
* Collaborator management button.
* Delete document action.
* Back to documents action.

Owner editor header:

```txt
Back
Title Input
Visibility Toggle
Save Status
Collaborators
Delete
```

Write collaborator editor header:

```txt
Back
Title Input
Visibility Badge
Save Status
```

Read-only document header:

```txt
Back
Title
Visibility Badge
Permission Badge
```

## 28. Markdown Editing

The Markdown editor uses CodeMirror 6.

The editor stores plain Markdown text in the `content_md` field.

The editor emits content changes to the document page state.

The document page passes the current Markdown content to the preview component.

## 29. Markdown Preview

Markdown preview uses:

```txt
react-markdown
remark-gfm
rehype-sanitize
```

The preview supports GitHub-flavored Markdown through `remark-gfm`.

Rendered HTML is sanitized through `rehype-sanitize`.

The preview does not execute scripts.

## 30. Autosave

The editor uses debounced autosave.

Autosave is triggered when one of the following values changes:

```txt
title
content_md
visibility
```

For owners, autosave includes:

```txt
title
content_md
visibility
```

For write collaborators, autosave includes:

```txt
title
content_md
```

Autosave states:

```txt
idle
saving
saved
error
```

Autosave behavior:

```txt
User edits document.
Application updates local state immediately.
Application waits for debounce interval.
Application sends update request to Supabase.
Database applies RLS policies and triggers.
Application updates save status.
```

The UI displays the current save status in the editor header.

## 31. Document Visibility

Each document has one visibility value:

```txt
public
private
```

Public documents are readable by anyone with the slug URL.

Private documents are readable only by:

* Document owner.
* Read collaborators.
* Write collaborators.

Only the document owner can change document visibility.

## 32. Slug Generation

Each document receives a unique slug during creation.

The slug is used in the document URL:

```txt
/d/[slug]
```

Slug values are generated client-side.

The database enforces uniqueness through the `documents.slug` unique constraint.

Only the owner can change the slug.

## 33. Collaborator Management UI

The document owner sees collaborator management controls in the document settings area.

The collaborator management UI contains:

* Collaborator email input.
* Permission selector.
* Add collaborator button.
* Current collaborators list.
* Permission update control.
* Remove collaborator action.

Permission options:

```txt
read
write
```

### 33.1 Add Collaborator Flow

```txt
Owner enters collaborator email.
Application searches profiles by email.
Application checks that the target user exists.
Application checks that the target user is approved.
Application inserts document_collaborators row.
Collaborator receives document access.
```

### 33.2 Update Collaborator Permission Flow

```txt
Owner opens collaborator list.
Owner changes permission from read to write or write to read.
Application updates document_collaborators.permission.
Database applies RLS policies.
Updated permission takes effect immediately.
```

### 33.3 Remove Collaborator Flow

```txt
Owner opens collaborator list.
Owner removes collaborator.
Application deletes the document_collaborators row.
Collaborator loses access to the document.
```

## 34. Frontend Directory Structure

```txt
src/
  app/
    page.tsx
    login/
      page.tsx
    signup/
      page.tsx
    docs/
      page.tsx
      new/
        page.tsx
    d/
      [slug]/
        page.tsx

  components/
    auth/
      LoginForm.tsx
      SignupForm.tsx
      AuthState.tsx

    documents/
      DocumentList.tsx
      DocumentListItem.tsx
      DocumentHeader.tsx
      VisibilityToggle.tsx
      SaveStatus.tsx
      DeleteDocumentButton.tsx

    collaborators/
      CollaboratorDialog.tsx
      CollaboratorList.tsx
      CollaboratorListItem.tsx
      AddCollaboratorForm.tsx
      CollaboratorPermissionSelect.tsx

    editor/
      MarkdownEditor.tsx
      MarkdownPreview.tsx
      SplitEditor.tsx

    layout/
      AppShell.tsx
      Header.tsx

  lib/
    supabase.ts
    auth.ts
    documents.ts
    collaborators.ts
    profiles.ts
    slug.ts

  types/
    document.ts
    membership.ts
    profile.ts
    collaborator.ts
```

## 35. Environment Variables

The application uses the following environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ENABLE_SIGNUP=
```

`NEXT_PUBLIC_SUPABASE_URL` stores the Supabase project URL.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` stores the Supabase anonymous client key.

`NEXT_PUBLIC_ENABLE_SIGNUP` controls whether the signup screen is visible in the UI.

The application never stores the Supabase service role key in the frontend.

## 36. Supabase Client

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 37. Type Definitions

### 37.1 Profile

```ts
export type Profile = {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};
```

### 37.2 Membership

```ts
export type Membership = {
  user_id: string;
  role: 'writer';
  created_at: string;
};
```

### 37.3 Document

```ts
export type DocumentVisibility = 'public' | 'private';

export type Document = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  content_md: string;
  visibility: DocumentVisibility;
  created_at: string;
  updated_at: string;
};
```

### 37.4 Collaborator

```ts
export type CollaboratorPermission = 'read' | 'write';

export type DocumentCollaborator = {
  id: string;
  document_id: string;
  user_id: string;
  permission: CollaboratorPermission;
  created_at: string;
};
```

### 37.5 Effective Document Permission

```ts
export type EffectiveDocumentPermission =
  | 'none'
  | 'public_read'
  | 'read'
  | 'write'
  | 'owner';
```

## 38. Auth Module

The auth module contains:

```txt
signUpWithEmail
signInWithEmail
signOut
getCurrentUser
getCurrentUserMembership
```

### 38.1 signUpWithEmail

Creates a Supabase Auth user with email and password.

### 38.2 signInWithEmail

Signs in a Supabase Auth user with email and password.

### 38.3 signOut

Signs out the current user.

### 38.4 getCurrentUser

Returns the current Supabase Auth user.

### 38.5 getCurrentUserMembership

Checks whether the current user exists in `app_members`.

## 39. Profiles Module

The profiles module contains:

```txt
getCurrentUserProfile
findProfileByEmail
```

### 39.1 getCurrentUserProfile

Returns the current user’s profile row.

### 39.2 findProfileByEmail

Returns a profile by email for collaborator lookup.

Only approved users can search profiles.

## 40. Documents Module

The documents module contains:

```txt
createDocument
listOwnedDocuments
listSharedDocuments
getDocumentBySlug
updateDocument
deleteDocument
```

### 40.1 createDocument

Creates a new document owned by the current approved user.

### 40.2 listOwnedDocuments

Returns all documents owned by the current user.

### 40.3 listSharedDocuments

Returns all documents shared with the current user through `document_collaborators`.

### 40.4 getDocumentBySlug

Returns a document by slug if RLS allows access.

### 40.5 updateDocument

Updates title, Markdown content, and visibility according to the user’s permission level.

### 40.6 deleteDocument

Deletes a document owned by the current approved user.

## 41. Collaborators Module

The collaborators module contains:

```txt
listDocumentCollaborators
addDocumentCollaborator
updateDocumentCollaboratorPermission
removeDocumentCollaborator
```

### 41.1 listDocumentCollaborators

Returns collaborators for a document owned by the current user.

### 41.2 addDocumentCollaborator

Adds an approved user as a collaborator to an owned document.

Inputs:

```txt
document_id
user_id
permission
```

### 41.3 updateDocumentCollaboratorPermission

Updates a collaborator’s permission.

Inputs:

```txt
collaborator_id
permission
```

### 41.4 removeDocumentCollaborator

Removes a collaborator from a document.

Input:

```txt
collaborator_id
```

## 42. UI Components

### 42.1 LoginForm

Responsibilities:

* Render email input.
* Render password input.
* Submit credentials to Supabase.
* Display authentication errors.
* Redirect after successful login.

### 42.2 SignupForm

Responsibilities:

* Render email input.
* Render password input.
* Create Supabase Auth account.
* Display signup result.

### 42.3 DocumentList

Responsibilities:

* Render owned documents.
* Render shared documents.
* Render empty states.
* Render document actions.

### 42.4 DocumentListItem

Responsibilities:

* Render document title.
* Render visibility badge.
* Render access badge.
* Render updated timestamp.
* Render open action.
* Render delete action for owned documents.

### 42.5 DocumentHeader

Responsibilities:

* Render editable title according to permission.
* Render visibility toggle for owner.
* Render visibility badge for non-owner.
* Render save status.
* Render collaborator management button for owner.
* Render delete button for owner.

### 42.6 VisibilityToggle

Responsibilities:

* Render current document visibility.
* Allow owner to switch between public and private.

### 42.7 SaveStatus

Responsibilities:

* Display current save state.
* Display save errors.

### 42.8 MarkdownEditor

Responsibilities:

* Render CodeMirror editor.
* Emit Markdown changes.
* Respect read/write permission.

### 42.9 MarkdownPreview

Responsibilities:

* Render sanitized Markdown preview.
* Support GitHub-flavored Markdown.

### 42.10 SplitEditor

Responsibilities:

* Render editor and preview panes.
* Handle responsive layout.
* Switch between editor and preview on mobile.

### 42.11 CollaboratorDialog

Responsibilities:

* Render collaborator management UI.
* Load current collaborators.
* Add collaborators.
* Update collaborator permissions.
* Remove collaborators.

### 42.12 AddCollaboratorForm

Responsibilities:

* Accept collaborator email.
* Accept permission value.
* Resolve email to profile.
* Submit collaborator creation request.

### 42.13 CollaboratorList

Responsibilities:

* Render current collaborators.
* Render collaborator email.
* Render collaborator permission.
* Render permission update control.
* Render remove action.

## 43. Error States

The application displays explicit error states for the following cases.

### 43.1 Authentication Error

```txt
Invalid email or password.
```

### 43.2 Signup Error

```txt
Unable to create account.
```

### 43.3 Account Not Approved

```txt
Your account is not approved to create or edit documents.
```

### 43.4 Permission Denied

```txt
You do not have permission to modify this document.
```

### 43.5 Document Not Found

```txt
Document not found.
```

### 43.6 Save Error

```txt
Failed to save changes.
```

### 43.7 Collaborator Not Found

```txt
No approved user found with this email.
```

### 43.8 Duplicate Collaborator

```txt
This user is already a collaborator.
```

### 43.9 Owner Cannot Be Collaborator

```txt
The document owner cannot be added as a collaborator.
```

## 44. Security Requirements

The application follows these security requirements:

* RLS is enabled on all application tables.
* Anonymous users have read access only to public documents.
* Authenticated users have write access only after approval.
* Approved users can modify only their own documents unless they have write collaborator access.
* Read collaborators cannot modify shared documents.
* Write collaborators can modify only title and Markdown content.
* Only owners can delete documents.
* Only owners can manage collaborators.
* Only owners can change document visibility.
* Only owners can change document slug.
* Document ownership cannot be changed.
* The frontend never contains the Supabase service role key.
* Markdown preview is sanitized before rendering.
* Private documents are not returned to users without owner or collaborator access.
* Membership records are not writable from the frontend.
* Authorization is enforced in the database.

## 45. Setup Flow

The setup flow is:

```txt
Create Supabase project.
Create database tables.
Create indexes.
Create helper functions.
Create triggers.
Enable Row Level Security.
Create RLS policies.
Create Next.js project.
Add Supabase environment variables.
Start application.
Create owner account.
Insert owner user ID into app_members.
Create documents.
Add approved collaborators.
Edit and share documents.
```

## 46. Deployment Flow

The deployment flow is:

```txt
Push repository to GitHub.
Create Vercel project.
Add environment variables.
Deploy application.
Configure Supabase Auth site URL.
Configure Supabase Auth redirect URLs.
Create owner account in production.
Insert owner user ID into production app_members table.
Verify public document access.
Verify private document access.
Verify collaborator read access.
Verify collaborator write access.
```

## 47. Acceptance Criteria

The application is complete when all of the following conditions are met:

* User signs up with email and password.
* User signs in with email and password.
* Profile row is created after signup.
* Unapproved authenticated user cannot create documents.
* Approved user can create documents.
* Approved user can list owned documents.
* Approved user can list shared documents.
* Approved user can open a document editor.
* Approved user can edit owned document title.
* Approved user can edit owned document Markdown content.
* Markdown preview updates while editing.
* Document changes are saved automatically.
* Save status is visible.
* Approved user can delete owned documents.
* Approved user can set owned documents as public or private.
* Anonymous visitor can read public documents.
* Anonymous visitor cannot read private documents.
* Owner can add approved users as collaborators.
* Owner can grant `read` permission to a collaborator.
* Owner can grant `write` permission to a collaborator.
* Owner can update collaborator permissions.
* Owner can remove collaborators.
* Owner cannot add themselves as collaborator.
* Read collaborator can read a private shared document.
* Read collaborator cannot edit the shared document.
* Write collaborator can edit shared document title.
* Write collaborator can edit shared document Markdown content.
* Write collaborator cannot delete the shared document.
* Write collaborator cannot manage collaborators.
* Write collaborator cannot change document visibility.
* Write collaborator cannot change document slug.
* Write collaborator cannot change document ownership.
* Anonymous visitor cannot create, update, or delete documents.
* RLS policies enforce all database access rules.
* The repository contains no private secrets.
