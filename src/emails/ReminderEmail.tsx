import { Button, Text } from '@react-email/components';
import type { ReminderKind } from '@/lib/reminders';
import { EmailLayout, emailStyles } from './EmailLayout';

type Props = { kind: ReminderKind; sellerName: string; number: number; total: string; dueDate: string; url: string };

const TITLES: Record<ReminderKind, (n: number) => string> = {
  before_due: (n) => `Нагадування: завтра термін оплати рахунку № ${n}`,
  manual: (n) => `Нагадування про рахунок № ${n}`,
  overdue: (n) => `Термін оплати рахунку № ${n} минув`,
};

export function reminderSubject(kind: ReminderKind, number: number) {
  return TITLES[kind](number);
}

export function ReminderEmail({ kind, sellerName, number, total, dueDate, url }: Props) {
  return (
    <EmailLayout preview={reminderSubject(kind, number)}>
      <Text style={emailStyles.h1}>{reminderSubject(kind, number)}</Text>
      <Text style={emailStyles.text}>
        {kind === 'overdue'
          ? `Рахунок від ${sellerName} мав бути оплачений до ${dueDate}. Якщо ви вже оплатили — дякуємо, просто проігноруйте цей лист.`
          : `Рахунок від ${sellerName} потрібно оплатити до ${dueDate}.`}
      </Text>
      <Text style={emailStyles.muted}>До сплати</Text>
      <Text style={emailStyles.amount}>{total}</Text>
      <Button href={url} style={emailStyles.button}>
        Переглянути й оплатити
      </Button>
    </EmailLayout>
  );
}
