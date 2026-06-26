export type CollaboratorPermission = 'read' | 'write';

export type DocumentCollaborator = {
  id: string;
  document_id: string;
  user_id: string;
  permission: CollaboratorPermission;
  created_at: string;
};

// A collaborator row joined with the matching profile, used by the management
// UI so it can show who the collaborator is rather than a bare user id.
export type CollaboratorWithProfile = DocumentCollaborator & {
  email: string;
  display_name: string | null;
};
