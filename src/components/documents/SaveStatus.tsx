'use client';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const LABELS: Record<SaveState, string> = {
  idle: 'All changes saved',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Failed to save changes',
};

// Compact text indicator of autosave progress shown in the editor header.
export default function SaveStatus({ state }: { state: SaveState }) {
  const isError = state === 'error';
  return (
    <span
      className={`text-sm ${isError ? 'text-red-600' : 'text-slate-500'}`}
      role="status"
    >
      {LABELS[state]}
    </span>
  );
}
