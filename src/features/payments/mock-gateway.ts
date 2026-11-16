/**
 * Імітація ЗОВНІШНЬОГО платіжного шлюзу для режиму PAYMENT_PROVIDER=mock.
 * У реальному житті цей код живе на боці банку: він «списує» гроші з картки
 * й надсилає нам підписаний вебхук. Тестові картки — як у Stripe.
 */

export const MOCK_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  /** Списано на 1 копійку менше — щоб показати обробку розбіжності суми. */
  amountMismatch: '4000000000000101',
} as const;

export type MockCardResult =
  | { status: 'success'; chargedAmount: number }
  | { status: 'failure'; chargedAmount: 0; failureReason: string };

export function chargeMockCard(cardNumber: string, amount: number): MockCardResult {
  const digits = cardNumber.replace(/\D/g, '');
  switch (digits) {
    case MOCK_CARDS.success:
      return { status: 'success', chargedAmount: amount };
    case MOCK_CARDS.amountMismatch:
      return { status: 'success', chargedAmount: amount - 1 };
    case MOCK_CARDS.declined:
      return { status: 'failure', chargedAmount: 0, failureReason: 'Картку відхилено банком' };
    default:
      return { status: 'failure', chargedAmount: 0, failureReason: 'Невідома тестова картка' };
  }
}
