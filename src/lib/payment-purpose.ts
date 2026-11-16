import { formatDate } from './dates';

/** «Оплата за послуги згідно з рахунком № 14 від 16.11.2026 р., без ПДВ» */
export function buildPaymentPurpose({ number, issueDate }: { number: number; issueDate: Date }): string {
  return `Оплата за послуги згідно з рахунком № ${number} від ${formatDate(issueDate)} р., без ПДВ`;
}
