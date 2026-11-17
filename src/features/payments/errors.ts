/** Помилка оплати з повідомленням для клієнта. */
export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

/** Невалідний підпис вебхука — запит не від провайдера. */
export class WebhookSignatureError extends Error {
  constructor() {
    super('Invalid webhook signature');
    this.name = 'WebhookSignatureError';
  }
}
