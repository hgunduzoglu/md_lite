'use client';

import Link from 'next/link';
import type { Document } from '@/types/document';
import type { CollaboratorPermission } from '@/types/collaborator';
import DeleteDocumentButton from './DeleteDocumentButton';

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Renders one row in the document list. Owned documents get a delete action;
// shared documents get a badge showing the collaborator's read/write access.
export default function DocumentListItem({
  document,
  access,
  onDeleted,
}: {
  document: Document;
  access: 'owner' | CollaboratorPermission;
  onDeleted?: () => void;
}) {
  const isOwner = access === 'owner';

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <Link
          href={`/d/${document.slug}`}
          className="block truncate font-medium text-slate-900 hover:text-blue-600"
        >
          {document.title || 'Untitled'}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span
            className={
              document.visibility === 'public'
                ? 'rounded-full bg-green-100 px-2 py-0.5 text-green-700'
                : 'rounded-full bg-slate-100 px-2 py-0.5 text-slate-600'
            }
          >
            {document.visibility}
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
            {isOwner ? 'owner' : access}
          </span>
          <span>Updated {formatDate(document.updated_at)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/d/${document.slug}`}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          Open
        </Link>
        {isOwner && (
          <DeleteDocumentButton
            documentId={document.id}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </li>
  );
}
