import { z } from 'zod';

export const reviewGroups = ['commercial', 'licensing', 'compatibility', 'ptu', 'lifecycle', 'reservations'] as const;
export type ReviewGroup = typeof reviewGroups[number];
const dateTime = z.iso.datetime({ offset: true });
const review = z.strictObject({
  attemptedAt: dateTime, successfulAt: dateTime.nullable(), checked: z.number().int().nonnegative(),
  state: z.enum(['checked', 'partial', 'unavailable']),
});
const group = z.enum(reviewGroups);
export const maintenanceHealthSchema = z.strictObject({
  schemaVersion: z.literal(1),
  reviewedAt: dateTime.nullable(),
  reviews: z.partialRecord(group, review),
  sources: z.array(z.strictObject({ url: z.url(), group, state: z.enum(['retrieved', 'unavailable']),
    checkedAt: dateTime, digest: z.string().optional() })),
  changes: z.array(z.strictObject({ group, id: z.string(), kind: z.enum(['automatic', 'conditional']), detail: z.string() })),
  unresolved: z.array(z.strictObject({ group, id: z.string(), kind: z.enum(['source', 'ambiguous', 'expired', 'unpriced', 'unmapped']),
    detail: z.string(), source: z.url(), firstSeen: dateTime, occurrences: z.number().int().positive() })),
  expiring: z.array(z.strictObject({ group, id: z.string(), reviewBy: z.iso.date(), source: z.url() })).default([]),
  discovered: z.array(z.strictObject({ model: z.string(), version: z.string(), sku: z.string(), region: z.string() })),
  lifecycle: z.array(z.strictObject({ model: z.string(), version: z.string(), date: z.iso.date(),
    timing: z.enum(['retirement', 'no-earlier-than']), replacement: z.string().optional() })),
});
export type MaintenanceHealth = z.infer<typeof maintenanceHealthSchema>;

export const releaseHealthSchema = z.strictObject({
  schemaVersion: z.literal(1), application: z.string().regex(/^[a-f0-9]{40}$/), catalogueId: z.string().nullable(),
  pricingCheckedAt: dateTime.nullable(), evidenceHash: z.string().regex(/^[a-f0-9]{64}$/), deployedAt: dateTime,
  status: z.literal('published'), coverage: z.strictObject({ inventory: z.number(), complete: z.number(), partial: z.number(),
    unpriced: z.number(), unsupported: z.number(), records: z.number() }),
  previous: z.strictObject({ cloudflareVersion: z.uuid(), catalogueId: z.string().nullable(), application: z.string().nullable() }),
});
export type ReleaseHealth = z.infer<typeof releaseHealthSchema>;
