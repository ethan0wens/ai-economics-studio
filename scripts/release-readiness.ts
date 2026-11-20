import { z } from 'zod';
import { productionHostname, productionOrigin, verifyPublicSecurity } from './security-http';

export const publicReleaseReminder = 'Before wider public release, use the approved custom domain and verify Cloudflare HTTPS enforcement. S6-10 is accepted for the current preview only.';
const reviewReference = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
});
const publicReleaseRecord = z.strictObject({
  hostname: z.string().nullable(),
  s6_10: z.enum(['accepted-preview-only', 'resolved']),
  evidence: z.strictObject({
    application: z.string().regex(/^[a-f0-9]{40}$/),
    catalogueId: z.string().regex(/^[a-f0-9]{64}$/),
    reviewedOn: z.iso.date(),
    edgeEnforcement: reviewReference,
    repositoryProtections: reviewReference,
    deploymentTokenScope: reviewReference,
    securityAndFinancialChecks: reviewReference,
    verifiedDeployment: reviewReference,
    riskRegisterReview: reviewReference,
    publicReleaseApproval: reviewReference,
  }).nullable(),
});

export async function verifyPublicRelease(record: unknown, request = fetch) {
  const parsed = publicReleaseRecord.safeParse(record);
  if (!parsed.success) throw new Error('Wider public release is blocked. The public release evidence record is invalid.');
  const { hostname, s6_10, evidence } = parsed.data;
  const missing = [
    ...(hostname !== productionHostname ? ['the approved custom domain'] : []),
    ...(s6_10 !== 'resolved' ? ['verified remediation of S6-10'] : []),
    ...(!evidence ? ['owner, security, regression and deployment evidence'] : []),
  ];
  if (!hostname || !evidence || missing.length) throw new Error(`Wider public release is blocked. Required: ${missing.join('; ')}.`);
  return verifyPublicSecurity(productionOrigin, {
    policy: 'public', expectedCatalogueId: evidence.catalogueId,
    expectedApplication: evidence.application,
  }, request);
}
