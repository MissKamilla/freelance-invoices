import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@/components/Link';

export default function NotFound() {
  return (
    <Stack
      spacing={2}
      sx={{ minHeight: '70vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 2 }}
    >
      <Typography variant="h3" component="h1" color="primary">
        404
      </Typography>
      <Typography variant="h6">Сторінку не знайдено</Typography>
      <Typography color="text.secondary">Можливо, посилання застаріло або містить помилку.</Typography>
      <Button component={Link} href="/" variant="outlined">
        На головну
      </Button>
    </Stack>
  );
}
