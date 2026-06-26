'use client';

import type { CollaboratorWithProfile } from '@/types/collaborator';
import CollaboratorListItem from './CollaboratorListItem';

export default function CollaboratorList({
  collaborators,
  onChanged,
  onRemoved,
}: {
  collaborators: CollaboratorWithProfile[];
  onChanged: () => void;
  onRemoved: () => void;
}) {
  if (collaborators.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
        No collaborators yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {collaborators.map((collaborator) => (
        <CollaboratorListItem
          key={collaborator.id}
          collaborator={collaborator}
          onChanged={onChanged}
          onRemoved={onRemoved}
        />
      ))}
    </ul>
  );
}
