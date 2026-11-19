const prototypeKeys = new Set(['__proto__', 'constructor', 'prototype']);

export function parseBoundedJson(text: string, maxNodes: number, label: string): unknown {
  const value: unknown = JSON.parse(text);
  let count = 0;
  function visit(item: unknown, depth: number) {
    if (++count > maxNodes || depth > 12) throw new Error(`${label} exceeds the supported JSON complexity.`);
    if (Array.isArray(item)) {
      if (item.length > maxNodes - count) throw new Error(`${label} contains too many JSON values.`);
      for (const child of item) visit(child, depth + 1);
    } else if (item && typeof item === 'object') {
      const object = item as Record<string, unknown>;
      const keys = Object.keys(object);
      if (keys.length > maxNodes - count) throw new Error(`${label} contains too many JSON values.`);
      for (const key of keys) {
        if (prototypeKeys.has(key)) throw new Error(`${label} contains an unsupported property.`);
        visit(object[key], depth + 1);
      }
    }
  }
  visit(value, 0);
  return value;
}

export async function readResponseBytes(response: Response, maxBytes: number, label: string) {
  const limitError = () => new Error(`${label} exceeds the supported response size.`);
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw limitError();
  }
  if (!response.body) throw new Error(`${label} has no response body.`);
  const reader = response.body.getReader();
  let bytes = new Uint8Array(Math.min(maxBytes, 65_536));
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const length = size + value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw limitError();
      }
      if (length > bytes.length) {
        const capacity = Math.min(maxBytes, Math.max(length, bytes.length * 2));
        const extended = new Uint8Array(capacity);
        extended.set(bytes);
        bytes = extended;
      }
      bytes.set(value, size);
      size = length;
    }
  } finally {
    reader.releaseLock();
  }
  return bytes.subarray(0, size);
}

export const decodeUtf8 = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

export function httpsUrl(value: string, allowedHosts: readonly string[]) {
  const url = URL.parse(value);
  return url && url.protocol === 'https:' && !url.port && !url.username && !url.password && allowedHosts.includes(url.hostname)
    ? url : undefined;
}

export const microsoftEvidenceHosts = ['www.microsoft.com', 'learn.microsoft.com', 'azure.microsoft.com', 'prices.azure.com'] as const;
export const microsoftEvidenceUrl = (value: string) => Boolean(httpsUrl(value, microsoftEvidenceHosts));
