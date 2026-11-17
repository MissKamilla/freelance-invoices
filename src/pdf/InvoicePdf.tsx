import 'server-only';
import { Circle, Document, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { InvoiceView } from '@/features/invoices/view';
import { formatDate, formatDateLong } from '@/lib/dates';
import { formatIban } from '@/lib/iban';
import { formatAmount } from '@/lib/money';
import { buildNbuQrUrl, buildQrMatrix } from '@/lib/nbu-qr';
import { PDF_FONT } from './fonts';

const QR_SIZE = 110;
const QUIET = 4;

const s = StyleSheet.create({
  page: { fontFamily: PDF_FONT, fontSize: 10, padding: 40, color: '#1A1A1A', lineHeight: 1.35 },
  title: { fontSize: 16, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.6, marginBottom: 2 },
  muted: { color: '#5B6B7F' },
  row: { flexDirection: 'row' },
  parties: { flexDirection: 'row', gap: 24, marginTop: 18 },
  party: { flex: 1 },
  label: { fontSize: 8, color: '#5B6B7F', textTransform: 'uppercase', marginBottom: 2 },
  bold: { fontWeight: 700 },
  table: { marginTop: 16, borderTopWidth: 1, borderColor: '#D0D5DD' },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#D0D5DD', paddingVertical: 4, fontWeight: 700 },
  td: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#E4E7EC', paddingVertical: 4 },
  cNo: { width: 22 },
  cName: { flex: 1, paddingRight: 6 },
  cUnit: { width: 50 },
  cQty: { width: 44, textAlign: 'right' },
  cPrice: { width: 70, textAlign: 'right' },
  cSum: { width: 74, textAlign: 'right' },
  totals: { marginTop: 10, alignItems: 'flex-end' },
  total: { fontSize: 12, fontWeight: 700 },
  footer: { flexDirection: 'row', marginTop: 22, gap: 18, alignItems: 'flex-start' },
  qr: { width: QR_SIZE, height: QR_SIZE, position: 'relative' },
  qrSign: { position: 'absolute', top: 0, left: 0, width: QR_SIZE, height: QR_SIZE, textAlign: 'center', fontWeight: 700 },
});

function QrCode({ url }: { url: string }) {
  const m = buildQrMatrix(url);
  const total = m.size + QUIET * 2;
  let d = '';
  for (let row = 0; row < m.size; row++) {
    for (let col = 0; col < m.size; col++) {
      if (m.isDark(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
    }
  }
  const moduleSize = QR_SIZE / total;
  const signSize = (m.circleDiameter - 4) * moduleSize;

  return (
    <View style={s.qr}>
      <Svg width={QR_SIZE} height={QR_SIZE} viewBox={`0 0 ${total} ${total}`}>
        <Path d={d} fill="#000000" />
        <Circle cx={total / 2} cy={total / 2} r={m.circleDiameter / 2} fill="#FFFFFF" />
      </Svg>
      {/* Знак гривні — текстом PT Sans поверх білого кола */}
      <Text style={[s.qrSign, { fontSize: signSize, paddingTop: (QR_SIZE - signSize * 1.2) / 2 }]}>₴</Text>
    </View>
  );
}

function InvoicePdfDocument({ view }: { view: InvoiceView }) {
  const { seller, client } = view;
  const qrUrl = buildNbuQrUrl({
    recipient: seller.legalName,
    iban: seller.iban,
    recipientCode: seller.taxId,
    purpose: view.paymentPurpose,
    amount: view.total,
  });

  return (
    <Document title={`Рахунок на оплату № ${view.number}`} author={seller.legalName} language="uk">
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Рахунок на оплату № {view.number}</Text>
        <Text style={s.muted}>від {formatDateLong(view.issueDate)}</Text>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Постачальник</Text>
            <Text style={s.bold}>{seller.legalName}</Text>
            <Text>РНОКПП {seller.taxId}</Text>
            <Text>{seller.address}</Text>
            <Text>IBAN {formatIban(seller.iban)}</Text>
            <Text>{seller.bankName}</Text>
            <Text style={s.muted}>{seller.taxNote}</Text>
          </View>
          <View style={s.party}>
            <Text style={s.label}>Платник</Text>
            <Text style={s.bold}>{client.name}</Text>
            {client.taxId && <Text>Код {client.taxId}</Text>}
            {client.address && <Text>{client.address}</Text>}
            <Text>{client.email}</Text>
          </View>
        </View>

        {view.contractRef && (
          <Text style={{ marginTop: 12 }}>
            <Text style={s.bold}>Підстава: </Text>
            {view.contractRef}
          </Text>
        )}

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.cNo}>№</Text>
            <Text style={s.cName}>Найменування</Text>
            <Text style={s.cUnit}>Од.</Text>
            <Text style={s.cQty}>К-сть</Text>
            <Text style={s.cPrice}>Ціна, грн</Text>
            <Text style={s.cSum}>Сума, грн</Text>
          </View>
          {view.items.map((item) => (
            <View key={item.position} style={s.td} wrap={false}>
              <Text style={s.cNo}>{item.position}</Text>
              <Text style={s.cName}>{item.description}</Text>
              <Text style={s.cUnit}>{item.unit}</Text>
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cPrice}>{formatAmount(item.unitPrice)}</Text>
              <Text style={s.cSum}>{formatAmount(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <Text style={s.total}>Разом до сплати: {formatAmount(view.total)} грн</Text>
          <Text>{view.totalInWords}. Без ПДВ</Text>
        </View>

        <View style={s.footer} wrap={false}>
          <QrCode url={qrUrl} />
          <View style={{ flex: 1 }}>
            <Text>
              <Text style={s.bold}>Рахунок дійсний до: </Text>
              {formatDate(view.dueDate)}
            </Text>
            <Text style={{ marginTop: 4 }}>
              <Text style={s.bold}>Призначення платежу: </Text>
              {view.paymentPurpose}
            </Text>
            <Text style={[s.muted, { marginTop: 6 }]}>
              Відскануйте QR-код у застосунку банку — реквізити й сума заповняться автоматично.
            </Text>
            {view.notes && <Text style={{ marginTop: 6 }}>{view.notes}</Text>}
          </View>
        </View>

        <Text style={{ marginTop: 28 }}>Постачальник ____________________ {seller.legalName}</Text>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(view: InvoiceView): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfDocument view={view} />);
}
