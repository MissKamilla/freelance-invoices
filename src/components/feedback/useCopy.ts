'use client';
import { useNotify } from './SnackbarProvider';

/**
 * Копіювання в буфер обміну з повідомленням про результат. Clipboard API є лише в безпечному контексті
 * (HTTPS або localhost): на телефоні по http://<IP> воно відсутнє — тоді кажемо скопіювати вручну.
 */
export function useCopy() {
  const notify = useNotify();
  return async (text: string, successMessage: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      notify(successMessage);
    } catch {
      notify('Не вдалося скопіювати автоматично — виділіть текст і скопіюйте вручну', 'error');
    }
  };
}
