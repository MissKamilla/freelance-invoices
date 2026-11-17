import { monobankProvider } from '@/features/payments/providers/monobank';
import { handleWebhook } from '@/features/payments/webhook';

export function POST(request: Request) {
  return handleWebhook(monobankProvider, request);
}
