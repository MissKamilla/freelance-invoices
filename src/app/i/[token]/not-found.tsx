import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function InvoiceNotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Stack spacing={1.5} sx={{ textAlign: 'center' }}>
        <Typography variant="h5" component="h1">
          Рахунок скасовано або посилання недійсне
        </Typography>
        <Typography color="text.secondary">
          Зверніться до постачальника, щоб отримати актуальне посилання на оплату.
        </Typography>
      </Stack>
    </Container>
  );
}
