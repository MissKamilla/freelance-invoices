/**
 * Демо-дані: акаунт demo@freelance.local / demo12345 з реквізитами, клієнтами
 * і ~15 рахунками в різних статусах за останні 6 місяців. Повторний запуск перестворює демо-акаунт.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { nanoid } from 'nanoid';
import { PrismaClient, type InvoiceEventType } from '../src/generated/prisma/client';
import { DEMO_USER } from '../src/features/auth/demo';
import type { ClientSnapshot, SellerSnapshot } from '../src/features/invoices/snapshot';
import { addDays, atKyivTime, todayKyiv } from '../src/lib/dates';
import { calcLineAmount } from '../src/lib/invoice-calc';
import { buildPaymentPurpose } from '../src/lib/payment-purpose';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const today = todayKyiv();
/** Момент «о N-й годині за Києвом» для календарного дня (з урахуванням літнього часу). */
const at = (date: Date, hoursKyiv: number) => atKyivTime(date, hoursKyiv);

const seller: SellerSnapshot = {
  legalName: 'ФОП Іваненко Олена Петрівна',
  taxId: '1234567899',
  iban: 'UA573220010000026007233566001',
  bankName: 'АТ «Універсал Банк» (monobank)',
  address: 'м. Київ, вул. Хрещатик, 1, кв. 10',
  phone: '+380671234567',
  taxNote: 'Платник єдиного податку 3 групи, не платник ПДВ',
};

const clients = [
  {
    key: 'alfa',
    name: 'ТОВ «Альфа Діджитал»',
    taxId: '41234567',
    email: 'buh@alfa-digital.ua',
    address: 'м. Львів, вул. Городоцька, 10',
  },
  {
    key: 'beta',
    name: 'ТОВ «Бета Студія»',
    taxId: '38765432',
    email: 'finance@beta.studio',
    address: 'м. Київ, вул. Антоновича, 50',
  },
  {
    key: 'petrenko',
    name: 'ФОП Петренко Петро Петрович',
    taxId: '2987654320',
    email: 'petrenko@gmail.com',
    address: 'м. Одеса, вул. Дерибасівська, 5',
  },
  {
    key: 'ngo',
    name: 'ГО «Код Майбутнього»',
    taxId: '43001002',
    email: 'hello@kodmaibutnoho.org',
    address: 'м. Харків, просп. Науки, 14',
  },
  { key: 'gamma', name: 'ТОВ «Гамма Логістик»', taxId: '39998877', email: 'office@gamma-log.ua', address: null },
] as const;
type ClientKey = (typeof clients)[number]['key'];

type Item = { description: string; unit: string; quantity: number; price: number };

type SeedInvoice = {
  client: ClientKey;
  issuedDaysAgo: number;
  dueInDays: number;
  items: Item[];
  outcome: 'paid' | 'sent' | 'viewed' | 'cancelled' | 'draft';
  paidAfterDays?: number;
  provider?: 'MANUAL' | 'MOCK';
  contractRef?: string;
};

