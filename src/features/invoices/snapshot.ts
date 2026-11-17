import { z } from 'zod';

/** Реквізити, «заморожені» в рахунку на момент виставлення. */
export const sellerSnapshotSchema = z.object({
  legalName: z.string(),
  taxId: z.string(),
  iban: z.string(),
  bankName: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  taxNote: z.string(),
});

export const clientSnapshotSchema = z.object({
  name: z.string(),
  taxId: z.string().nullable(),
  email: z.string(),
  address: z.string().nullable(),
});

export type SellerSnapshot = z.infer<typeof sellerSnapshotSchema>;
export type ClientSnapshot = z.infer<typeof clientSnapshotSchema>;
