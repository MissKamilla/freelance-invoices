'use client';
import 'dayjs/locale/uk';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ukUA } from '@mui/x-date-pickers/locales';

const localeText = ukUA.components.MuiLocalizationProvider.defaultProps.localeText;

export function DatePickersProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="uk" localeText={localeText}>
      {children}
    </LocalizationProvider>
  );
}
