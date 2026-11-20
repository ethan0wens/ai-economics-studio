import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

const activeSchema = z.object({ id: z.uuid(),
  versions: z.array(z.object({ version_id: z.uuid(), percentage: z.number() })).length(1) })
  .refine(deployment => deployment.versions[0].percentage === 100);
export type ActiveWorker = { deployment: string; version: string };

export function workerReleases(account: string, token: string, name: string, request = fetch) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}`;
  async function api(resource: 'deployments' | 'subdomain', body?: object) {
    const response = await request(`${endpoint}/${resource}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(18_000),
      cache: 'no-store', credentials: 'omit',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: body && JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Cloudflare ${resource} API returned HTTP ${response.status}.`);
    return z.object({ success: z.literal(true), result: z.unknown() }).parse(await response.json()).result;
  }
  return {
    async current(): Promise<ActiveWorker> {
      const result = z.object({ deployments: z.array(z.unknown()).min(1) }).parse(await api('deployments'));
      // Cloudflare documents the first deployment as the actively serving deployment.
      const selected = activeSchema.parse(result.deployments[0]);
      return { deployment: selected.id, version: selected.versions[0].version_id };
    },
    async confirmPreviewDisabled() {
      const state = z.object({ enabled: z.literal(false), previews_enabled: z.literal(false) }).safeParse(await api('subdomain'));
      if (!state.success) throw new Error('Cloudflare did not confirm that workers.dev and its Preview URLs are disabled.');
    },
    async restore(version: string) {
      await api('deployments', { strategy: 'percentage', versions: [{ version_id: z.uuid().parse(version), percentage: 100 }],
        annotations: { 'workers/message': 'Restore the last verified AI Economics Studio release after failed promotion' } });
    },
  };
}

type Promotion = {
  previous: ActiveWorker;
  upload: () => string;
  current: () => Promise<ActiveWorker>;
  verify: (candidate: ActiveWorker) => Promise<void>;
  persist: () => void;
  restore: (version: string) => Promise<void>;
  verifyRestore: (restored: ActiveWorker) => Promise<void>;
  pause?: () => Promise<void>;
};

async function waitForVersion(operations: Promotion, version: string, pending: ActiveWorker) {
  for (let attempt = 1; ; attempt++) {
    const active = await operations.current();
    if (active.version === version) return active;
    if (active.deployment !== pending.deployment || active.version !== pending.version || attempt === 10) {
      throw new Error(`Expected Worker version ${version}. Cloudflare reported ${active.version} in deployment ${active.deployment}.`);
    }
    await (operations.pause?.() ?? delay(3_000));
  }
}

function failureText(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function promoteWorker(operations: Promotion) {
  let candidate: ActiveWorker | undefined;
  try {
    const version = operations.upload();
    candidate = await waitForVersion(operations, version, operations.previous);
    await operations.verify(candidate);
    const active = await operations.current();
    if (active.deployment !== candidate.deployment || active.version !== candidate.version) {
      throw new Error(`The active Worker deployment changed during verification. Expected ${candidate.deployment}, observed ${active.deployment}.`);
    }
    operations.persist();
  } catch (reason) {
    const active = await operations.current();
    if (active.deployment === operations.previous.deployment && active.version === operations.previous.version) throw reason;
    if (!candidate || active.deployment !== candidate.deployment || active.version !== candidate.version) {
      throw new Error(`The active Worker changed without a verified candidate deployment. Automatic rollback was withheld. Initial failure: ${failureText(reason)}`, { cause: reason });
    }
    try {
      await operations.restore(operations.previous.version);
      const restored = await waitForVersion(operations, operations.previous.version, candidate);
      await operations.verifyRestore(restored);
      const verified = await operations.current();
      if (verified.deployment !== restored.deployment || verified.version !== restored.version) {
        throw new Error('The active Worker deployment changed while verifying restoration.', { cause: reason });
      }
    } catch (rollbackError) {
      throw new Error(`Production verification failed and restoration could not be confirmed: ${failureText(rollbackError)}. Initial failure: ${failureText(reason)}`, { cause: rollbackError });
    }
    throw new Error(`Previous production version restored after the candidate failed: ${failureText(reason)}`, { cause: reason });
  }
}
