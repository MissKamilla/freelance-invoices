import 'server-only';
import { inngest } from './client';

type EventToSend = Parameters<typeof inngest.send>[0];

/**
 * Відправляє подію в Inngest. Якщо Dev Server недоступний — виконує fallback синхронно
 * (наприклад, надсилає лист одразу), щоб застосунок працював і без фонових задач.
 */
export async function dispatch(event: EventToSend, fallback?: () => Promise<unknown>): Promise<void> {
  try {
    await inngest.send(event);
  } catch (error) {
    console.error('[inngest] send failed, running fallback', error);
    if (!fallback) return;
    try {
      await fallback();
    } catch (fallbackError) {
      console.error('[inngest] fallback failed', fallbackError);
    }
  }
}
