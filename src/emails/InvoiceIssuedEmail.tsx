import { Button, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './EmailLayout';

type Props = { sellerName: string; number: number; total: string; dueDate: string; url: string; notes: string | null };

export function InvoiceIssuedEmail({ sellerName, number, total, dueDate, url, notes }: Props) {
  return (
    <EmailLayout preview={`Рахунок № ${number} на ${total} від ${sellerName}`}>
      <Text style={emailStyles.h1}>Рахунок на оплату № {number}</Text>
      <Text style={emailStyles.text}>{sellerName} виставив(-ла) вам рахунок.</Text>
      <Text style={emailStyles.muted}>До сплати</Text>
      <Text style={emailStyles.amount}>{total}</Text>
      <Text style={emailStyles.text}>Оплатити до {dueDate} — карткою або переказом за QR-кодом НБУ.</Text>
      {notes && <Text style={{ ...emailStyles.text, whiteSpace: 'pre-line' }}>{notes}</Text>}
      <Button href={url} style={emailStyles.button}>
        Переглянути й оплатити
      </Button>
    </EmailLayout>
  );
}
