import { marked, type Token, type Tokens } from 'marked';
import { z } from 'zod';
import index from '../docs/technical/index.json' with { type: 'json' };
import { currentRoute, routeHref, technicalHref } from './navigation';
import { httpsUrl } from './untrusted-data';

export const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const id = z.string().regex(slug);
const label = z.string().trim().min(1);
const entry = z.strictObject({
  id, file: z.string().regex(/^0[1-7]-[a-z0-9-]+\.md$/), title: label, summary: label, aliases: z.array(label).min(1),
  related: z.array(id).min(1), guides: z.array(id).min(1),
  reference: z.enum(['schema', 'relationships', 'models', 'coverage', 'commands']).optional(),
});
const indexSchema = z.strictObject({
  supporting: z.array(entry.extend({ file: z.string().regex(/^(?:[a-z0-9-]+\.md|\.\.\/31-product-language\.md|\.\.\/\.\.\/CONTRIBUTING\.md)$/) })).min(1),
  sections: z.array(z.strictObject({
  id, title: label, summary: label, articles: z.array(entry).min(1),
})).length(7) });

export const { sections: technicalSections, supporting: supportingReferences } = indexSchema.parse(index);
const numberedChapters = technicalSections.flatMap(section =>
  section.articles.map(article => ({ ...article, section: section.id, sectionTitle: section.title })));
export const technicalEntries = [...numberedChapters,
  ...supportingReferences.map(article => ({ ...article, section: 'supporting', sectionTitle: 'Supporting references' }))];
export type TechnicalEntry = typeof technicalEntries[number];

export function headingId(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ +/g, '-');
}

export function technicalArticle(meta: TechnicalEntry, markdown: string) {
  const [title, ...body] = marked.lexer(markdown).filter(token => token.type !== 'space');
  if (title?.type !== 'heading' || title.depth !== 1 || title.text !== meta.title) {
    throw new Error(`The Markdown title must match the technical index for ${meta.id}.`);
  }
  const headings = body.filter((token): token is Tokens.Heading => token.type === 'heading')
    .map(token => ({ title: token.text, id: headingId(token.text), depth: token.depth }));
  return { ...meta, body: body as Token[], headings, markdown };
}
export type TechnicalArticle = ReturnType<typeof technicalArticle>;

const repo = 'https://github.com/ethan0wens/ai-economics-studio/blob/main/';
const virtualRoot = 'https://studio-documentation.invalid';
export const allowedTechnicalSources = ['learn.microsoft.com', 'www.microsoft.com', 'azure.microsoft.com', 'www.cloudflare.com',
  'developers.cloudflare.com', 'docs.github.com', 'vite.dev', 'playwright.dev', 'nodejs.org', 'github.com',
  'ai-econmics-studio.ethan0wens.workers.dev'];
export const documentLocation = (file: string) => new URL(`/docs/technical/${file}`, virtualRoot);

export type TechnicalLink = { href: string; kind: 'internal' | 'implementation' | 'evidence' };
function implementationPath(path: string) {
  return /^\/(?:src|scripts|tests|fixtures|catalogue|\.github|docs\/technical\/examples)\/[^?#]+\.(?:tsx?|jsonc?|ya?ml)$/.test(path) ||
    /^\/(?:package(?:-lock)?\.json|wrangler\.jsonc|vite\.config\.ts|playwright\.config\.ts|index\.html|public\/_headers|docs\/technical\/(?:index|sources)\.json)$/.test(path);
}

function internalLink(hash: string): TechnicalLink | undefined {
  if (hash === '#/') return { href: hash, kind: 'internal' };
  const route = currentRoute(hash);
  if (route.page === 'home') return;
  if ([route.item, route.technicalArticle, route.section].some(value => value && !slug.test(value))) return;
  return { kind: 'internal', href: route.item === 'technical' && route.page === 'documentation'
    ? technicalHref(route.technicalArticle, route.section) : routeHref(route.page, route.item, route.section) };
}

export function technicalLink(href: string, file: string): TechnicalLink | undefined {
  if (!href.trim()) return;
  if (href.startsWith('#/')) return internalLink(href);
  const target = URL.parse(href, documentLocation(file));
  if (!target || target.username || target.password) return;
  if (target.origin === virtualRoot) {
    const article = technicalEntries.find(entry => target.pathname === documentLocation(entry.file).pathname);
    if (article) {
      let anchor: string | undefined;
      try { anchor = target.hash ? decodeURIComponent(target.hash.slice(1)) : undefined; } catch { return; }
      if (anchor && !slug.test(anchor)) return;
      return { href: technicalHref(article.id, anchor), kind: 'internal' };
    }
    if (target.pathname === '/docs/technical/README.md') return { href: technicalHref(), kind: 'internal' };
    if (implementationPath(target.pathname)) return { href: repo + target.pathname.slice(1) + target.hash, kind: 'implementation' };
    return;
  }
  if (!httpsUrl(target.href, allowedTechnicalSources)) return;
  if (target.hostname === 'ai-econmics-studio.ethan0wens.workers.dev') return internalLink(target.hash || '#/');
  if (target.hostname === 'github.com') {
    if (!target.href.startsWith(repo) || !implementationPath('/' + target.href.slice(repo.length).split('#')[0])) return;
    return { href: target.href, kind: 'implementation' };
  }
  return { href: target.href, kind: 'evidence' };
}
