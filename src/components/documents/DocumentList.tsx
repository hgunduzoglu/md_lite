'use client';

import type { Document } from '@/types/document';
import type { SharedDocument } from '@/lib/documents';
import DocumentListItem from './DocumentListItem';

// Presentational list of the current user's documents, split into the ones they
// own and the ones shared with them. Deletion is handled per item; the parent
// passes a callback to keep its state in sync.
export default function DocumentList({
  owned,
  shared,
  onOwnedDeleted,
}: {
  owned: Document[];
  shared: SharedDocument[];
  onOwnedDeleted: (id: string) => void;
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your documents
        </h2>
        {owned.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            You have not created any documents yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {owned.map((document) => (
              <DocumentListItem
                key={document.id}
                document={document}
                access="owner"
                onDeleted={() => onOwnedDeleted(document.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Shared with you
        </h2>
        {shared.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No documents have been shared with you.
          </p>
        ) : (
          <ul className="space-y-2">
            {shared.map((document) => (
              <DocumentListItem
                key={document.id}
                document={document}
                access={document.permission}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
