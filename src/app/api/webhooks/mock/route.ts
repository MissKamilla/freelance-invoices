import { mockProvider } from '@/features/payments/providers/mock';
import { handleWebhook } from '@/features/payments/webhook';

export function POST(request: Request) {
  return handleWebhook(mockProvider, request);
}
