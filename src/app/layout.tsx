import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme/theme';
import { SnackbarProvider } from '@/components/feedback/SnackbarProvider';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { default: 'Freelance Invoices', template: '%s · Freelance Invoices' },
  description: 'Рахунки й оплати для фрилансерів: виставте рахунок — клієнт оплатить за посиланням.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" className={inter.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider>{children}</SnackbarProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
