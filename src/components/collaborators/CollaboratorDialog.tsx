'use client';

import { useCallback, useEffect, useState } from 'react';
import { listDocumentCollaborators } from '@/lib/collaborators';
import type { CollaboratorWithProfile } from '@/types/collaborator';
import AddCollaboratorForm from './AddCollaboratorForm';
import CollaboratorList from './CollaboratorList';

// Owner-only modal for managing who can access a document. Loads the current
// collaborators on open and reloads after any add, permission change, or
// removal so the list always reflects the database.
export default function CollaboratorDialog({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const [collaborators, setCollaborators] = useState<CollaboratorWithProfile[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await listDocumentCollaborators(documentId);
    setCollaborators(rows);
    setLoading(false);
  }, [documentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Collaborators</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <AddCollaboratorForm documentId={documentId} onAdded={refresh} />

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading collaborators…</p>
          ) : (
            <CollaboratorList
              collaborators={collaborators}
              onChanged={refresh}
              onRemoved={refresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}
