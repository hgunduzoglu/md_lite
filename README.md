# md_lite

A lightweight Markdown editor and sharing app. Approved users create, edit, and
share Markdown documents with a live preview and automatic saving. Documents can
be public (readable by anyone with the link) or private (readable only by the
owner and explicit collaborators).

The frontend talks directly to Supabase — there is no custom backend. All
authorization is enforced in the database through Row Level Security, so the
anon client can never read or write data the signed-in user is not allowed to.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- CodeMirror 6 for Markdown editing
- react-markdown + remark-gfm + rehype-sanitize for the sanitized preview
- Supabase Auth, PostgreSQL, and Row Level Security

## Getting started

### 1. Create a Supabase project

In the [Supabase dashboard](https://supabase.com/dashboard), create a new
project and open the SQL Editor.

### 2. Apply the schema

Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor. It creates
the tables, indexes, permission helper functions, protective triggers, and the
full set of RLS policies.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from your Supabase
project (Project Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENABLE_SIGNUP=true
```

Never put the service role key in the frontend.

### 4. Run the app

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000.

## User approval

Signing up creates an account and a profile, but does **not** grant write
access. Approval is manual: a new user can only read public documents until an
administrator approves them.

To approve a user, copy their id from Supabase (Authentication → Users) and run
[`supabase/approve_user.sql`](supabase/approve_user.sql) with that id, or insert
directly:

```sql
insert into public.app_members (user_id, role)
values ('AUTH_USER_ID', 'writer');
```

Once approved, the user can create documents, own them, and be added as a
collaborator.

## Access model

| Level                  | Read | Edit title/content | Visibility | Collaborators | Delete |
| ---------------------- | ---- | ------------------ | ---------- | ------------- | ------ |
| Anonymous (public doc) | yes  | no                 | no         | no            | no     |
| Read collaborator      | yes  | no                 | no         | no            | no     |
| Write collaborator     | yes  | yes                | no         | no            | no     |
| Owner                  | yes  | yes                | yes        | yes           | yes    |

## Deployment

Deploy to Vercel, add the same `NEXT_PUBLIC_*` environment variables, and set the
Supabase Auth site URL and redirect URLs to your deployed domain. Then create an
owner account in production and approve it by inserting its id into
`app_members`.
