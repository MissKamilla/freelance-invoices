import 'server-only';
import nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import { env } from '@/lib/env';

// Локально — SMTP-пастка Mailpit (листи видно на http://localhost:8025), без автентифікації.
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

export async function sendEmail({ to, subject, react }: { to: string; subject: string; react: React.ReactElement }) {
  const [html, text] = await Promise.all([render(react), render(react, { plainText: true })]);
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
}
