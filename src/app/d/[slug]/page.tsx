'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import DocumentHeader from '@/components/documents/DocumentHeader';
import type { SaveState } from '@/components/documents/SaveStatus';
import SplitEditor from '@/components/editor/SplitEditor';
import MarkdownPreview from '@/components/editor/MarkdownPreview';
import CollaboratorDialog from '@/components/collaborators/CollaboratorDialog';
import Header from '@/components/layout/Header';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentBySlug, updateDocument } from '@/lib/documents';
import { getMyCollaboratorPermission } from '@/lib/collaborators';
import type {
  Document,
  DocumentVisibility,
  EffectiveDocumentPermission,
} from '@/types/document';

const AUTOSAVE_DELAY_MS = 800;

type LoadState = 'loading' | 'ready' | 'not_found';

function DocumentEditor({ document }: { document: Document }) {
  const router = useRouter();

  // Effective permission decides which surface the viewer gets.
  const [permission, setPermission] = useState<EffectiveDocumentPermission>(
    'public_read'
  );
  const [permissionResolved, setPermissionResolved] = useState(false);

  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content_md);
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    document.visibility
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);

  // Skip the autosave that the initial state population would otherwise trigger.
  const initializedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function resolve() {
      const user = await getCurrentUser();
      if (!active) {
        return;
      }

      if (user && user.id === document.owner_id) {
        setPermission('owner');
      } else if (user) {
        const collaboratorPermission = await getMyCollaboratorPermission(
          document.id
        );
        if (!active) {
          return;
        }
        if (collaboratorPermission === 'write') {
          setPermission('write');
        } else if (collaboratorPermission === 'read') {
          setPermission('read');
        } else {
          // RLS only returned this document because it is public.
          setPermission('public_read');
        }
      } else {
        setPermission('public_read');
      }

      setPermissionResolved(true);
    }

    resolve();
    return () => {
      active = false;
    };
  }, [document.id, document.owner_id]);

  const canEdit = permission === 'owner' || permission === 'write';

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      // Owners may change visibility; write collaborators are limited to the
      // title and content, matching what the database will accept.
      const update =
        permission === 'owner'
          ? { title, content_md: content, visibility }
          : { title, content_md: content };
      await updateDocument(document.id, update);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [permission, title, content, visibility, document.id]);

  // Debounced autosave. Fires whenever an editable field changes once the
  // editor has finished its initial render with the loaded values.
  useEffect(() => {
    if (!canEdit || !permissionResolved) {
      return;
    }
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    const handle = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(handle);
  }, [title, content, visibility, canEdit, permissionResolved, save]);

  if (!permissionResolved) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <DocumentHeader
        permission={permission}
        title={title}
        onTitleChange={setTitle}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        saveState={saveState}
        documentId={document.id}
        onOpenCollaborators={() => setCollaboratorsOpen(true)}
        onDeleted={() => router.replace('/docs')}
      />

      <div className="min-h-0 flex-1">
        {canEdit ? (
          <SplitEditor value={content} onChange={setContent} editable />
        ) : (
          <div className="mx-auto h-full max-w-3xl overflow-auto px-4 py-8">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {collaboratorsOpen && permission === 'owner' && (
        <CollaboratorDialog
          documentId={document.id}
          onClose={() => setCollaboratorsOpen(false)}
        />
      )}
    </div>
  );
}

export default function DocumentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [state, setState] = useState<LoadState>('loading');
  const [document, setDocument] = useState<Document | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const doc = await getDocumentBySlug(slug);
        if (!active) {
          return;
        }
        if (!doc) {
          setState('not_found');
          return;
        }
        setDocument(doc);
        setState('ready');
      } catch {
        // RLS denials surface as no row, but a hard error should also resolve
        // to the not-found surface rather than a blank screen.
        if (active) {
          setState('not_found');
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <div className="py-20 text-center text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (state === 'not_found' || !document) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <div className="mx-auto max-w-lg py-20 text-center">
          <h1 className="mb-2 text-lg font-semibold">Document not found</h1>
          <p className="text-sm text-slate-500">
            This document does not exist or you do not have access to it.
          </p>
        </div>
      </div>
    );
  }

  // Re-mount the editor per document id so its local state resets cleanly when
  // navigating between documents.
  return <DocumentEditor key={document.id} document={document} />;
}
