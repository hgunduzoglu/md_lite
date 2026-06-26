import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import type {
  CollaboratorPermission,
  CollaboratorWithProfile,
  DocumentCollaborator,
} from '@/types/collaborator';

// Returns the current user's collaborator permission on a document, or null if
// they are not a collaborator. RLS lets a user read their own collaborator
// rows, so this works without owning the document.
export async function getMyCollaboratorPermission(
  documentId: string
): Promise<CollaboratorPermission | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('document_collaborators')
    .select('permission')
    .eq('document_id', documentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { permission: CollaboratorPermission } | null)?.permission ?? null;
}

// Lists collaborators for a document the current user owns, joined with each
// collaborator's profile so the UI can show email and display name.
export async function listDocumentCollaborators(
  documentId: string
): Promise<CollaboratorWithProfile[]> {
  const { data, error } = await supabase
    .from('document_collaborators')
    .select(
      'id, document_id, user_id, permission, created_at, profiles (email, display_name)'
    )
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  type Row = DocumentCollaborator & {
    profiles: { email: string; display_name: string | null } | null;
  };

  return ((data as unknown as Row[]) ?? []).map((row) => ({
    id: row.id,
    document_id: row.document_id,
    user_id: row.user_id,
    permission: row.permission,
    created_at: row.created_at,
    email: row.profiles?.email ?? '',
    display_name: row.profiles?.display_name ?? null,
  }));
}

export async function addDocumentCollaborator(input: {
  document_id: string;
  user_id: string;
  permission: CollaboratorPermission;
}): Promise<DocumentCollaborator> {
  const { data, error } = await supabase
    .from('document_collaborators')
    .insert(input)
    .select('id, document_id, user_id, permission, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data as DocumentCollaborator;
}

export async function updateDocumentCollaboratorPermission(
  collaboratorId: string,
  permission: CollaboratorPermission
): Promise<DocumentCollaborator> {
  const { data, error } = await supabase
    .from('document_collaborators')
    .update({ permission })
    .eq('id', collaboratorId)
    .select('id, document_id, user_id, permission, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data as DocumentCollaborator;
}

export async function removeDocumentCollaborator(
  collaboratorId: string
): Promise<void> {
  const { error } = await supabase
    .from('document_collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (error) {
    throw error;
  }
}
