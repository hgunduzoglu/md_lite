'use client';

import type { DocumentVisibility } from '@/types/document';

// Owner control for switching a document between public and private. Non-owners
// never render this — they see a read-only badge instead.
export default function VisibilityToggle({
  visibility,
  onChange,
  disabled,
}: {
  visibility: DocumentVisibility;
  onChange: (next: DocumentVisibility) => void;
  disabled?: boolean;
}) {
  const next: DocumentVisibility =
    visibility === 'public' ? 'private' : 'public';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(next)}
      title={`Make ${next}`}
      className={
        visibility === 'public'
          ? 'rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200 disabled:opacity-60'
          : 'rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-60'
      }
    >
      {visibility}
    </button>
  );
}
