import 'server-only';
import { db } from '@/lib/db';
import { atKyivTime, fromIsoDate } from '@/lib/dates';
import { lastMonthKeys, monthKeyLabel, monthlyTotals } from '@/lib/revenue';

const CHART_MONTHS = 6;

export async function getDashboard(userId: string, today: Date) {
  const months = lastMonthKeys(today, CHART_MONTHS);
  const monthStart = (key: string) => atKyivTime(fromIsoDate(`${key}-01`), 0);
  const currentMonthStart = monthStart(months[months.length - 1]!);
  const chartStart = monthStart(months[0]!);

  const [outstanding, overdue, paidThisMonth, paidForChart, recent, profile] = await Promise.all([
    db.invoice.aggregate({ where: { userId, status: 'SENT' }, _sum: { total: true }, _count: true }),
    db.invoice.aggregate({
      where: { userId, status: 'SENT', dueDate: { lt: today } },
      _sum: { total: true },
      _count: true,
    }),
    db.invoice.aggregate({
      where: { userId, status: 'PAID', paidAt: { gte: currentMonthStart } },
      _sum: { total: true },
      _count: true,
    }),
    db.invoice.findMany({
      where: { userId, status: 'PAID', paidAt: { gte: chartStart } },
      select: { paidAt: true, total: true },
    }),
    db.invoice.findMany({
      where: { userId, status: { not: 'DRAFT' } },
      orderBy: { issuedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        number: true,
        status: true,
        dueDate: true,
        viewedAt: true,
        total: true,
        client: { select: { name: true } },
      },
    }),
    db.businessProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);

  const totals = monthlyTotals(
    paidForChart.flatMap((p) => (p.paidAt ? [{ paidAt: p.paidAt, total: p.total }] : [])),
    months,
  );

  return {
    hasProfile: Boolean(profile),
    outstanding: { total: outstanding._sum.total ?? 0, count: outstanding._count },
    overdue: { total: overdue._sum.total ?? 0, count: overdue._count },
    paidThisMonth: { total: paidThisMonth._sum.total ?? 0, count: paidThisMonth._count },
    chart: months.map((key, i) => ({ label: monthKeyLabel(key), total: totals[i] ?? 0 })),
    recent,
  };
}
