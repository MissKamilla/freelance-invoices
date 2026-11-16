import { Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './EmailLayout';

type Props = { sellerName: string; number: number; total: string; paidAt: string };

/** Клієнту: підтвердження, що оплату за рахунком отримано. */
export function PaymentConfirmationEmail({ sellerName, number, total, paidAt }: Props) {
  return (
    <EmailLayout preview={`Оплату рахунку № ${number} отримано`}>
      <Text style={emailStyles.h1}>Оплату отримано</Text>
      <Text style={emailStyles.text}>
        Рахунок № {number} від {sellerName} оплачено {paidAt}.
      </Text>
      <Text style={emailStyles.muted}>Сума</Text>
      <Text style={emailStyles.amount}>{total}</Text>
      <Text style={emailStyles.muted}>Дякуємо! Цей лист — підтвердження оплати, не фіскальний чек.</Text>
    </EmailLayout>
  );
}
