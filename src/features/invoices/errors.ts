/** Помилка бізнес-правила з повідомленням для користувача. */
export class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceError';
  }
}
