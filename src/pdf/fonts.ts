import 'server-only';
import path from 'node:path';
import { Font } from '@react-pdf/renderer';

// PT Sans (ParaType, SIL OFL) — статичний TTF з повною кирилицею, «№» і «₴».
// Реєструємо один раз при завантаженні модуля, до першого рендеру.
const dir = path.join(process.cwd(), 'src/pdf/fonts');

Font.register({
  family: 'PT Sans',
  fonts: [
    { src: path.join(dir, 'PT_Sans-Web-Regular.ttf'), fontWeight: 400 },
    { src: path.join(dir, 'PT_Sans-Web-Bold.ttf'), fontWeight: 700 },
  ],
});

// Без переносів по складах: react-pdf за замовчуванням ріже українські слова некоректно.
Font.registerHyphenationCallback((word) => [word]);

export const PDF_FONT = 'PT Sans';
