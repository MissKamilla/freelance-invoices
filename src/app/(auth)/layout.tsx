import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Link from '@/components/Link';
import { getSession } from '@/lib/session';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect('/dashboard');

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          color="primary"
          sx={{ display: 'block', textAlign: 'center', mb: 3, textDecoration: 'none' }}
        >
          Freelance Invoices
        </Typography>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>{children}</CardContent>
        </Card>
      </Box>
    </Box>
  );
}
