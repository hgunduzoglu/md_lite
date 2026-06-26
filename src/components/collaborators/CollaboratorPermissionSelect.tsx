'use client';

import type { CollaboratorPermission } from '@/types/collaborator';

// Small read/write picker reused by the add form and each collaborator row.
export default function CollaboratorPermissionSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: CollaboratorPermission;
  onChange: (value: CollaboratorPermission) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as CollaboratorPermission)}
      className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
    >
      <option value="read">read</option>
      <option value="write">write</option>
    </select>
  );
}
