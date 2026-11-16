import 'server-only';
import { buildQrMatrix } from '@/lib/nbu-qr';

const QUIET_ZONE = 4;

/**
 * Платіжний QR НБУ у вигляді SVG: модулі одним path, у центрі — знак гривні на білому колі
 * (діаметр кола за п. 11, знак на 4 модулі менший — п. 12 додатка 1 до Правил).
 */
export function NbuQrCode({ url, size = 220, title }: { url: string; size?: number; title: string }) {
  const matrix = buildQrMatrix(url);
  const total = matrix.size + QUIET_ZONE * 2;

  let path = '';
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }

  const center = total / 2;
  const signDiameter = matrix.circleDiameter - 4;

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ display: 'block', background: '#fff' }}
    >
      <title>{title}</title>
      <rect width={total} height={total} fill="#fff" />
      <path d={path} fill="#000" />
      <circle cx={center} cy={center} r={matrix.circleDiameter / 2} fill="#fff" />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={signDiameter}
        fontWeight={700}
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#000"
      >
        ₴
      </text>
    </svg>
  );
}
