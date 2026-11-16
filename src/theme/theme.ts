'use client';
import { createTheme } from '@mui/material/styles';
import { ukUA } from '@mui/material/locale';

const theme = createTheme(
  {
    cssVariables: true,
    palette: {
      primary: { main: '#0057B8' },
      secondary: { main: '#5B6B7F' },
      background: { default: '#F6F7F9', paper: '#FFFFFF' },
      success: { main: '#1E8E3E' },
      error: { main: '#D93025' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiTextField: { defaultProps: { fullWidth: true } },
    },
  },
  ukUA,
);

export default theme;
