import type { Metadata } from 'next';
import { InvoiceEditor } from '@/features/invoices/components/InvoiceEditor';
import { listClientOptions } from '@/features/invoices/queries';
import { emptyItem, type InvoiceDraftInput } from '@/features/invoices/schema';
import { getProfile } from '@/features/profile/queries';
import { addDays, toIsoDate, todayKyiv } from '@/lib/dates';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Новий рахунок' };

export default async function NewInvoicePage({ searchParams }: PageProps<'/invoices/new'>) {
  const user = await requireUser();
  const [clients, profile, { clientId }] = await Promise.all([
    listClientOptions(user.id),
    getProfile(user.id),
    searchParams,
  ]);

  const defaultValues: InvoiceDraftInput = {
    clientId: typeof clientId === 'string' && clients.some((c) => c.id === clientId) ? clientId : '',
    dueDate: toIsoDate(addDays(todayKyiv(), profile?.defaultDueDays ?? 7)),
    contractRef: '',
    notes: '',
    items: [emptyItem],
  };

  return <InvoiceEditor clients={clients} defaultValues={defaultValues} hasProfile={Boolean(profile)} />;
}
