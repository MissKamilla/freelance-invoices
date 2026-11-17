import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import Link from '@/components/Link';
import { DemoSignInButton } from '@/features/auth/components/AuthForms';
import { env } from '@/lib/env';

const features = [
  {
    icon: ReceiptLongOutlined,
    title: 'Рахунок з усіма реквізитами',
    text: 'РНОКПП, IBAN, сума прописом і призначення платежу — заповнюються автоматично з вашого профілю ФОП.',
  },
  {
    icon: QrCode2Outlined,
    title: 'Оплата за посиланням',
    text: 'Клієнт відкриває посилання й платить карткою або сканує QR-код НБУ у застосунку свого банку.',
  },
  {
    icon: NotificationsActiveOutlined,
    title: 'Статуси й нагадування',
    text: 'Видно, коли клієнт переглянув і оплатив рахунок. Нагадування про термін оплати надсилаються самі.',
  },
];

export default function LandingPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 12 } }}>
      <Stack spacing={3} sx={{ textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="overline" color="primary">
          Freelance Invoices
        </Typography>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 32, md: 48 } }}>
          Рахунок за хвилину — оплата в один клік
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 560 }}>
          Виставляйте рахунки клієнтам як ФОП і отримуйте оплату за посиланням — без Word, ручних
          підрахунків і переписування реквізитів.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={Link} href="/register" variant="contained" size="large">
            Спробувати
          </Button>
          <Button component={Link} href="/login" variant="outlined" size="large">
            Увійти
          </Button>
          {env.DEMO_MODE && <DemoSignInButton />}
        </Stack>
      </Stack>

      <Box
        sx={{
          mt: { xs: 6, md: 10 },
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {features.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardContent>
              <Icon color="primary" sx={{ mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {text}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
