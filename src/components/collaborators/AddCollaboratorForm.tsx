'use client';

import { useState } from 'react';
import { findProfileByEmail } from '@/lib/profiles';
import { addDocumentCollaborator } from '@/lib/collaborators';
import type { CollaboratorPermission } from '@/types/collaborator';
import CollaboratorPermissionSelect from './CollaboratorPermissionSelect';

type SupabaseError = { code?: string; message?: string };

// Resolves an email to a profile, then inserts a collaborator row. The database
// is the real gate (target must be approved, cannot duplicate, cannot be the
// owner); this maps those failures to the spec's user-facing messages.
export default function AddCollaboratorForm({
  documentId,
  onAdded,
}: {
  documentId: string;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<CollaboratorPermission>('read');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const profile = await findProfileByEmail(email);
      if (!profile) {
        setError('No approved user found with this email.');
        return;
      }

      await addDocumentCollaborator({
        document_id: documentId,
        user_id: profile.user_id,
        permission,
      });

      setEmail('');
      setPermission('read');
      onAdded();
    } catch (err) {
      const e = err as SupabaseError;
      if (e.code === '23505') {
        setError('This user is already a collaborator.');
      } else if (e.message?.includes('owner cannot be added')) {
        setError('The document owner cannot be added as a collaborator.');
      } else {
        // The most common remaining cause is the target not being approved,
        // which the insert policy rejects.
        setError('No approved user found with this email.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="collaborator-email"
            className="mb-1 block text-sm font-medium"
          >
            Collaborator email
          </label>
          <input
            id="collaborator-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <CollaboratorPermissionSelect
          value={permission}
          onChange={setPermission}
          disabled={submitting}
        />

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
