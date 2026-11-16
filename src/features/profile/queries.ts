import 'server-only';
import { db } from '@/lib/db';

export function getProfile(userId: string) {
  return db.businessProfile.findUnique({ where: { userId } });
}
