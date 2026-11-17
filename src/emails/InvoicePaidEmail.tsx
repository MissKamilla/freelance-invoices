import { Button, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './EmailLayout';

type Props = { clientName: string; number: number; total: string; method: string; url: string };

/** Фрилансеру: «Вам оплатили». */
export function InvoicePaidEmail({ clientName, number, total, method, url }: Props) {
  return (
    <EmailLayout preview={`${clientName} оплатив(-ла) рахунок № ${number}`}>
      <Text style={emailStyles.h1}>Вам оплатили 🎉</Text>
      <Text style={emailStyles.text}>
        {clientName} оплатив(-ла) рахунок № {number} ({method}).
      </Text>
      <Text style={emailStyles.amount}>{total}</Text>
      <Button href={url} style={emailStyles.button}>
        Відкрити рахунок
      </Button>
    </EmailLayout>
  );
}
