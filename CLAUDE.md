# Freelance Invoices — рахунки й оплати для фрилансерів

> Тестове завдання (2-й етап) на позицію **Trainee Fullstack Developer (Next.js / TypeScript)** у **Doc2Pay**.
> Умови: https://github.com/eloicompany/vacancy-product-task — тема №2: «Фрилансер виставляє рахунок, клієнт оплачує його за посиланням».
> Бюджет: **3–4 дні**. Робоче демо (P0) — до кінця Дня 3, P1 — День 4.
> Особисті нотатки (стратегія, підготовка до дзвінка) — у `NOTES.local.md`. **Цей файл ніколи не комітимо.**

---

## 0. Правила для Claude (читати першими)

**Загальне**
- UI-тексти, README, документація — українською. Код, ідентифікатори, коміти — англійською.
- Апостроф у JSX-тексті — типографський `’` (інакше ESLint `react/no-unescaped-entities`).
- Стек зафіксований (розділ 4). Не додавати бібліотеки без явної потреби, не замінювати обрані.
- Коміти маленькі й осмислені, Conventional Commits (`feat(invoices): ...`) — історія комітів оцінюється.
- Після кожного етапу: `pnpm lint && pnpm typecheck && pnpm test` (+ `pnpm test:integration`, коли змінюється робота з БД; потрібен запущений docker compose).
- `NOTES.local.md` має бути в `.gitignore`; не згадувати його вміст у коді, README чи комітах.

**Домен і дані**
- **Гроші — тільки `Int` у копійках.** Жодних `float` для сум. Відображення — лише через `formatMoney()`.
  Кількість у позиціях — теж `Int` у сотих (`1,5 год` → `150`). Prisma `Decimal` не використовуємо.
- **Валюта MVP — лише UAH** (enum `Currency` лишаємо для розширення).
- **Авторизація даних:** кожен запит у приватній зоні — `where: { id, userId }` з сесії (захист від IDOR).
- **Аргументи Server Actions — недовірений ввід.** Кожен id/токен проходить `parseIdArg()`: `undefined` у Prisma `where` означає «без фільтра» й зачепить усі записи.
- **`PAID`** ставиться лише через `applyPaymentUpdate()` (перевірений вебхук / звірка статусу) або ручною позначкою — ніколи за redirect чи URL-параметром.
- **Виставлений рахунок незмінний** (це документ). Редагувати й видаляти можна лише `DRAFT`.
- Бізнес-логіка — чисті функції в `src/lib` з unit-тестами (Vitest), тести поруч із кодом (`*.test.ts`).

