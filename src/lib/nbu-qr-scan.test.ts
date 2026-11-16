import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { buildNbuQrUrl, buildQrMatrix } from './nbu-qr';

const SCALE = 6;
const QUIET = 4;

/**
 * Растеризує матрицю так, як її малює NbuQrCode: біле коло в центрі (+ темний квадрат на місці знака ₴
 * як найгірший випадок) і перевіряє, що незалежний декодер прочитає посилання.
 */
function rasterize(text: string) {
  const m = buildQrMatrix(text);
  const modules = m.size + QUIET * 2;
  const px = modules * SCALE;
  const data = new Uint8ClampedArray(px * px * 4);
  const center = modules / 2;
  const circleR = m.circleDiameter / 2;
  const signHalf = (m.circleDiameter - 4) / 2 / Math.SQRT2;

  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const mx = x / SCALE;
      const my = y / SCALE;
      const col = Math.floor(mx) - QUIET;
      const row = Math.floor(my) - QUIET;
      let dark = row >= 0 && col >= 0 && row < m.size && col < m.size && m.isDark(row, col);
      if (Math.hypot(mx - center, my - center) <= circleR) dark = false;
      if (Math.abs(mx - center) <= signHalf * 0.6 && Math.abs(my - center) <= signHalf) dark = true;
      const v = dark ? 0 : 255;
      const i = (y * px + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, px };
}

describe('NBU QR з колом і знаком гривні', () => {
  it.each([
    ['короткі дані (мінімальна версія 10)', 'Оплата'],
    ['типовий рахунок', 'Оплата за послуги згідно з рахунком № 14 від 16.11.2026 р., без ПДВ'],
    ['довге призначення', 'Оплата за послуги з розробки дизайну мобільного застосунку згідно з договором № 7 від 01.09.2026 та рахунком № 140 від 16.11.2026 р., без ПДВ'],
  ])('%s — зчитується декодером', (_, purpose) => {
    const url = buildNbuQrUrl({
      recipient: 'ФОП Іваненко Олена Петрівна',
      iban: 'UA573220010000026007233566001',
      recipientCode: '1234567899',
      purpose,
      amount: 2_850_000,
    });
    const { data, px } = rasterize(url);
    expect(jsQR(data, px, px)?.data).toBe(url);
  });
});
