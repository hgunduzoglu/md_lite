'use client';

import { useDeferredValue, useState } from 'react';
import MarkdownEditor from './MarkdownEditor';
import MarkdownPreview from './MarkdownPreview';

type MobileView = 'write' | 'preview';

// Editing surface for owners and write collaborators. On wide screens the
// editor and preview sit side by side; on narrow screens a toggle switches
// between writing and previewing so both fit on a phone.
export default function SplitEditor({
  value,
  onChange,
  editable,
}: {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
}) {
  const [mobileView, setMobileView] = useState<MobileView>('write');

  // Keep typing responsive: the editor uses the live value, while the preview
  // renders from a deferred copy so re-parsing the Markdown never blocks input.
  const previewValue = useDeferredValue(value);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-slate-200 md:hidden">
        {(['write', 'preview'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setMobileView(view)}
            className={
              mobileView === view
                ? 'flex-1 border-b-2 border-blue-600 px-4 py-2 text-sm font-medium text-blue-600'
                : 'flex-1 px-4 py-2 text-sm text-slate-500'
            }
          >
            {view === 'write' ? 'Write' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={`min-h-0 w-full overflow-auto border-slate-200 md:block md:w-1/2 md:border-r ${
            mobileView === 'write' ? 'block' : 'hidden'
          }`}
        >
          <MarkdownEditor value={value} onChange={onChange} editable={editable} />
        </div>

        <div
          className={`min-h-0 w-full overflow-auto bg-white p-6 md:block md:w-1/2 ${
            mobileView === 'preview' ? 'block' : 'hidden'
          }`}
        >
          <MarkdownPreview content={previewValue} />
        </div>
      </div>
    </div>
  );
}
