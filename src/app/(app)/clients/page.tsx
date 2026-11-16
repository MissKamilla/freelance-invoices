import type { Metadata } from 'next';
import { ClientsView, type ClientRow } from '@/features/clients/components/ClientsView';
import { listClients } from '@/features/clients/queries';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Клієнти' };

export default async function ClientsPage({ searchParams }: PageProps<'/clients'>) {
  const user = await requireUser();
  const archived = (await searchParams).archived === '1';
  const clients = await listClients(user.id, { archived });

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    taxId: c.taxId ?? '',
    email: c.email,
    address: c.address ?? '',
    notes: c.notes ?? '',
    invoiceCount: c._count.invoices,
  }));

  return <ClientsView clients={rows} archived={archived} />;
}
