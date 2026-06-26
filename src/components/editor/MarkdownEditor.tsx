'use client';

import dynamic from 'next/dynamic';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

// CodeMirror touches the DOM as it initializes, so it must never render on the
// server. Loading it through next/dynamic with ssr:false keeps it client-only.
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-slate-400">Loading editor…</div>
  ),
});

const extensions = [markdown(), EditorView.lineWrapping];

// Plain-text Markdown editor. Emits every change to the parent and honors the
// read/write permission through the `editable` flag.
export default function MarkdownEditor({
  value,
  onChange,
  editable,
}: {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
}) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      editable={editable}
      extensions={extensions}
      height="100%"
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: editable,
      }}
      className="h-full text-sm"
    />
  );
}
