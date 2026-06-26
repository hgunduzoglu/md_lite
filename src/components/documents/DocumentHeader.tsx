'use client';

import Link from 'next/link';
import type {
  DocumentVisibility,
  EffectiveDocumentPermission,
} from '@/types/document';
import DeleteDocumentButton from './DeleteDocumentButton';
import SaveStatus, { type SaveState } from './SaveStatus';
import VisibilityToggle from './VisibilityToggle';

// The editor header adapts to the viewer's permission:
// - owner: editable title, visibility toggle, save status, collaborators, delete
// - write collaborator: editable title, visibility badge, save status
// - read-only (read collaborator / public): static title and badges only
export default function DocumentHeader({
  permission,
  title,
  onTitleChange,
  visibility,
  onVisibilityChange,
  saveState,
  documentId,
  onOpenCollaborators,
  onDeleted,
}: {
  permission: EffectiveDocumentPermission;
  title: string;
  onTitleChange: (value: string) => void;
  visibility: DocumentVisibility;
  onVisibilityChange: (next: DocumentVisibility) => void;
  saveState: SaveState;
  documentId: string;
  onOpenCollaborators: () => void;
  onDeleted: () => void;
}) {
  const isOwner = permission === 'owner';
  const canEdit = permission === 'owner' || permission === 'write';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Link
          href="/docs"
          className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </Link>

        {canEdit ? (
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            aria-label="Document title"
            className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-lg font-semibold outline-none hover:border-slate-200 focus:border-blue-500"
          />
        ) : (
          <h1 className="min-w-0 flex-1 truncate px-2 py-1 text-lg font-semibold">
            {title || 'Untitled'}
          </h1>
        )}

        <div className="flex items-center gap-3">
          {isOwner ? (
            <VisibilityToggle
              visibility={visibility}
              onChange={onVisibilityChange}
            />
          ) : (
            <span
              className={
                visibility === 'public'
                  ? 'rounded-full bg-green-100 px-3 py-1 text-sm text-green-700'
                  : 'rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600'
              }
            >
              {visibility}
            </span>
          )}

          {!canEdit && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              {permission === 'read' ? 'read access' : 'read-only'}
            </span>
          )}

          {canEdit && <SaveStatus state={saveState} />}

          {isOwner && (
            <>
              <button
                type="button"
                onClick={onOpenCollaborators}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                Collaborators
              </button>
              <DeleteDocumentButton
                documentId={documentId}
                onDeleted={onDeleted}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
