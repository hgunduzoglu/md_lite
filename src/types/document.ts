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

// The access level the current user has on a given document. Drives which
// editor surface (full owner editor, write editor, read-only view) is shown.
export type EffectiveDocumentPermission =
  | 'none'
  | 'public_read'
  | 'read'
  | 'write'
  | 'owner';
