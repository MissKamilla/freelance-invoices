import { toInvoiceView } from '@/features/invoices/view';
import { getPublicInvoice } from '@/features/public/queries';
import { renderInvoicePdf } from '@/pdf/InvoicePdf';

export async function GET(_request: Request, { params }: RouteContext<'/i/[token]/pdf'>) {
  const { token } = await params;
  const invoice = await getPublicInvoice(token);
  if (!invoice) return new Response('Рахунок не знайдено', { status: 404 });

  const pdf = await renderInvoicePdf(toInvoiceView(invoice));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rakhunok-${invoice.number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
