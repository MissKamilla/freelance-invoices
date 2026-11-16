import type { FieldPath, FieldValues, RegisterOptions, UseFormReturn } from 'react-hook-form';
import type { ActionResult } from '@/lib/action-result';

/** Пропси для MUI TextField з react-hook-form: ref → inputRef, помилка → helperText. */
export function muiField<T extends FieldValues, C, O extends FieldValues>(
  form: UseFormReturn<T, C, O>,
  name: FieldPath<T>,
  options?: RegisterOptions<T, FieldPath<T>>,
) {
  const { ref, ...rest } = form.register(name, options);
  const error = form.getFieldState(name, form.formState).error?.message;
  return {
    ...rest,
    inputRef: ref,
    error: Boolean(error),
    helperText: error,
  };
}

/** Переносить помилки полів із серверної відповіді у форму. */
export function applyServerErrors<T extends FieldValues, C, O extends FieldValues>(
  form: UseFormReturn<T, C, O>,
  result: ActionResult<unknown>,
) {
  if (result.ok || !result.fieldErrors) return;
  for (const [field, messages] of Object.entries(result.fieldErrors)) {
    form.setError(field as FieldPath<T>, { message: messages[0] });
  }
}
