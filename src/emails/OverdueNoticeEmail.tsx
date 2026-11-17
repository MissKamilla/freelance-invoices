import { Button, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './EmailLayout';

type Props = { clientName: string; number: number; total: string; dueDate: string; url: string };

/** Фрилансеру: термін оплати минув, клієнту надіслано нагадування. */
export function OverdueNoticeEmail({ clientName, number, total, dueDate, url }: Props) {
  return (
    <EmailLayout preview={`Рахунок № ${number} прострочено — ${clientName}`}>
      <Text style={emailStyles.h1}>Рахунок № {number} прострочено</Text>
      <Text style={emailStyles.text}>
        {clientName} не оплатив(-ла) рахунок до {dueDate}. Клієнту вже надіслано нагадування; якщо гроші надійшли
        переказом — позначте рахунок оплаченим.
      </Text>
      <Text style={emailStyles.muted}>До сплати</Text>
      <Text style={emailStyles.amount}>{total}</Text>
      <Button href={url} style={emailStyles.button}>
        Відкрити рахунок
      </Button>
    </EmailLayout>
  );
}
