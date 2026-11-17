import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: 1.5 }}>
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
            Freelance Invoices
          </Typography>
        </Container>
      </Box>
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <Container maxWidth="lg" component="footer" sx={{ py: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Рахунок сформовано в Freelance Invoices. Оплата переказом — за реквізитами постачальника.
        </Typography>
      </Container>
    </Box>
  );
}
