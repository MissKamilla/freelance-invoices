import 'server-only';
import { db } from '@/lib/db';
import type { ProfileData } from './schema';

export async function saveProfile(userId: string, data: ProfileData) {
  const values = { ...data, phone: data.phone || null };
  await db.businessProfile.upsert({
    where: { userId },
    create: { userId, ...values },
    update: values,
  });
}
