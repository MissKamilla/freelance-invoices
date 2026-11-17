'use client';
import { BarChart } from '@mui/x-charts/BarChart';
import { formatMoney } from '@/lib/money';

/** Надходження за місяцями. Значення в копійках, підписи — у гривнях. */
export function RevenueChart({ data }: { data: { label: string; total: number }[] }) {
  return (
    <BarChart
      height={260}
      dataset={data}
      xAxis={[{ scaleType: 'band', dataKey: 'label' }]}
      yAxis={[{ valueFormatter: (v: number) => `${Math.round(v / 100_000)} тис.`, width: 56 }]}
      series={[{ dataKey: 'total', label: 'Отримано', color: '#0057B8', valueFormatter: (v) => formatMoney(v ?? 0) }]}
      hideLegend
      borderRadius={6}
      margin={{ left: 0, right: 8, top: 16, bottom: 0 }}
    />
  );
}
