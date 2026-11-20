import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { articles, topics } from '../src/documentation-content';
import { documentationReference } from '../src/documentation-reference';
import { destinations } from '../src/navigation';
import { helpTopics, startingArticles } from '../src/help-links';
import { fieldHelp } from '../src/field-help';
import { examples, openExample } from '../src/examples';
import { validate } from './pricing';
import { validateTechnicalDocs } from './technical-docs';

const fail = (message: string) => { throw new Error(message); };
const readme = await readFile('README.md', 'utf8');
const readmeImages = new Set<string>();
for (const [, description, target] of readme.matchAll(/(!?\[[^\]\n]*\])\(([^\s)]+)\)/g)) {
  if (target.startsWith('https:') || target.startsWith('#')) continue;
  const path = target.split('#')[0];
  if (!(await stat(path)).isFile()) fail(`README reference must resolve to a file: ${path}`);
  if (!description.startsWith('!')) continue;
  if (description.length <= 3 || !path.startsWith('docs/assets/readme/')) fail(`README capture needs descriptive alternative text: ${path}`);
  readmeImages.add(path);
}
const captures = (await readdir('docs/assets/readme')).filter(name => name.endsWith('.png'));
if (captures.length < 6 || captures.some(name => !readmeImages.has(`docs/assets/readme/${name}`))) fail('README showcases must reference all the checked captures.');
const lockup = /<img\s+src="([^"]+)"\s+alt="([^"]+)"/.exec(readme);
if (!lockup || !(await stat(lockup[1])).isFile()) fail('README Economic Signal lockup is missing.');

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ids = new Map(articles.map(article => [article.id, article]));
const exampleIds = new Set(examples.map(example => example.id));
if (exampleIds.size !== examples.length) fail('Built-in example IDs must be unique.');
if (ids.size !== articles.length) fail('Documentation article IDs must be unique.');
for (const topic of topics) if (!articles.some(article => article.topic === topic)) fail(`Missing topic: ${topic}`);
for (const article of articles) {
  if (!slug.test(article.id) || !article.title.trim() || !article.intro.trim() || !article.sections.length ||
      new Set(article.sections.map(section => section.id)).size !== article.sections.length ||
      article.sections.some(section => !slug.test(section.id) || !section.title.trim() || !section.paragraphs.some(text => text.trim()))) {
    fail(`Invalid article content or anchors: ${article.id}`);
  }
  for (const related of article.related) if (!ids.has(related) || related === article.id) fail(`Invalid related article: ${article.id} → ${related}`);
  for (const link of [...(article.tool ? [article.tool] : []), ...article.next ?? []]) {
    if (!Object.hasOwn(destinations, link.page) || !link.label.trim()) fail(`Invalid studio destination in ${article.id}`);
    if (link.item && !(
      (link.page === 'examples' && exampleIds.has(link.item)) ||
      (link.page === 'costs' && ['explore', 'value'].includes(link.item)) ||
      (link.page === 'review' && ['architecture', 'technical', 'controls'].includes(link.item))
    )) fail(`Invalid studio subview in ${article.id}: ${link.item}`);
  }
  if (article.tool?.page === 'examples' && !examples.some(example => example.id === article.tool?.item && example.article === article.id)) {
    fail(`Example walkthrough target does not resolve: ${article.id}`);
  }
  for (const [, source] of article.sources ?? []) {
    const url = new URL(source);
    if (url.protocol !== 'https:' || !['learn.microsoft.com', 'www.microsoft.com', 'azure.microsoft.com'].includes(url.hostname)) fail(`Invalid source in ${article.id}: ${source}`);
  }
}
for (const field of Object.keys(fieldHelp)) if (!Object.hasOwn(helpTopics, field)) fail(`Missing field documentation: ${field}`);
for (const { source } of Object.values(fieldHelp)) {
  if (!source) continue;
  const url = new URL(source.href);
  if (url.protocol !== 'https:' || !['learn.microsoft.com', 'www.microsoft.com', 'azure.microsoft.com'].includes(url.hostname)) {
    fail(`Field evidence must point to an official Microsoft source: ${source.href}`);
  }
}
for (const path of (await readdir(resolve('src'))).filter(name => /\.tsx?$/.test(name))) {
  const source = await readFile(resolve('src', path), 'utf8');
  if (/https:\/\/github\.com\/[^'"`\s]+\.md(?:[#?][^'"`\s]*)?/i.test(source)) {
    fail(`Application guidance must resolve inside Documentation: ${path}`);
  }
}
for (const id of startingArticles) if (!ids.has(id)) fail(`Missing starting article: ${id}`);
for (const example of examples) {
  openExample(example);
  const walkthrough = ids.get(example.article);
  if (walkthrough?.tool?.page !== 'examples' || walkthrough.tool.item !== example.id) fail(`Missing reciprocal walkthrough for ${example.id}`);
  if (!slug.test(example.id) || example.purpose.trim().length < 20 || !example.assumptions.some(text => text.trim()) ||
      example.explore.length < 2 || example.explore.some(text => text.trim().length < 20)) fail(`Incomplete example guidance for ${example.id}`);
}

const pricing = await validate(resolve('public/pricing'));
const anchor = pricing.manifest.lastCheckedAt ?? '2026-11-19T00:00:00Z';
const ref = documentationReference(pricing, anchor);
if (ref.id !== pricing.manifest.catalogueId || ref.records !== pricing.manifest.records ||
    ref.coverage.reduce((sum, family) => sum + family.scoped, 0) !== (pricing.inventory?.length ?? ref.coverage.reduce((sum, family) => sum + family.scoped, 0)) ||
    ref.models.some(model => !slug.test(model.id) || !model.version) ||
    ref.regional.length !== ref.evidenceCounts.reduce((sum, status) => sum + status.total, 0)) fail('Documentation reference data does not reconcile to the validated snapshot.');
console.log(`Documentation valid: ${articles.length} articles, ${topics.length} topics, ${Object.keys(helpTopics).length} contextual fields, ${ref.models.length} model configurations and ${ref.regional.length} regional evidence entries.`);
const technical = await validateTechnicalDocs();
console.log(`Technical documentation valid: ${technical.articles} articles in ${technical.sections} sections, ${technical.diagrams} diagrams and ${technical.examples} validated example environments.`);
