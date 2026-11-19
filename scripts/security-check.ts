import { readFile } from 'node:fs/promises';
import { publicReleaseReminder, verifyPublicRelease } from './release-readiness';
import { reportSecurityVerification, verifyPublicSecurity, workerUrl } from './security-http';

try {
  const args = process.argv.slice(2);
  if (args[0] === 'preview' && (args.length === 1 || args.length === 2 && args[1] === '--observe-current')) {
    await reportSecurityVerification(await verifyPublicSecurity(workerUrl, { policy: 'preview', observeCurrent: args[1] ? true : undefined }));
  } else if (!args.length || args.length === 1 && args[0] === 'public') {
    console.log(publicReleaseReminder);
    const record: unknown = JSON.parse(await readFile(new URL('../docs/security/public-release.json', import.meta.url), 'utf8'));
    await reportSecurityVerification(await verifyPublicRelease(record));
  } else {
    throw new Error('Use npm run security:preview or npm run release:public. Preview observation is a read-only check of the active Worker.');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=Security delivery verification::${escaped}`);
  } else console.error(message);
  process.exitCode = 1;
}
