import { DatePickersProvider } from '@/components/DatePickersProvider';
import { AppShell } from '@/components/layout/AppShell';
import { signOutAction } from '@/features/auth/actions';
import { requireUser } from '@/lib/session';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell user={{ name: user.name, email: user.email }} signOutAction={signOutAction}>
      <DatePickersProvider>{children}</DatePickersProvider>
    </AppShell>
  );
}
