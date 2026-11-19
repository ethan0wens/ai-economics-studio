import { z } from 'zod';

const activeSchema = z.object({ id: z.uuid(), created_on: z.iso.datetime({ offset: true }),
  versions: z.array(z.object({ version_id: z.uuid(), percentage: z.number() })).length(1) })
  .refine(deployment => deployment.versions[0].percentage === 100);
export type ActiveWorker = { deployment: string; version: string };

export function workerReleases(account: string, token: string, name: string, request = fetch) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}/deployments`;
  async function api(body?: object) {
    const response = await request(endpoint, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(18_000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Cloudflare deployment API returned HTTP ${response.status}.`);
    return z.object({ success: z.literal(true), result: z.unknown() }).parse(await response.json()).result;
  }
  return {
    async current(): Promise<ActiveWorker> {
      const result = z.object({ deployments: z.array(z.unknown()).min(1) }).parse(await api());
      const history = result.deployments.map(value => ({ value, ...z.object({ created_on: z.iso.datetime({ offset: true }) }).parse(value) }));
      const newest = history.sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on))[0];
      const selected = activeSchema.parse(newest.value);
      return { deployment: selected.id, version: selected.versions[0].version_id };
    },
    async restore(version: string) {
      await api({ strategy: 'percentage', versions: [{ version_id: z.uuid().parse(version), percentage: 100 }],
        annotations: { 'workers/message': 'Restore the last verified AI Economics Studio release after failed promotion' } });
    },
  };
}

type Promotion = {
  previous: ActiveWorker;
  upload: () => string;
  current: () => Promise<ActiveWorker>;
  verify: () => Promise<void>;
  persist: () => void;
  restore: (version: string) => Promise<void>;
  verifyRestore: () => Promise<void>;
};

export async function promoteWorker(operations: Promotion) {
  let version: string | undefined;
  try {
    version = operations.upload();
    await operations.verify();
    if ((await operations.current()).version !== version) throw new Error('The active Worker version changed during verification.');
    operations.persist();
  } catch (reason) {
    const active = await operations.current();
    if (active.version === operations.previous.version) throw reason;
    if (!version || active.version !== version) {
      throw new Error('The active Worker changed without a verified candidate version. Automatic rollback was withheld.', { cause: reason });
    }
    try {
      await operations.restore(operations.previous.version);
      await operations.verifyRestore();
      if ((await operations.current()).version !== operations.previous.version) throw new Error('Cloudflare did not restore the previous version.', { cause: reason });
    } catch (rollbackError) {
      throw new Error(`Production verification failed and restoration could not be confirmed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, { cause: rollbackError });
    }
    throw new Error(`Previous production version restored after the candidate failed: ${reason instanceof Error ? reason.message : String(reason)}`, { cause: reason });
  }
}
