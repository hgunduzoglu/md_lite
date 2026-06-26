'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// The root simply routes people to the right place: signed-in users go to their
// documents, everyone else goes to the login screen.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      router.replace(data.user ? '/docs' : '/login');
    });
  }, [router]);

  return (
    <div className="flex min-h-full items-center justify-center text-sm text-slate-500">
      Loading…
    </div>
  );
}
