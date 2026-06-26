'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';

// App-wide top bar. Reacts to auth state so it can show the documents link and
// a sign-out button only when someone is signed in.
export default function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setEmail(data.user?.email ?? null);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-mono text-lg font-semibold">
          md_lite
        </Link>

        {email ? (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/docs" className="text-slate-600 hover:text-slate-900">
              Documents
            </Link>
            <span className="hidden text-slate-400 sm:inline">{email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
