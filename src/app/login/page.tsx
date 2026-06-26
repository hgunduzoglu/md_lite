import AppShell from '@/components/layout/AppShell';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AppShell>
      <div className="py-8">
        <LoginForm />
      </div>
    </AppShell>
  );
}
