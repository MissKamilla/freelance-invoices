# Freelance Invoices

Рахунки й оплати для фрилансерів-ФОП: фрилансер виставляє рахунок з усіма реквізитами, клієнт відкриває посилання
й оплачує карткою або QR-кодом НБУ у застосунку свого банку.

> Статус: у розробці.

## Запуск локально

Потрібні Node 24 (`.nvmrc`), pnpm і Docker.

```bash
cp .env.example .env
pnpm install
docker compose up -d --wait   # postgres :5433 · mailpit :8025 · inngest :8288
pnpm dev                      # http://localhost:3000
```

- Листи: http://localhost:8025 (Mailpit)
- Фонові задачі: http://localhost:8288 (Inngest Dev Server)

## Стек

Next.js 16 (App Router) · TypeScript (strict) · MUI · Prisma 7 + PostgreSQL · Better Auth · Inngest · Zod · Vitest · Docker Compose

## Використані шаблони

- Каркас застосунку згенеровано `create-next-app` 16.4.6.
