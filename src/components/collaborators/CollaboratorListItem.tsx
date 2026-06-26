'use client';

import { useState } from 'react';
import {
  removeDocumentCollaborator,
  updateDocumentCollaboratorPermission,
} from '@/lib/collaborators';
import type {
  CollaboratorPermission,
  CollaboratorWithProfile,
} from '@/types/collaborator';
import CollaboratorPermissionSelect from './CollaboratorPermissionSelect';

// One collaborator row with an inline permission change and a remove action.
// Permission updates persist immediately; the parent is told to refresh on
// removal so the row disappears.
export default function CollaboratorListItem({
  collaborator,
  onChanged,
  onRemoved,
}: {
  collaborator: CollaboratorWithProfile;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handlePermissionChange(next: CollaboratorPermission) {
    setBusy(true);
    try {
      await updateDocumentCollaboratorPermission(collaborator.id, next);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await removeDocumentCollaborator(collaborator.id);
      onRemoved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{collaborator.email}</p>
        {collaborator.display_name && (
          <p className="truncate text-xs text-slate-500">
            {collaborator.display_name}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CollaboratorPermissionSelect
          value={collaborator.permission}
          onChange={handlePermissionChange}
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
