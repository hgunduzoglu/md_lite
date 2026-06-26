import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { generateSlug } from './slug';
import type {
  Document,
  DocumentVisibility,
} from '@/types/document';
import type { CollaboratorPermission } from '@/types/collaborator';

const DOCUMENT_COLUMNS =
  'id, owner_id, title, slug, content_md, visibility, created_at, updated_at';

// A shared document carries the permission the current user holds on it so the
// list page can render the right access badge.
export type SharedDocument = Document & {
  permission: CollaboratorPermission;
};

// The fields a user may change through updateDocument. Which of these is
// actually accepted by the database depends on the caller's permission level,
// which is enforced by RLS and the identity-protection trigger.
export type DocumentUpdate = {
  title?: string;
  content_md?: string;
  visibility?: DocumentVisibility;
};

export async function createDocument(): Promise<Document> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      title: 'Untitled',
      content_md: '',
      visibility: 'private',
      slug: generateSlug(),
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as Document;
}

export async function listOwnedDocuments(): Promise<Document[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as Document[]) ?? [];
}

export async function listSharedDocuments(): Promise<SharedDocument[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  // Walk the collaborator rows for this user and pull the joined document. RLS
  // lets the user read both their collaborator rows and the documents they
  // point at.
  const { data, error } = await supabase
    .from('document_collaborators')
    .select(`permission, documents (${DOCUMENT_COLUMNS})`)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  type Row = {
    permission: CollaboratorPermission;
    documents: Document | null;
  };

  return ((data as unknown as Row[]) ?? [])
    .filter((row): row is Row & { documents: Document } => row.documents !== null)
    .map((row) => ({ ...row.documents, permission: row.permission }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getDocumentBySlug(
  slug: string
): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Document | null) ?? null;
}

export async function updateDocument(
  id: string,
  update: DocumentUpdate
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', id)
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