// quantity — у сотих, price — у копійках
const грн = (value: number) => value * 100;
const invoices: SeedInvoice[] = [
  {
    client: 'alfa',
    issuedDaysAgo: 160,
    dueInDays: 7,
    outcome: 'paid',
    paidAfterDays: 3,
    provider: 'MANUAL',
    contractRef: 'Договір № 7 від 01.05.2026',
    items: [{ description: 'Дизайн лендінгу', unit: 'послуга', quantity: 100, price: грн(24_000) }],
  },
  {
    client: 'beta',
    issuedDaysAgo: 130,
    dueInDays: 7,
    outcome: 'paid',
    paidAfterDays: 5,
    provider: 'MOCK',
    items: [
      { description: 'UI-кіт для мобільного застосунку', unit: 'послуга', quantity: 100, price: грн(15_000) },
      { description: 'Правки за фідбеком', unit: 'год', quantity: 350, price: грн(1_000) },
    ],
  },
  {
    client: 'petrenko',
    issuedDaysAgo: 120,
    dueInDays: 5,
    outcome: 'paid',
    paidAfterDays: 2,
    provider: 'MANUAL',
    items: [{ description: 'Логотип і фірмовий стиль', unit: 'послуга', quantity: 100, price: грн(6_000) }],
  },
  {
    client: 'alfa',
    issuedDaysAgo: 98,
    dueInDays: 7,
    outcome: 'paid',
    paidAfterDays: 6,
    provider: 'MOCK',
    contractRef: 'Договір № 7 від 01.05.2026',
    items: [{ description: 'Дизайн особистого кабінету', unit: 'послуга', quantity: 100, price: грн(30_000) }],
  },
  {
    client: 'ngo',
    issuedDaysAgo: 85,
    dueInDays: 14,
    outcome: 'paid',
    paidAfterDays: 10,
    provider: 'MANUAL',
    items: [
      { description: 'Ілюстрації для звіту', unit: 'шт', quantity: 1200, price: грн(650) },
      { description: 'Верстка звіту', unit: 'послуга', quantity: 100, price: грн(1_700) },
    ],
  },
  {
    client: 'beta',
    issuedDaysAgo: 62,
    dueInDays: 7,
    outcome: 'paid',
    paidAfterDays: 4,
    provider: 'MOCK',
    items: [{ description: 'Підтримка дизайн-системи', unit: 'міс', quantity: 100, price: грн(22_000) }],
  },
  {
    client: 'alfa',
    issuedDaysAgo: 35,
    dueInDays: 7,
    outcome: 'paid',
    paidAfterDays: 2,
    provider: 'MOCK',
    contractRef: 'Договір № 7 від 01.05.2026',
    items: [
      { description: 'Редизайн каталогу', unit: 'послуга', quantity: 100, price: грн(20_000) },
      { description: 'Анімації інтерфейсу', unit: 'год', quantity: 600, price: грн(1_000) },
    ],
  },
  {
    client: 'petrenko',
    issuedDaysAgo: 30,
    dueInDays: 5,
    outcome: 'paid',
    paidAfterDays: 1,
    provider: 'MANUAL',
    items: [{ description: 'Банери для реклами', unit: 'шт', quantity: 500, price: грн(1_500) }],
  },
  {
    client: 'beta',
    issuedDaysAgo: 9,
    dueInDays: 7,
    outcome: 'paid',
    paidAfterDays: 3,
    provider: 'MOCK',
    items: [{ description: 'Підтримка дизайн-системи', unit: 'міс', quantity: 100, price: грн(15_000) }],
  },
  {
    client: 'alfa',
    issuedDaysAgo: 3,
    dueInDays: 7,
    outcome: 'viewed',
    contractRef: 'Договір № 7 від 01.05.2026',
    items: [
      { description: 'Дизайн лендінгу акції', unit: 'послуга', quantity: 100, price: грн(25_000) },
      { description: 'Правки', unit: 'год', quantity: 350, price: грн(1_000) },
    ],
  },
  {
    client: 'petrenko',
    issuedDaysAgo: 14,
    dueInDays: 7,
    outcome: 'viewed',
    items: [{ description: 'Макети для соцмереж', unit: 'шт', quantity: 1000, price: грн(650) }],
  },
  {
    client: 'ngo',
    issuedDaysAgo: 1,
    dueInDays: 14,
    outcome: 'sent',
    items: [{ description: 'Інфографіка для грантової заявки', unit: 'послуга', quantity: 100, price: грн(12_000) }],
  },
  {
    client: 'beta',
    issuedDaysAgo: 20,
    dueInDays: 7,
    outcome: 'cancelled',
    items: [{ description: 'Аудит юзабіліті (скасовано)', unit: 'послуга', quantity: 100, price: грн(9_000) }],
  },
  {
    client: 'alfa',
    issuedDaysAgo: 0,
    dueInDays: 7,
    outcome: 'draft',
    items: [{ description: 'Дизайн email-розсилок', unit: 'шт', quantity: 400, price: грн(2_500) }],
  },
  {
    client: 'gamma',
    issuedDaysAgo: 0,
    dueInDays: 10,
    outcome: 'draft',
    items: [{ description: 'Прототип CRM', unit: 'послуга', quantity: 100, price: грн(35_000) }],
  },
];

