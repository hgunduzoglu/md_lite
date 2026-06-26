'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import AuthState from '@/components/auth/AuthState';
import DocumentList from '@/components/documents/DocumentList';
import { getCurrentUserMembership } from '@/lib/auth';
import {
  listOwnedDocuments,
  listSharedDocuments,
  type SharedDocument,
} from '@/lib/documents';
import type { Document } from '@/types/document';

function DocsContent() {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [owned, setOwned] = useState<Document[]>([]);
  const [shared, setShared] = useState<SharedDocument[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const membership = await getCurrentUserMembership();
      if (!active) {
        return;
      }

      if (!membership) {
        setApproved(false);
        setLoading(false);
        return;
      }

      setApproved(true);
      const [ownedDocs, sharedDocs] = await Promise.all([
        listOwnedDocuments(),
        listSharedDocuments(),
      ]);
      if (!active) {
        return;
      }
      setOwned(ownedDocs);
      setShared(sharedDocs);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">Loading…</div>
    );
  }

  if (!approved) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-amber-900">
          Account not approved
        </h1>
        <p className="text-sm text-amber-800">
          Your account is not approved to create or edit documents. An
          administrator needs to approve it before you can continue.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Link
          href="/docs/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New document
        </Link>
      </div>

      <DocumentList
        owned={owned}
        shared={shared}
        onOwnedDeleted={(id) =>
          setOwned((current) => current.filter((doc) => doc.id !== id))
        }
      />
    </div>
  );
}

export default function DocsPage() {
  return (
    <AppShell>
      <AuthState>
        <DocsContent />
      </AuthState>
    </AppShell>
  );
}
