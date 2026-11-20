import { readFile } from 'node:fs/promises';
import { publicReleaseReminder, verifyPublicRelease } from './release-readiness';
import { observeProductionSecurity, previewOrigin, productionOrigin, reportSecurityVerification, verifyPublicSecurity } from './security-http';

try {
  const args = process.argv.slice(2);
  if (args[0] === 'preview' && (args.length === 1 || args.length === 2 && args[1] === '--observe-current')) {
    await reportSecurityVerification(await verifyPublicSecurity(previewOrigin, { policy: 'preview', observeCurrent: args[1] ? true : undefined }));
  } else if (args[0] === 'production' && args.length === 2 && args[1] === '--observe-current') {
    console.log('Read-only observation of the active production receipt. Release approval uses npm run release:public.');
    await reportSecurityVerification(await observeProductionSecurity());
  } else if (args[0] === 'production' && args.length === 3) {
    await reportSecurityVerification(await verifyPublicSecurity(productionOrigin, {
      policy: 'public', expectedApplication: args[1], expectedCatalogueId: args[2],
    }));
  } else if (!args.length || args.length === 1 && args[0] === 'public') {
    console.log(publicReleaseReminder);
    const record: unknown = JSON.parse(await readFile(new URL('../docs/security/public-release.json', import.meta.url), 'utf8'));
    await reportSecurityVerification(await verifyPublicRelease(record));
  } else {
    throw new Error('Use npm run security:preview, npm run security:production -- <application SHA-1> <catalogue SHA-256>, or npm run release:public.');
  }
} catch (error) {
  const message = error instanceof Error
    ? [error.message, error.cause instanceof Error ? error.cause.message : undefined].filter(Boolean).join(' · ')
    : String(error);
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=Security delivery verification::${escaped}`);
  } else console.error(message);
  process.exitCode = 1;
}