async function main() {
  // Перестворюємо демо-акаунт: спершу рахунки (зв'язок з клієнтом — RESTRICT), далі користувача з усім іншим.
  const existing = await db.user.findUnique({ where: { email: DEMO_USER.email }, select: { id: true } });
  if (existing) {
    await db.invoice.deleteMany({ where: { userId: existing.id } });
    await db.user.delete({ where: { id: existing.id } });
  }

  const userId = randomUUID();
  await db.user.create({
    data: {
      id: userId,
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: 'credential',
          password: await hashPassword(DEMO_USER.password),
        },
      },
    },
  });

  const issuedCount = invoices.filter((i) => i.outcome !== 'draft').length;
  await db.businessProfile.create({
    data: { userId, ...seller, defaultDueDays: 7, nextInvoiceNumber: issuedCount + 1 },
  });

  const clientIds = {} as Record<ClientKey, string>;
  const clientSnapshots = {} as Record<ClientKey, ClientSnapshot>;
  for (const client of clients) {
    const { key, ...data } = client;
    const created = await db.client.create({ data: { userId, ...data } });
    clientIds[key] = created.id;
    clientSnapshots[key] = { name: data.name, taxId: data.taxId, email: data.email, address: data.address };
  }

  // Номери — у порядку дати виставлення.
  const ordered = [...invoices].sort((a, b) => b.issuedDaysAgo - a.issuedDaysAgo);
  let number = 0;
  for (const seed of ordered) {
    const issueDate = addDays(today, -seed.issuedDaysAgo);
    const dueDate = addDays(issueDate, seed.dueInDays);
    const items = seed.items.map((item, index) => ({
      position: index + 1,
      description: item.description,
      unit: item.unit,
      quantityHundredths: item.quantity,
      unitPrice: item.price,
      amount: calcLineAmount(item.quantity, item.price),
    }));
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const createdAt = at(addDays(issueDate, -1), 18);
    const base = {
      userId,
      clientId: clientIds[seed.client],
      dueDate,
      contractRef: seed.contractRef ?? null,
      total,
      createdAt,
      items: { create: items },
    };

    if (seed.outcome === 'draft') {
      await db.invoice.create({ data: { ...base, events: { create: [{ type: 'CREATED', createdAt }] } } });
      continue;
    }

    number += 1;
    const issuedAt = at(issueDate, 10);
    const viewedAt = at(issueDate, 13);
    const paidAt = seed.paidAfterDays !== undefined ? at(addDays(issueDate, seed.paidAfterDays), 15) : null;
    const cancelledAt = at(addDays(issueDate, 2), 11);
    const events: { type: InvoiceEventType; createdAt: Date; meta?: object }[] = [
      { type: 'CREATED', createdAt },
      { type: 'ISSUED', createdAt: issuedAt, meta: { number } },
    ];
    if (seed.outcome !== 'sent') events.push({ type: 'VIEWED', createdAt: viewedAt });
    if (seed.outcome === 'paid' && paidAt)
      events.push({ type: 'PAID', createdAt: paidAt, meta: { provider: seed.provider } });
    if (seed.outcome === 'cancelled') events.push({ type: 'CANCELLED', createdAt: cancelledAt });

    await db.invoice.create({
      data: {
        ...base,
        number,
        status: seed.outcome === 'paid' ? 'PAID' : seed.outcome === 'cancelled' ? 'CANCELLED' : 'SENT',
        issueDate,
        issuedAt,
        viewedAt: seed.outcome === 'sent' ? null : viewedAt,
        paidAt,
        cancelledAt: seed.outcome === 'cancelled' ? cancelledAt : null,
        paymentPurpose: buildPaymentPurpose({ number, issueDate }),
        publicToken: nanoid(24),
        sellerSnapshot: seller,
        clientSnapshot: clientSnapshots[seed.client],
        events: { create: events },
        ...(seed.outcome === 'paid' &&
          paidAt && {
            payments: {
              create: {
                provider: seed.provider ?? 'MANUAL',
                status: 'SUCCEEDED',
                amount: total,
                paidAt,
                createdAt: paidAt,
                ...(seed.provider === 'MOCK' && { externalId: `mock_${nanoid(12)}` }),
              },
            },
          }),
      },
    });
  }

  console.log(
    `Демо-дані створено: ${DEMO_USER.email} / ${DEMO_USER.password} — ${invoices.length} рахунків, ${clients.length} клієнтів.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
