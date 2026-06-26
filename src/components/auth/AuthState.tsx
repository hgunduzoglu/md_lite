'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Client-side authentication guard for pages that require a signed-in user.
// While the session is resolving it shows a neutral loading state; if there is
// no session it redirects to /login; otherwise it renders its children.
export default function AuthState({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated'>('loading');

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) {
        return;
      }
      if (data.user) {
        setStatus('authenticated');
      } else {
        router.replace('/login');
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
