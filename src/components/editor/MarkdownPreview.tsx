'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

// Renders Markdown as sanitized HTML. remark-gfm adds tables, task lists and
// strikethrough; rehype-sanitize strips anything dangerous so user content can
// never inject scripts into the page. Memoized so it only re-parses when the
// content it is handed actually changes.
function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      {content.trim().length === 0 ? (
        <p className="text-slate-400">Nothing to preview yet.</p>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
        >
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
}

export default memo(MarkdownPreview);