**Next.js 16**
- Перед кодом звірятися з документацією саме цієї версії: `node_modules/next/dist/docs/` (див. @AGENTS.md).
- `params`/`searchParams` — це Promise (`const { id } = await params`).
- `proxy.ts` замість `middleware.ts`, і це лише UX-редирект; **кожна Server Action сама перевіряє сесію**.
- `next lint` прибрали → скрипт `"lint": "eslint ."`.
- `redirect()`/`notFound()` у Server Action — **поза** `try/catch` (інакше їх «з'їдає» catch).
- `cacheComponents` вимкнено: усі сторінки персональні й динамічні.
- Мутації з UI → Server Actions (сесія → Zod → service → `revalidatePath`), повертають `ActionResult`.
  Зовнішні виклики → Route Handlers (вебхуки, PDF, Inngest, Better Auth).

**Prisma 7, не 8**
- Встановлювати `prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg`. `prisma@latest` = Prisma 8 RC з іншим API — **не використовувати**.
- Генератор `prisma-client` з `output: "../src/generated/prisma"`; тека в `.gitignore`; `"postinstall": "prisma generate"`.
- `prisma.config.ts` сам не читає `.env` → першим рядком `import 'dotenv/config'`; seed налаштувати в конфігу.
- Node ≥ 20.19 (беремо Node 24 LTS: `.nvmrc` + `engines`).
- pnpm 10 блокує build-скрипти: `prisma`, `@prisma/engines`, `esbuild` дозволені в `pnpm-workspace.yaml` (`onlyBuiltDependencies`).
- `pnpm typecheck` = `next typegen && tsc --noEmit` (глобальні `PageProps`/`LayoutProps` генерує Next).
- Після `pnpm add` або додавання нових експортів у серверні модулі Turbopack інколи тримає застарілий граф (500, `undefined` імпорт) — перезапустити `pnpm dev`.

**Better Auth / MUI**
- Better Auth: плагін `nextCookies()` обов'язковий (інакше вхід із Server Action не ставить cookie).
  Якщо CLI не впорається з Prisma 7 — перенести 4 моделі (User, Session, Account, Verification) з документації вручну.
- MUI v9 + `@mui/x-*` тієї ж мажорної версії (v9). Тему створювати у файлі з `'use client'`.
  Дати — `LocalizationProvider` + dayjs з локаллю `uk`. Лише компоненти MUI і токени теми, без хардкод-кольорів.

**UX-стани (обов'язково для кожної сторінки)**
- `loading.tsx` (Skeleton), `error.tsx`, `not-found.tsx`; порожні стани списків.
- Результат кожної дії — Snackbar; кнопки блокуються під час виконання (`useActionState` / pending) — без подвійних кліків.
- `aria-label` на іконкових кнопках; перевірка верстки на ширині 375px.

```ts
// Єдиний формат результату Server Action
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

---

## 1. Контекст завдання

**Doc2Pay** (doc2pay.com.ua) — хмарна система для бухгалтерів, агенцій і ФОП: розпізнавання рахунків, платіжки, податки ФОП,
зарплата, CRM, клієнтський портал, Telegram-бот, інтеграція з ПриватБанком. Рахунки й оплати — їхній основний домен.

**Стек компанії (з вакансії):** Next.js (App Router), React, TypeScript (strict), Prisma, PostgreSQL, Inngest, Redis, Docker,
MUI, Vitest, Zod, Route Handlers + Server Actions.

**Вимоги до здачі:**
1. Публічний репозиторій на GitHub **з усією історією комітів**.
2. README з описом продукту та інструкцією запуску.
3. Готовий код і шаблони дозволені, але **їх треба назвати в README**.
4. Продукт **запускається локально без зовнішніх ключів** (Mock-оплата, Mailpit замість реального email).

---

## 2. Продукт

### 2.1 Проблема
Фрилансер-ФОП робить рахунки у Word/Google Docs: копіює реквізити, рахує суми вручну, пише суму прописом, надсилає PDF у
месенджер, потім звіряє виписку й забуває нагадати про прострочені рахунки. Клієнтові незручно: треба вручну переносити IBAN і
призначення платежу, легко помилитися.

### 2.2 Користувачі
- **Фрилансер (основний користувач).** Олена, UI/UX-дизайнерка, ФОП 3 групи без ПДВ. 4–8 постійних клієнтів (українські ТОВ і ФОП),
  5–15 рахунків на місяць у гривні.
- **Клієнт (платник).** Менеджер або бухгалтер замовника чи приватна особа. **Без реєстрації.** Відкриває посилання з email чи
  месенджера, часто з телефона.

### 2.3 Ціннісна пропозиція
**«Рахунок за хвилину — оплата в один клік».** Коректний рахунок з усіма реквізитами; посилання, за яким клієнт платить карткою
або QR-кодом НБУ у застосунку свого банку; автоматичні нагадування; статуси в реальному часі.

### 2.4 Сценарії (user stories)
**Фрилансер:**
1. Реєструюсь і один раз заповнюю реквізити ФОП (ПІБ, РНОКПП, IBAN, банк, адреса, податковий статус).
2. Додаю клієнта (назва, ЄДРПОУ/РНОКПП, email, адреса).
3. Створюю рахунок: клієнт, позиції (опис, одиниця, кількість, ціна), підстава (договір), бачу підсумок і суму прописом, зберігаю чернетку.
4. Виставляю рахунок → присвоюється номер, клієнт отримує email з посиланням; посилання можна скопіювати в месенджер.
5. Бачу в історії, що клієнт **переглянув** рахунок і коли **оплатив**.
6. Отримую email «Рахунок № 12 оплачено».
7. Якщо клієнт заплатив переказом на IBAN (QR / реквізити) — вручну позначаю «Оплачено».
8. Скасовую помилковий рахунок; дублюю минулий рахунок для нового місяця; надсилаю нагадування вручну.
9. На дашборді бачу, скільки мені винні, що прострочено, скільки отримано цього місяця.

**Клієнт:**
10. Відкриваю посилання → бачу рахунок як документ → завантажую PDF.
11. Оплачую карткою (Mock або monobank) **або** сканую QR НБУ в застосунку банку, **або** копіюю реквізити.
12. Бачу підтвердження оплати на сторінці й отримую **підтвердження оплати** на email.
13. Отримую нагадування за день до терміну оплати й після прострочення.

### 2.5 Поза межами MVP
- **Акти виконаних робіт.** Рахунок — лише «пропозиція оплатити», первинний документ — акт. Наступний крок після оплати.
- **Автозвірка переказів з банківською випискою** (API ПриватБанку / CSV, пошук «рахунком № …» у призначенні).
- **Фіскальні чеки (ПРРО)** для карткових оплат на ФОП.
- USD/EUR та англомовний інвойс для іноземних клієнтів; часткові оплати, повернення, повторювані рахунки, команда, підпис КЕП.

---

## 3. Функції та пріоритети
**P0** — робоче демо до кінця Дня 3 · **P1** — День 4 · **P2** — «наступні кроки», якщо лишиться час.

| Функція | Пріоритет |
|---|---|
| Реєстрація/вхід (email + пароль), «Демо-вхід» (лише при `DEMO_MODE=true`) | P0 |
| Профіль ФОП: реквізити; валідація IBAN (mod-97) і РНОКПП (контрольна сума) | P0 |
| Клієнти: список, створення/редагування в діалозі, архівація | P0 |
| Рахунок-чернетка: позиції, дати, примітка, підсумок, сума прописом | P0 |
| Виставлення: атомарна нумерація, знімок реквізитів, публічне посилання | P0 |
| Список рахунків: вкладки за статусом, пошук за номером/клієнтом | P0 |
| Сторінка рахунку: документ, дії, історія подій, платежі | P0 |
| Публічна сторінка оплати (mobile-first), PDF з кирилицею | P0 |
| QR-код НБУ + копіювання IBAN і призначення платежу | P0 |
| Оплата через Mock-провайдера: checkout, підписаний вебхук, ідемпотентність, крайові випадки | P0 |
| Ручна позначка «Оплачено», скасування, дублювання | P0 |
| Seed демо-даних (5 клієнтів, ~15 рахунків у різних статусах за 6 місяців) | P0 |
| UX-стани: loading / error / not-found / порожні стани / Snackbar | P0 |
| Email через Mailpit: рахунок клієнту, підтвердження оплати, «Вам оплатили» | P0 |
| Поле «Підстава: Договір № … від …» | P1 |
| Inngest: email у фоні, нагадування до/після терміну з `cancelOn`, ручне «Нагадати» | P1 |
| Дашборд: KPI + графік надходжень за 6 місяців | P1 |
| Monobank Acquiring (sandbox): checkout, ECDSA-вебхук, звірка статусу | P1 (перший кандидат на скорочення) |
| GitHub Actions CI: lint, typecheck, test | P1 |
| ПДВ, контрольна сума ЄДРПОУ, сторінка клієнта з його рахунками, пагінація | P2 |
| Redis: rate limit для `/i/*` і `/api/webhooks/*`; Playwright E2E | P2 |
| USD/EUR + EN-інвойс, повторювані рахунки, часткові оплати, акти, автозвірка з випискою | P2 |

---

## 4. Технології

| Шар | Вибір | Навіщо |
|---|---|---|
| Runtime | **Node 24 LTS**, **pnpm** | Prisma 7 потребує Node ≥ 20.19 |
| Фреймворк | **Next.js 16** (App Router), React 19 | Server Actions + Route Handlers |
| Мова | **TypeScript strict** + `noUncheckedIndexedAccess` | надійність типів |
| UI | **MUI v9** + `@mui/material-nextjs`, `@mui/x-charts`, `@mui/x-date-pickers` (dayjs, `uk`) | готова дизайн-система |
| Форми | **react-hook-form** + `@hookform/resolvers` + **Zod 4** | одна схема для клієнта й сервера |
| БД | **PostgreSQL 17** (Docker, порт 5433) | |
| ORM | **Prisma 7** + `@prisma/adapter-pg`, `prisma.config.ts` | стабільна версія |
| Auth | **Better Auth** (email + пароль, Prisma-адаптер, `nextCookies()`) | рекомендований для нових проєктів |
| Фонові задачі | **Inngest** (SDK v4) + Inngest Dev Server у Docker | durable-функції, `sleepUntil`, `cancelOn` |
| Email | **Nodemailer → Mailpit** (UI на :8025), шаблони **React Email** | працює локально без ключів |
| PDF | **@react-pdf/renderer** + TTF з кирилицею (Roboto / Noto Sans) | генерація в Route Handler |
| QR | **qrcode** + власний генератор payload НБУ | оплата переказом на IBAN |
| Оплата | власний інтерфейс `PaymentProvider`: **Mock** (за замовчуванням), **Monobank** (sandbox) | без ключів + реальна інтеграція |
| ID | `cuid()` для PK, `nanoid(24)` для публічного токена | непередбачувані посилання |
| Дати / гроші | dayjs (`utc`, `timezone`, `Europe/Kyiv`), `Intl.NumberFormat('uk-UA')` | |
| Тести | **Vitest** | unit- і сервісні тести |
| Якість | ESLint (`eslint .`), Prettier, GitHub Actions | |
| Інфраструктура | **Docker Compose**: postgres, mailpit, inngest | запуск однією інструкцією |

**Свідомо не використовуємо:** monorepo (один застосунок), Redis у MVP (P2: rate limit), tRPC/GraphQL (вистачає Server Actions),
Tailwind/shadcn (UI на MUI).

---

## 5. Архітектура

### 5.1 Загальна схема
```
Фрилансер ──Server Actions──►┐
                             │   Next.js 16 (App Router) ──Prisma 7──► PostgreSQL
Клієнт ──/i/[token]─────────►┘        │
                                      ├── PaymentProvider ──► Mock checkout | monobank pay page
Mock / monobank ──POST webhook──► /api/webhooks/{mock,monobank}
                                      │   підпис → applyPaymentUpdate() (транзакція, дедуп)
                                      └── inngest.send('invoice/paid')
Inngest Dev Server ◄──► /api/inngest   (email, нагадування)
Nodemailer ──SMTP──► Mailpit (http://localhost:8025)
```

### 5.2 Шари
- `app/` — роутинг, layout, виклик queries/actions. Тонкий шар.
- `features/<x>/actions.ts` — Server Actions: сесія → Zod → service → `revalidatePath`.
- `features/<x>/service.ts` — бізнес-логіка, транзакції, переходи статусів.
- `features/<x>/queries.ts` — читання з БД (завжди з `userId`).
- `lib/` — чисті утиліти без I/O (гроші, IBAN, сума прописом, QR НБУ) — повністю покриті тестами.

### 5.3 Структура тек
```
freelance-invoices/
├─ CLAUDE.md · README.md · .env.example · .nvmrc · docker-compose.yml · prisma.config.ts
├─ NOTES.local.md                          # особисте, у .gitignore
├─ prisma/            schema.prisma · migrations/ · seed.ts
├─ .github/workflows/ ci.yml
└─ src/
   ├─ app/
   │  ├─ page.tsx                          # лендінг
   │  ├─ (auth)/login · register
   │  ├─ (app)/layout.tsx                  # сайдбар + перевірка сесії
   │  ├─ (app)/dashboard · invoices · invoices/new · invoices/[id] · clients · settings
   │  │                                    # invoices/[id]: DRAFT → редактор, інакше — документ
   │  ├─ i/[token]/page.tsx · not-found.tsx
   │  ├─ i/[token]/pdf/route.ts
   │  ├─ pay/mock/[paymentId]/page.tsx
   │  └─ api/auth/[...all] · api/inngest · api/webhooks/mock · api/webhooks/monobank
   ├─ features/
   │  ├─ invoices/  actions · service · queries · schema · components/ (InvoiceEditor, InvoiceDocument, Timeline)
   │  ├─ clients/   actions · service · queries · schema · components/
   │  ├─ payments/  service (startPayment, applyPaymentUpdate) · providers/{types,mock,monobank,index}.ts
   │  ├─ profile/   · dashboard/
   ├─ lib/          db · auth · env · money · invoice-calc · amount-in-words · iban · tax-id · nbu-qr · invoice-status · payment-purpose · dates · mailer
   ├─ generated/prisma/                    # згенерований клієнт, у .gitignore
   ├─ inngest/      client.ts · functions/
   ├─ emails/       шаблони React Email
   ├─ pdf/          InvoicePdf.tsx · fonts.ts · fonts/*.ttf
   └─ theme/        тема MUI ('use client')
```
`InvoiceDocument` — один HTML-компонент для прев'ю у фрилансера й публічної сторінки; PDF — окремий простіший макет
з тих самих даних (`toInvoiceView()`).

### 5.4 Модель даних (Prisma, скорочено)
```prisma
enum Currency         { UAH }                                   // розширюваний
enum InvoiceStatus    { DRAFT SENT PAID CANCELLED }
enum PaymentProvider  { MOCK MONOBANK MANUAL }
enum PaymentStatus    { PENDING SUCCEEDED FAILED EXPIRED REFUNDED }
enum InvoiceEventType { CREATED ISSUED EMAIL_SENT VIEWED PAYMENT_STARTED PAYMENT_FAILED PAID
                        AMOUNT_MISMATCH NEEDS_REFUND REFUNDED REMINDER_SENT CANCELLED }

// User, Session, Account, Verification — моделі Better Auth

model BusinessProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  legalName         String   // "ФОП Іваненко Олена Петрівна"
  taxId             String   // РНОКПП, 10 цифр
  iban              String   // UA + 27 цифр
  bankName          String
  address           String
  phone             String?
  taxNote           String   // "Платник єдиного податку 3 групи, не платник ПДВ"
  defaultDueDays    Int      @default(7)
  nextInvoiceNumber Int      @default(1)
}

model Client {
  id         String    @id @default(cuid())
  userId     String
  name       String
  taxId      String?   // ЄДРПОУ (8) або РНОКПП (10)
  email      String
  address    String?
  notes      String?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  invoices   Invoice[]
  @@index([userId])
}

model Invoice {
  id             String        @id @default(cuid())
  userId         String
  clientId       String
  number         Int?          // присвоюється при виставленні
  status         InvoiceStatus @default(DRAFT)
  currency       Currency      @default(UAH)
  issueDate      DateTime?     @db.Date   // ставиться при виставленні
  dueDate        DateTime      @db.Date
  contractRef    String?       // "Договір № 7 від 01.09.2026"
  total          Int           // копійки
  notes          String?
  paymentPurpose String?       // формується при виставленні
  publicToken    String?       @unique    // nanoid(24), з'являється при виставленні
  sellerSnapshot Json?         // реквізити ФОП на момент виставлення
  clientSnapshot Json?         // реквізити клієнта на момент виставлення
  issuedAt       DateTime?
  viewedAt       DateTime?
  paidAt         DateTime?
  cancelledAt    DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  items          InvoiceItem[]
  payments       Payment[]
  events         InvoiceEvent[]
  @@unique([userId, number])
  @@index([userId, status])
}

model InvoiceItem {
  id                 String @id @default(cuid())
  invoiceId          String
  position           Int
  description        String
  unit               String // "послуга" | "год" | "шт" | "міс"
  quantityHundredths Int    // 1,5 → 150
  unitPrice          Int    // копійки
  amount             Int    // копійки, округлено
}

model Payment {
  id                String          @id @default(cuid())
  invoiceId         String
  provider          PaymentProvider
  status            PaymentStatus   @default(PENDING)
  amount            Int
  currency          Currency        @default(UAH)
  externalId        String?         // invoiceId у monobank
  checkoutUrl       String?
  failureReason     String?
  expiresAt         DateTime?       // «живий» PENDING-платіж (~1 год)
  providerUpdatedAt DateTime?       // відкидаємо застарілі вебхуки
  paidAt            DateTime?
  createdAt         DateTime        @default(now())
  @@unique([provider, externalId])
  @@index([invoiceId, status])
}

model WebhookEvent {
  id          String          @id @default(cuid())
  provider    PaymentProvider
  dedupeKey   String          // mock: eventId; monobank: invoiceId:status:modifiedDate
  payload     Json
  receivedAt  DateTime        @default(now())
  processedAt DateTime?
  @@unique([provider, dedupeKey])
}

model InvoiceEvent {
  id        String           @id @default(cuid())
  invoiceId String
  type      InvoiceEventType
  meta      Json?
  createdAt DateTime         @default(now())
}
```
- **Гроші й кількість — `Int`:** без похибок float і без проблем із серіалізацією `Decimal` у Client Components.
- **Знімки реквізитів:** якщо фрилансер змінить IBAN, уже надіслані рахунки лишаються незмінними.
- **Дати `@db.Date`:** зберігаємо як UTC-північ календарного дня за Києвом; «сьогодні» рахуємо через dayjs `tz('Europe/Kyiv')`;
  показуємо з `timeZone: 'UTC'`, щоб дата не «з'їжджала» (`lib/dates.ts`).

### 5.5 Життєвий цикл рахунку
```
DRAFT ──issue──► SENT ──applyPaymentUpdate(SUCCEEDED) / ручна позначка──► PAID
  │                │
  └─ delete        └─ cancel ──► CANCELLED   (PENDING-платежі → EXPIRED)
```
**Статуси для відображення** обчислює `getDisplayStatus(invoice, today)`, у БД їх не зберігаємо:
Чернетка · Виставлено · Переглянуто (`SENT` + `viewedAt`) · Прострочено (`SENT` + `dueDate` < сьогодні за Києвом) · Оплачено · Скасовано.

**Виставлення — одна транзакція:** атомарний інкремент `nextInvoiceNumber` (`UPDATE … RETURNING`) → номер, `issueDate`,
`paymentPurpose`, знімки, `publicToken`, `status = SENT`, подія `ISSUED` → після коміту `inngest.send('invoice/issued')`.

**`viewedAt`:** ставить клієнтський компонент `<MarkViewed token>` через Server Action у `useEffect`, а не серверний рендер.
Так прев'ю посилань у Telegram/Viber не позначають рахунок як переглянутий. Перегляд власником рахунку не враховується.

### 5.6 Потік оплати
**1. Старт — `startPayment(token)` (Server Action):**
- транзакція: `SELECT … FOR UPDATE` на рядок рахунку → рахунок має бути `SENT` → якщо є `PENDING`-платіж з `expiresAt > now` —
  повертаємо його `checkoutUrl`; прострочені `PENDING` → `EXPIRED`; інакше створюємо `Payment(PENDING, expiresAt = now + 1 год)`;
- **після коміту** — `provider.createCheckout({ paymentId, … })` → зберегти `externalId`, `checkoutUrl`, подія `PAYMENT_STARTED`;
  помилка провайдера → `Payment FAILED` + Snackbar;
- `redirect(checkoutUrl)` — поза `try/catch`.

**2. Checkout:**
- **Mock:** `/pay/mock/[paymentId]` ще раз перевіряє, що рахунок `SENT`, а платіж `PENDING` (інакше «Платіж неактуальний»).
  Картка `4242 4242 4242 4242` — успіх, `4000 0000 0000 0002` — відмова. Сервер підписує payload HMAC-SHA256 (`MOCK_WEBHOOK_SECRET`)
  і надсилає POST на `/api/webhooks/mock`, потім redirect на `/i/[token]?payment=[id]`.
- **Monobank:** `POST /api/merchant/invoice/create` (`amount` у копійках, `ccy: 980`, `validity: 3600`,
  `merchantPaymInfo: { reference: paymentId, destination: purpose }`, `redirectUrl`, `webHookUrl` — лише якщо задано `PUBLIC_URL`)
  → redirect на `pageUrl`. Після повернення на `redirectUrl` — **звірка** через `GET /api/merchant/invoice/status` (працює без тунелю).

**3. `applyPaymentUpdate(update)` — єдина точка для вебхуків і звірки:**
- **одна транзакція:** вставка `WebhookEvent` (якщо вже є з `processedAt` → вихід без змін) + зміна статусу платежу + рахунку
  + подія + `processedAt`. Якщо обробка впала — транзакція відкочується, і повторна доставка обробиться заново;
- статуси платежу рухаються лише вперед: `PENDING → SUCCEEDED | FAILED | EXPIRED`, `SUCCEEDED → REFUNDED`;
- застарілі події (`modifiedDate ≤ providerUpdatedAt`) відкидаються;
- **після коміту** — `inngest.send('invoice/paid')` у `try/catch` (застосунок працює і без Inngest).

**4. Крайові випадки** (вебхук завжди отримує 200, якщо подію прийнято):

| Ситуація | Реакція |
|---|---|
| Невалідний підпис | 401, нічого не пишемо (monobank: один раз перезапитати pubkey і перевірити ще раз) |
| Повторна доставка | `processedAt` уже є → 200 без змін |
| Сума/валюта ≠ рахунку | платіж `SUCCEEDED`, подія `AMOUNT_MISMATCH`, рахунок лишається `SENT`, фрилансер бачить попередження |
| Успішна оплата вже оплаченого/скасованого рахунку (дві вкладки, ручна позначка + картка) | платіж `SUCCEEDED`, подія `NEEDS_REFUND`, статус рахунку не змінюється |
| Скасування рахунку з `PENDING`-платежем | платежі → `EXPIRED`; monobank — `POST /api/merchant/invoice/remove` |
| monobank `reversed` | платіж `REFUNDED`, подія `REFUNDED` (повернення рахунку в `SENT` — P2) |
| Помилка обробки | 500 → провайдер повторить доставку |

Мапінг статусів monobank: `created/processing/hold` → `PENDING`, `success` → `SUCCEEDED`, `failure` → `FAILED`,
`expired` → `EXPIRED`, `reversed` → `REFUNDED`.

**5. Сторінка після повернення** показує статус **з БД**. Поки платіж `PENDING` — «Обробляємо платіж…» з автооновленням
(`router.refresh()` кожні 2 с, до 60 с).

```ts
interface PaymentProvider {
  id: 'MOCK' | 'MONOBANK';
  createCheckout(input: {
    paymentId: string; amount: number; reference: string; purpose: string;
    redirectUrl: string; webhookUrl?: string;
  }): Promise<{ externalId: string; checkoutUrl: string }>;
  verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<ProviderPaymentUpdate>; // кидає помилку при невалідному підписі
  fetchStatus?(externalId: string): Promise<ProviderPaymentUpdate>;                        // звірка
  cancel?(externalId: string): Promise<void>;
}
```
Провайдер: `PAYMENT_PROVIDER=mock|monobank` (за замовчуванням `mock`; `monobank` — лише за наявності `MONOBANK_TOKEN`).
Підпис monobank: ECDSA-SHA256 над **сирим** тілом (`await req.text()`), заголовок `X-Sign`, ключ з `GET /api/merchant/pubkey` (кешується).

### 5.7 Фонові задачі (Inngest, SDK v4)
- **`invoice/issued`** → `step.run('send-invoice-email')` → `step.sleepUntil(dueDate − 1 день, 10:00 Київ)` → `step.run` читає
  статус і, якщо не оплачено, надсилає нагадування → `step.sleepUntil(dueDate + 1 день)` → лист про прострочення клієнту й
  сповіщення фрилансеру. `cancelOn: invoice/paid, invoice/cancelled` (збіг за `data.invoiceId`).
  **Якщо момент нагадування вже минув — крок пропускається** (інакше `sleepUntil` спрацює одразу).
- **`invoice/paid`** → підтвердження оплати клієнту + «Вам оплатили» фрилансеру.
- **`invoice/reminder.requested`** → ручне «Нагадати» з інтерфейсу.
- **`REMINDER_DEMO_MODE=true`** → нагадування через 1 і 2 хвилини замість днів (для демонстрації).
- Усі `inngest.send` — у `try/catch` з логуванням: без Dev Server застосунок працює, лише без листів.

### 5.8 Безпека
- Публічне посилання — `nanoid(24)`, а не ID з БД; `robots: noindex`; на сторінці лише дані рахунку.
- Скасований рахунок або невідомий токен → `not-found` («Рахунок скасовано або посилання недійсне»).
- Усі приватні запити — `where: { id, userId }`; Server Actions самі перевіряють сесію.
- Вебхуки: підпис по сирому тілу, транзакційна дедуплікація, звірка суми й валюти, відкидання застарілих подій.
- Zod-валідація всіх вхідних даних, у т.ч. змінних оточення (`src/lib/env.ts`).
- Секрети — лише в `.env`; у репозиторії — `.env.example`. «Демо-вхід» — лише при `DEMO_MODE=true`.
- P2: rate limit через Redis на `/i/*` і `/api/webhooks/*`.

---

## 6. Як виглядатиме застосунок

### 6.1 Візуальний стиль
- Чистий fintech-стиль: багато білого простору, монохромна база й синій акцент.
- Primary `#0057B8`, фон `#F6F7F9`, білі картки, радіус 12px, мінімальні тіні; шрифт Inter або Roboto з кирилицею через `next/font`.
- **Чипи статусів:** Чернетка (сірий) · Виставлено (синій) · Переглянуто (фіолетовий) · Прострочено (червоний) · Оплачено (зелений) · Скасовано (сірий, outlined).
- Гроші: `12 500,00 ₴`; дати: `16.11.2026`; у документі — `16 листопада 2026 р.`
- Приватна зона — desktop-first (працює й на планшеті); **публічна сторінка оплати — mobile-first** (перевірка на 375px).

### 6.2 Карта сторінок
| Маршрут | Хто | Що |
|---|---|---|
| `/` | усі | лендінг: цінність, «Спробувати», «Демо-вхід» |
| `/login`, `/register` | гість | вхід і реєстрація |
| `/dashboard` | фрилансер | KPI, графік надходжень, останні рахунки |
| `/invoices` | фрилансер | список, вкладки статусів, пошук |
| `/invoices/new` | фрилансер | редактор нового рахунку |
| `/invoices/[id]` | фрилансер | DRAFT → редактор; інакше — документ, дії, історія, платежі |
| `/clients` | фрилансер | клієнти (діалог створення/редагування) |
| `/settings` | фрилансер | реквізити ФОП, налаштування рахунків |
| `/i/[token]` | клієнт | публічний рахунок і оплата |
| `/i/[token]/pdf` | будь-хто з посиланням | PDF (Route Handler) |
| `/pay/mock/[paymentId]` | клієнт | імітація платіжної сторінки |
| `/api/auth/[...all]`, `/api/inngest`, `/api/webhooks/*` | система | auth, Inngest, вебхуки |

### 6.3 Вайрфрейми

**Дашборд**
```
┌───────────────┬──────────────────────────────────────────────────────────────┐
│ ◧ Freelance   │  Дашборд                                   [ + Новий рахунок ] │
│   Invoices    ├──────────────────────────────────────────────────────────────┤
│               │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│ ▸ Дашборд     │ │ Очікується    │ │ Прострочено   │ │ Отримано      │         │
│   Рахунки     │ │ 48 300,00 ₴   │ │ 12 000,00 ₴   │ │ 95 750,00 ₴   │         │
│   Клієнти     │ │ 4 рахунки     │ │ 1 рахунок     │ │ цього місяця  │         │
│   Налаштування│ └───────────────┘ └───────────────┘ └───────────────┘         │
│               │  Надходження за 6 місяців   ▁ ▃ ▅ ▂ ▆ █                       │
│               │  Останні рахунки                                              │
│               │  № 14  ТОВ «Альфа»      12 000,00 ₴  до 20.11  [Переглянуто]   │
│               │  № 13  ФОП Петренко      6 500,00 ₴  до 10.11  [Прострочено]   │
│ Олена І.  ⏻   │  № 12  Studio Beta      30 000,00 ₴  16.11     [Оплачено]      │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

**Редактор рахунку**
```
Новий рахунок                                    [Зберегти чернетку] [Виставити]
Клієнт: [ ТОВ «Альфа»        ▾ ] (+ новий)      Оплатити до: [ 23.11.2026 ]
Підстава: [ Договір № 7 від 01.09.2026 ]        (необов'язково)
┌───┬──────────────────────────┬─────────┬───────┬───────────┬───────────┬───┐
│ # │ Опис                     │ Од.     │ К-сть │ Ціна, ₴   │ Сума, ₴   │   │
│ 1 │ Дизайн лендінгу          │ послуга │ 1     │ 25 000,00 │ 25 000,00 │ ✕ │
│ 2 │ Правки                   │ год     │ 3,5   │  1 000,00 │  3 500,00 │ ✕ │
└───┴──────────────────────────┴─────────┴───────┴───────────┴───────────┴───┘
[ + Додати позицію ]
                                            Разом до сплати: 28 500,00 ₴
                  Двадцять вісім тисяч п'ятсот гривень 00 копійок. Без ПДВ
Примітка для клієнта: [ ...................................... ]
```

**Сторінка рахунку (фрилансер)**
```
← Рахунки    Рахунок на оплату № 14    [Переглянуто]
[Копіювати посилання] [Нагадати] [PDF] [Позначити оплаченим] [⋯ Дублювати / Скасувати]
┌────────────── InvoiceDocument ────────────────┐  ┌─── Історія ─────────────────────┐
│  (той самий компонент, що й на публічній      │  │ ● 16.11 10:02  Створено          │
│   сторінці)                                   │  │ ● 16.11 10:05  Виставлено, email │
│                                               │  │ ● 16.11 12:40  Переглянуто       │
│                                               │  │ ○ 22.11 10:00  Нагадування (план)│
└───────────────────────────────────────────────┘  │ Платежі: —                       │
                                                   └──────────────────────────────────┘
```

**Публічна сторінка оплати** (desktop; на мобільному блок оплати зверху, кнопка «Оплатити» закріплена знизу)
```
┌───────────────────────────────────────────────┬─────────────────────────────┐
│ РАХУНОК НА ОПЛАТУ № 14                        │  До сплати                   │
│ від 16 листопада 2026 р.                      │  28 500,00 ₴                 │
│ Постачальник: ФОП Іваненко О.П.               │  до 23.11.2026               │
│ РНОКПП 1234567890 · IBAN UA21 3223 1300 …     │  [  Оплатити карткою  ]      │
│ Платник: ТОВ «Альфа», ЄДРПОУ 12345678         │  ──── або переказом ────     │
│ Підстава: Договір № 7 від 01.09.2026          │  ┌────────┐ Скануйте QR у    │
│ ───────────────────────────────────────────── │  │ ▓▓ ₴ ▓▓│ застосунку банку │
│ 1. Дизайн лендінгу   1 посл.    25 000,00     │  └────────┘                  │
│ 2. Правки            3,5 год     3 500,00     │  IBAN         UA21…    [⧉]   │
│ Разом: 28 500,00 ₴                            │  Призначення  …        [⧉]   │
│ (Двадцять вісім тисяч п'ятсот гривень…)       │                              │
│ Без ПДВ                [ ⬇ Завантажити PDF ]  │                              │
└───────────────────────────────────────────────┴─────────────────────────────┘
PENDING:  ⏳ «Обробляємо платіж…» (автооновлення)
PAID:     ✓ «Оплачено 16.11.2026 о 14:32. Дякуємо!» — кнопки оплати зникають
```

**Mock checkout**
```
┌────────────── Mock Pay · тестовий режим ──────────────┐
│ Рахунок № 14 · ФОП Іваненко О.П.                       │
│ Сума: 28 500,00 ₴                                      │
│ Номер картки [ 4242 4242 4242 4242 ]                   │
│ Термін [ 12/30 ]    CVV [ 123 ]                        │
│ 4242… — успіх · 4000 0000 0000 0002 — відмова          │
│ [ Оплатити 28 500,00 ₴ ]          [ Скасувати ]        │
└────────────────────────────────────────────────────────┘
```

### 6.4 Документ «Рахунок на оплату»: обов'язкові реквізити
- назва й номер (наскрізна нумерація), дата складання;
- постачальник: ПІБ ФОП, РНОКПП, адреса, статус платника податку;
- банківські реквізити: IBAN, банк, отримувач;
- покупець: назва, код (ЄДРПОУ/РНОКПП), адреса; підстава (договір), якщо є;
- позиції: опис, одиниця виміру, кількість, ціна, сума;
- «Разом до сплати: … (сума прописом). Без ПДВ»;
- «Рахунок дійсний до …» і призначення платежу для копіювання;
- підпис — ПІБ фрилансера (КЕП поза межами MVP). Печатка не обов'язкова ні для ФОП, ні для ТОВ.

---

## 7. Доменні утиліти (`src/lib`, усі з unit-тестами)
- **`money.ts`** — `parseMoney('12 500,50') → 1250050` (кома й крапка), `formatMoney(1250050) → '12 500,50 ₴'`.
- **`invoice-calc.ts`** — `calcLine(quantityHundredths, unitPrice)` = `round(q × p / 100)`, `calcTotal(items)`.
- **`amount-in-words.ts`** — `amountInWordsUk(2850000) → 'Двадцять вісім тисяч п'ятсот гривень 00 копійок'`:
  жіночий рід для гривні й тисячі (одна/дві), відмінювання 1 / 2–4 / 5–20 (з винятком 11–14), тисячі, мільйони.
- **`iban.ts`** — формат `UA` + 27 цифр, контрольна сума mod-97, форматування групами по 4.
- **`tax-id.ts`** — РНОКПП: 10 цифр + контрольна сума (P0); ЄДРПОУ: 8 цифр (контрольна сума — P2).
- **`nbu-qr.ts`** — `buildNbuQrUrl({ recipient, iban, amount, taxId, purpose })`: **формат 002** (`BCD`/`002`/кодування/`UCT`/…,
  base64url, префікс `https://bank.gov.ua/qr/`) — його читають застосунки всіх банків; 003 банки підтримують ще не повністю.
  Перед реалізацією звірити з офіційними Правилами НБУ (постанова № 97 від 19.08.2025): порядок полів, байт кодування
  (UTF-8 чи Win-1251), обмеження довжини, вимоги до зображення (рівень корекції помилок, знак ₴ у центрі).
  **Перевірити сканом у monobank і Приват24.**
- **`invoice-status.ts`** — `getDisplayStatus()`, `assertTransition(from, to)`.
- **`payment-purpose.ts`** — «Оплата за послуги згідно з рахунком № 14 від 16.11.2026 р., без ПДВ».
- **`dates.ts`** — «сьогодні» за Києвом, перетворення для `@db.Date`, форматування.

---

## 8. План розробки та оцінка часу

**Разом ≈ 35 годин роботи + ~5 год буфера ≈ 4 насичені дні.** Гарантована точка — **тег `v0.1-demo` наприкінці Дня 3**:
повний сценарій з Mock-оплатою, QR, PDF, листами, seed та інструкцією запуску. День 4 — P1.

### День 1 — Фундамент (≈ 9.5 год)
| Задача | Год |
|---|---|
| Ініціалізація: `create-next-app` **у тимчасову теку** (він не працює в непорожній, а тут уже є CLAUDE.md) → перенести файли; pnpm, `.nvmrc`, strict tsconfig, `eslint .`, Prettier; `git init`, `.gitignore` з `NOTES.local.md` | 0.75 |
| Docker Compose (postgres :5433, mailpit, inngest), `.env.example`, `env.ts`, каркас README | 1 |
| Prisma 7: генератор з `output`, `prisma.config.ts` (dotenv, seed), adapter-pg, схема, міграція, `db.ts` | 1.5 |
| MUI v9: `AppRouterCacheProvider`, тема, `ukUA`, обгортка `Link`, layout із сайдбаром, Snackbar-провайдер | 2 |
| Better Auth: email+пароль, `nextCookies()`, login/register, захист `(app)`, «Демо-вхід» | 2.25 |
| Налаштування ФОП: форма + `iban.ts`, `tax-id.ts` (контрольні суми) + тести | 1 |
| Клієнти: список, діалог створення/редагування, архівація, порожній стан | 1 |

**Готово, коли:** з чистого клону працюють `pnpm bootstrap` + `pnpm dev`; можна зареєструватися, заповнити реквізити, додати клієнта.

### День 2 — Рахунки (≈ 9.5 год)
| Задача | Год |
|---|---|
| `lib`: money, invoice-calc, amount-in-words, invoice-status, payment-purpose, dates + тести | 2 |
| Редактор (новий + DRAFT): RHF + `useFieldArray` + MUI + DatePicker, введення з комою, живий підсумок, сума прописом | 4.5 |
| Список рахунків: вкладки статусів, пошук, порожній стан | 0.5 |
| Сторінка рахунку: `InvoiceDocument`, історія, дії | 1 |
| Виставлення (транзакція), скасування, дублювання, ручна оплата | 1 |
| Seed демо-даних | 0.5 |

**Готово, коли:** працює повний життєвий цикл рахунку без онлайн-оплати; seed дає «живий» список.

### День 3 — Клієнтська частина й оплата (≈ 8.5 год) → тег `v0.1-demo`
| Задача | Год |
|---|---|
| Публічна сторінка `/i/[token]`: адаптив, `not-found`, `<MarkViewed>`, копіювання реквізитів | 1.5 |
| QR НБУ: `nbu-qr.ts` + тест + перевірка сканом | 1 |
| PDF з кирилицею (`@react-pdf/renderer`, Route Handler, `serverExternalPackages`) | 1.5 |
| Платежі: `startPayment`, `applyPaymentUpdate`, MockProvider, `/pay/mock`, HMAC-вебхук, крайові випадки, стан «Обробляємо…», тести | 3.5 |
| Mailer + React Email: рахунок, підтвердження оплати, «Вам оплатили» (поки синхронно) | 1 |

**Готово, коли:** клієнт оплачує за посиланням, і рахунок стає «Оплачено» **лише через вебхук**. README з інструкцією актуальний.

### День 4 — P1 і здача (≈ 8 год)
| Задача | Год |
|---|---|
| Inngest: client, `/api/inngest`, функції issued / paid / reminder з `cancelOn`; листи переїжджають у фон | 1.5 |
| Дашборд: KPI + графік (MUI X Charts) | 1.5 |
| README (скріншоти/GIF, використані шаблони й бібліотеки, як використовувався AI), CI, перевірка з чистого клону | 2 |
| Monobank Acquiring (**не більше 3 год**): провайдер, ECDSA-вебхук, звірка статусу, скасування, sandbox | 3 |

### Ризики
- **Monobank sandbox:** тестовий токен — на api.monobank.ua (вхід через застосунок monobank). На localhost вебхук не прийде без
  тунелю → звірка статусу після повернення як основний локальний шлях.
- **react-pdf + кирилиця:** лише TTF/WOFF з кирилицею, абсолютний шлях (`process.cwd()`), реєстрація шрифту один раз у модулі.
- **MUI v9 + Next 16:** межа Server/Client, обгортка `next/link` — за офіційним гайдом інтеграції.
- **Better Auth + Prisma 7** (клієнт у `src/generated`) — перевірити адаптер у першу годину роботи з auth.
- **QR НБУ:** формат перевіряти лише сканом справжнім банківським застосунком.
- **Inngest у Docker на Linux:** `extra_hosts: ["host.docker.internal:host-gateway"]`.

### План скорочення (якщо відстаю, у такому порядку)
1. Monobank → лише Mock (інтерфейс готовий; у README — «наступний крок»).
2. Графік на дашборді → лише KPI-картки.
3. Нагадування Inngest → лише відправка листів у фоні.
4. CI.

### Приклад історії комітів
`chore: init next.js 16 app with strict typescript` → `chore: docker compose (postgres, mailpit, inngest)` →
`feat(db): prisma 7 schema` → `feat(auth): email/password auth with better-auth` → `feat(profile): business details with iban/rnokpp validation` →
`feat(clients): crud` → `test(lib): amount in words (uk)` → `feat(invoices): draft editor with live totals` →
`feat(invoices): issue with atomic numbering and snapshots` → `chore: seed demo data` → `feat(public): invoice page with nbu qr` →
`feat(pdf): invoice pdf with cyrillic font` → `feat(payments): mock provider with signed webhooks` → `feat(email): invoice and payment emails` →
`feat(jobs): inngest reminders with cancelOn` → `feat(dashboard): kpi and revenue chart` → `feat(payments): monobank acquiring adapter` →
`ci: lint, typecheck, test` → `docs: readme with screenshots`

---

## 9. Запуск локально (основа для README)
```bash
git clone <repo> && cd freelance-invoices
nvm use                         # Node 24
cp .env.example .env
pnpm install
pnpm bootstrap                  # docker compose up -d --wait (healthcheck postgres) + prisma migrate deploy + seed
pnpm dev                        # http://localhost:3000
```
- Демо-акаунт: `demo@freelance.local` / `demo12345` (або кнопка «Демо-вхід»).
- Листи: http://localhost:8025 (Mailpit) · фонові задачі: http://localhost:8288 (Inngest Dev Server).
- Monobank (необов'язково): `PAYMENT_PROVIDER=monobank`, `MONOBANK_TOKEN=<тестовий токен з api.monobank.ua>`,
  `PUBLIC_URL=<https-тунель>` — лише якщо потрібні вебхуки (без нього працює звірка статусу).

```dotenv
# .env.example
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/invoices
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
DEMO_MODE=true
SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM="Freelance Invoices <no-reply@freelance.local>"
INNGEST_DEV=1
REMINDER_DEMO_MODE=false
PAYMENT_PROVIDER=mock
MOCK_WEBHOOK_SECRET=dev-secret
MONOBANK_TOKEN=
PUBLIC_URL=
```

**Без Docker (лише для швидкої перевірки під час розробки):** `npx prisma dev -n fi-verify -d` піднімає локальний Postgres (PGlite);
далі `DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable'` для `prisma migrate deploy` і `pnpm dev`.
Mailpit та Inngest у цьому режимі недоступні.

**Скрипти `package.json`:** `dev`, `build`, `start`, `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test`, `test:watch`, `format`,
`bootstrap`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`, `postinstall` (`prisma generate`).
(Не `setup` — у pnpm це вбудована команда.)

---

## 10. Тестування
- **Unit (Vitest), `lib/*`:** гроші (парсинг з комою/крапкою), підсумки й округлення, сума прописом (0, 1, 2, 5, 11, 14, 21, 1 000,
  2 001, 1 000 000, копійки), IBAN і РНОКПП (валідні/невалідні), QR НБУ (payload), статуси й переходи, дати за Києвом.
- **Сервісний рівень, `applyPaymentUpdate`:** валідний/невалідний підпис, повторна доставка, падіння посередині (подія не губиться),
  розбіжність суми, застаріла подія, оплата скасованого / вже оплаченого рахунку, `reversed`.
- **Виставлення:** паралельне виставлення двох рахунків не дає однакових номерів.
- **CI (GitHub Actions):** install → lint → typecheck → test. Playwright — P2.

---

## 11. Ручний E2E-чекліст (він же сценарій демо)
1. Лендінг → «Демо-вхід» → дашборд із seed-даними.
2. Новий рахунок для ТОВ «Альфа»: 2 позиції, живий підсумок, сума прописом → «Виставити» → номер, посилання.
3. Mailpit: лист клієнту з посиланням.
4. Посилання в інкогніто й на телефоні (375px): документ, PDF, QR НБУ (скан застосунком банку відкриває платіж із реквізитами).
5. Картка `4000 0000 0000 0002` → відмова; `4242 4242 4242 4242` → успіх → «Оплачено».
6. У фрилансера: статус, історія (переглянуто → оплачено), лист «Вам оплатили»; в Inngest UI run нагадувань скасовано подією `invoice/paid`.
7. `REMINDER_DEMO_MODE=true`: виставити рахунок і за 1–2 хв побачити нагадування в Mailpit.
8. (Якщо зроблено) оплата через monobank sandbox.
9. Скасувати рахунок → публічне посилання показує «Рахунок скасовано».

---

## 12. Джерела
- Завдання: https://github.com/eloicompany/vacancy-product-task
- Doc2Pay: https://doc2pay.com.ua · реквізити рахунку: https://doc2pay.com.ua/blog/rakhunok-faktura-zrazok
- QR НБУ: https://bank.gov.ua/ua/payments/use-qr · Правила (постанова № 97): https://bank.gov.ua/admin_uploads/law/19082025_97.pdf
- Monobank Acquiring: https://api.monobank.ua/docs/acquiring.html
- Prisma 7: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- MUI + Next.js: https://mui.com/material-ui/integrations/nextjs/
- Better Auth: https://www.better-auth.com/docs
- Inngest + Next.js: https://www.inngest.com/docs/getting-started/nextjs-quick-start
