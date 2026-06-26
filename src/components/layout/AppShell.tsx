import type { ReactNode } from 'react';
import Header from './Header';

// Standard chrome for most pages: the shared header plus a centered content
// column. The editor page deliberately renders its own full-width layout and
// does not use this shell.
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
