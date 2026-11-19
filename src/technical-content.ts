import { marked, type Token, type Tokens } from 'marked';
import { z } from 'zod';
import index from '../docs/technical/index.json' with { type: 'json' };
import { technicalHref } from './navigation';

export const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const id = z.string().regex(slug);
const label = z.string().trim().min(1);
const entry = z.strictObject({
  id, file: z.string().regex(/^0[1-7]-[a-z0-9-]+\.md$/), title: label, summary: label, aliases: z.array(label).min(1),
  related: z.array(id).min(1), guides: z.array(id).min(1),
  reference: z.enum(['schema', 'relationships', 'models', 'coverage', 'commands']).optional(),
});
const indexSchema = z.strictObject({ sections: z.array(z.strictObject({
  id, title: label, summary: label, articles: z.array(entry).min(1),
})).length(7) });

export const { sections: technicalSections } = indexSchema.parse(index);
export const technicalEntries = technicalSections.flatMap(section =>
  section.articles.map(article => ({ ...article, section: section.id, sectionTitle: section.title })));
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

export function technicalLink(href: string, file: string) {
  const target = new URL(href, documentLocation(file));
  if (target.origin === virtualRoot) {
    const article = technicalEntries.find(entry => target.pathname === `/docs/technical/${entry.file}`);
    if (article) return technicalHref(article.id, target.hash ? decodeURIComponent(target.hash.slice(1)) : undefined);
    if (target.pathname === '/docs/technical/README.md') return technicalHref();
    return repo + target.pathname.slice(1) + target.hash;
  }
  if (target.protocol === 'https:' && allowedTechnicalSources.includes(target.hostname)) {
    return target.hostname === 'ai-econmics-studio.ethan0wens.workers.dev' && target.hash.startsWith('#/documentation')
      ? target.hash : target.href;
  }
  return undefined;
}
