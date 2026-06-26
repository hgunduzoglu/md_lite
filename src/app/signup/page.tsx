import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import SignupForm from '@/components/auth/SignupForm';

const SIGNUP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SIGNUP === 'true';

export default function SignupPage() {
  return (
    <AppShell>
      <div className="py-8">
        {SIGNUP_ENABLED ? (
          <SignupForm />
        ) : (
          <div className="mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="mb-2 text-xl font-semibold">Signup is closed</h1>
            <p className="text-sm text-slate-600">
              New accounts are not being accepted right now.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-blue-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
