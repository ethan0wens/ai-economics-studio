import { parse, type DefaultTreeAdapterTypes as Html } from 'parse5';

export type Element = Html.Element;
type Parent = Html.ParentNode;
const hosts = new Set(['www.microsoft.com', 'learn.microsoft.com', 'azure.microsoft.com', 'prices.azure.com']);

export function officialUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password) {
    throw new Error('Source must use an approved public Microsoft HTTPS host.');
  }
  return url;
}

export function normalize(value: string) {
  return value.normalize('NFKC').replace(/\u200b|\ufe0e|\ufe0f/g, '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

export function attr(node: Element, name: string) {
  return node.attrs.find(item => item.name === name)?.value;
}

const skip = new Set(['script', 'style', 'noscript', 'nav', 'footer', 'sup', 'template', 'svg']);

export function elements(root: Parent, tags?: ReadonlySet<string>): Element[] {
  return root.childNodes.flatMap(node => {
    if (!('tagName' in node) || skip.has(node.tagName)) return [];
    return [...(!tags || tags.has(node.tagName) ? [node] : []), ...elements(node, tags)];
  });
}

export function words(node: Parent): string {
  return normalize(node.childNodes.map(child => {
    if (child.nodeName === '#text' && 'value' in child) return child.value;
    if (!('tagName' in child) || skip.has(child.tagName)) return '';
    const body = words(child);
    return ['p', 'div', 'li', 'br', 'td', 'th'].includes(child.tagName) ? ` ${body} ` : body;
  }).join(''));
}

export function main(html: string) {
  const tree = parse(html);
  return elements(tree, new Set(['main']))[0] ?? tree;
}

export function tables(root: Parent) {
  const entries = elements(root, new Set(['h2', 'h3', 'h4', 'h5', 'table']));
  const headings: Element[] = [];
  return entries.flatMap(node => {
    if (node.tagName !== 'table') {
      while (headings.length && headings.at(-1)!.tagName >= node.tagName) headings.pop();
      headings.push(node);
      return [];
    }
    const rows = elements(node, new Set(['tr'])).map(row =>
      row.childNodes.filter((cell): cell is Element => 'tagName' in cell && ['th', 'td'].includes(cell.tagName)).map(words));
    return rows.length ? [{ headings: headings.map(words), header: rows[0], rows: rows.slice(1) }] : [];
  });
}

export const regionSource = 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability';
export const capabilitySource = 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure';
export const lifecycleSource = 'https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule';
export const sizingSource = 'https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/provisioned-throughput-sizing';
export const reservationSource = 'https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput-billing';
export const productTerms = 'https://www.microsoft.com/licensing/terms/productoffering/Microsoft365/MCA';

export type Source = { url: string; html?: string; error?: string };

export function sourceReader(request = fetch) {
  const cache = new Map<string, Promise<Source>>();
  return (source: string) => {
    const url = officialUrl(source);
    url.hash = '';
    const existing = cache.get(url.href);
    if (existing) return existing;
    const pending = (async (): Promise<Source> => {
      let next = url;
      try {
        for (let hop = 0; hop < 4; hop++) {
          const response = await request(next, { redirect: 'manual', signal: AbortSignal.timeout(18_000),
            headers: { 'Accept-Language': 'en-GB,en;q=0.8', Accept: 'text/html,application/xhtml+xml' } });
          const location = response.headers.get('location');
          if (response.status >= 300 && response.status < 400 && location) {
            next = officialUrl(new URL(location, next).href);
            continue;
          }
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (!/(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get('content-type') ?? '')) {
            throw new Error('Expected a public HTML document');
          }
          const limit = 8_000_000;
          if (Number(response.headers.get('content-length')) > limit || !response.body) throw new Error('Unexpected document size');
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let length = 0, html = '';
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            length += chunk.value.length;
            if (length > limit) {
              await reader.cancel();
              throw new Error('Unexpected document size');
            }
            html += decoder.decode(chunk.value, { stream: true });
          }
          return { url: next.href, html: html + decoder.decode() };
        }
        throw new Error('Too many redirects');
      } catch (reason) {
        const error = reason instanceof Error ? reason.message : String(reason);
        return { url: url.href, error };
      }
    })();
    cache.set(url.href, pending);
    return pending;
  };
}
