'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import AuthState from '@/components/auth/AuthState';
import { getCurrentUserMembership } from '@/lib/auth';
import { createDocument } from '@/lib/documents';

function NewDocumentContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Creating a document is a side effect that must run exactly once, even under
  // React's development double-invoke of effects.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function create() {
      const membership = await getCurrentUserMembership();
      if (!membership) {
        setError('Your account is not approved to create documents.');
        return;
      }

      try {
        const document = await createDocument();
        router.replace(`/d/${document.slug}`);
      } catch {
        setError('Failed to create a new document.');
      }
    }

    create();
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="py-20 text-center text-sm text-slate-500">
      Creating document…
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <AppShell>
      <AuthState>
        <NewDocumentContent />
      </AuthState>
    </AppShell>
  );
}
