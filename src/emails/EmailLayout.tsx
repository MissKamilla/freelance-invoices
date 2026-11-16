import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';

const font = 'Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export const emailStyles = {
  h1: { fontSize: '22px', fontWeight: 700, margin: '0 0 12px', color: '#1A1A1A' },
  text: { fontSize: '15px', lineHeight: '24px', color: '#1A1A1A', margin: '0 0 12px' },
  muted: { fontSize: '13px', lineHeight: '20px', color: '#5B6B7F', margin: '0' },
  amount: { fontSize: '28px', fontWeight: 700, margin: '4px 0 16px', color: '#1A1A1A' },
  button: {
    backgroundColor: '#0057B8',
    color: '#FFFFFF',
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  },
} as const;

export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="uk">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#F6F7F9', fontFamily: font, margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', maxWidth: '560px' }}>
          <Text style={{ ...emailStyles.muted, color: '#0057B8', fontWeight: 700, marginBottom: '20px' }}>
            Freelance Invoices
          </Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: '#E4E7EC', margin: '24px 0 16px' }} />
          <Text style={emailStyles.muted}>Лист надіслано автоматично сервісом Freelance Invoices.</Text>
        </Container>
      </Body>
    </Html>
  );
}
