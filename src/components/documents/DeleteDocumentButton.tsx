'use client';

import { useState } from 'react';
import { deleteDocument } from '@/lib/documents';

// Owner-only delete control. Asks for confirmation, performs the delete, and
// notifies the parent so it can drop the document from its view. Used both in
// the document list and in the editor header.
export default function DeleteDocumentButton({
  documentId,
  onDeleted,
  className,
  label = 'Delete',
}: {
  documentId: string;
  onDeleted?: () => void;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this document? This cannot be undone.'
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await deleteDocument(documentId);
      onDeleted?.();
    } catch {
      setError('Failed to delete the document.');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      title={error ?? undefined}
      className={
        className ??
        'rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60'
      }
    >
      {busy ? 'Deleting…' : label}
    </button>
  );
}
