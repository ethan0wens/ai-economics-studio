import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';
import ts from 'typescript';
import { z } from 'zod';
import { articles as guides } from '../src/documentation-content';
import { importEnvironment } from '../src/domain';
import { currentRoute } from '../src/navigation';
import { documentLocation, headingId, slug, technicalArticle, technicalEntries, technicalLink, technicalSections } from '../src/technical-content';
import { environmentReference, verificationCommands } from '../src/technical-reference';
import matrix from '../docs/technical/sources.json' with { type: 'json' };

const folder = 'docs/technical';
const root = fileURLToPath(new URL('../', import.meta.url));
const pathInRepo = (path: string) => {
  const absolute = resolve(root, path);
  const relation = relative(root, absolute);
  if (!relation || relation === '..' || relation.startsWith('..' + sep) || isAbsolute(relation)) throw new Error(`Invalid repository path: ${path}`);
  return absolute;
};
const file = (path: string) => readFile(pathInRepo(path), 'utf8');
const matrixSchema = z.array(z.strictObject({
  topic: z.string().min(1), articles: z.array(z.string().regex(slug)).min(1),
  sources: z.record(z.string(), z.array(z.string().regex(/^[A-Za-z_$][\w$]*$/))), verification: z.array(z.string()).min(1),
})).min(1);
const rows = matrixSchema.parse(matrix);
const allowedTokens = new Set(['heading', 'paragraph', 'text', 'escape', 'codespan', 'strong', 'em', 'del', 'br', 'link', 'list', 'list_item',
  'space', 'table', 'code', 'blockquote', 'hr', 'def']);

function indexMarkdown() {
  return [
    '# Technical documentation',
    '',
    'Use this reference to understand, verify, operate and extend AI Economics Studio. The running code, schemas, tests and dated evidence are the technical authority. Open [Technical Documentation in the studio](https://ai-econmics-studio.ethan0wens.workers.dev/#/documentation/technical) for searchable articles and generated references.',
    '',
    ...technicalSections.flatMap((section, index) => [
      `## ${index + 1}. ${section.title}`, '', section.summary, '',
      ...section.articles.map(article => `- [${article.title}](${article.file}). ${article.summary}`), '',
    ]),
    '## Maintaining this reference', '',
    '- [Documentation audit](audit.md)',
    '- [Source traceability matrix](traceability.md)',
    '- [Documentation maintenance](maintenance.md)', '',
  ].join('\n');
}
function traceabilityMarkdown() {
  const articleLinks = new Map(technicalEntries.map(entry => [entry.id, `[${entry.title}](${entry.file})`]));
  return [
    '# Source traceability', '',
    'Source links use stable files and list the maintained symbols. Use the linked tests, fixtures and dated evidence to verify the claim in context. Generate this table from sources.json using the documentation index command.', '',
    '| Topic | Technical articles | Implementation and evidence | Verification |', '| --- | --- | --- | --- |',
    ...rows.map(row => {
      const sources = Object.entries(row.sources).map(([path, symbols]) => `[${path}](../../${path})${symbols.length ? ' (' + symbols.map(name => `\`${name}\``).join(', ') + ')' : ''}`);
      const tests = row.verification.map(path => `[${path}](../../${path})`);
      return `| ${row.topic} | ${row.articles.map(id => articleLinks.get(id)).join(' · ')} | ${sources.join(' · ')} | ${tests.join(' · ')} |`;
    }), '',
  ].join('\n');
}

export async function validateTechnicalDocs() {
  const articles = await Promise.all(technicalEntries.map(async meta => technicalArticle(meta, await file(`${folder}/${meta.file}`))));
  const byID = new Map(articles.map(article => [article.id, article]));
  const byFile = new Map(articles.map(article => [article.file, article]));
  const guideByID = new Map(guides.map(guide => [guide.id, guide]));
  const sections = new Set(technicalSections.map(section => section.id));
  const names = await readdir(pathInRepo(folder));
  const markdownFiles = names.filter(name => /^0.*\.md$/.test(name));
  if (sections.size !== technicalSections.length || byID.size !== articles.length ||
    byFile.size !== articles.length || articles.length !== markdownFiles.length || byID.has('technical') ||
    guideByID.has('technical') || [...byID.keys()].some(id => sections.has(id)) ||
    technicalSections.some((section, index) => section.articles.some(article => !article.file.startsWith(`0${index + 1}-`))) ||
    markdownFiles.some(name => !byFile.has(name))) throw new Error('Technical navigation and Markdown files disagree.');

  async function validateLink(href: string, source: string) {
    const rendered = technicalLink(href, source);
    if (!rendered || !href.trim()) throw new Error(`Invalid documentation source in ${source}: ${href}`);
    const base = documentLocation(source);
    const url = new URL(href, base);
    if (rendered.startsWith('#/documentation')) {
      const route = currentRoute(rendered);
      if (route.item === 'technical') {
        const article = route.technicalArticle && byID.get(route.technicalArticle);
        if ((route.technicalArticle && !article) ||
          (route.section && !(article ? article.headings.some(heading => heading.id === route.section) ||
            (route.section === 'generated-reference' && article.reference) : sections.has(route.section)))) {
          throw new Error(`Broken technical link in ${source}: ${href}`);
        }
      } else {
        const guide = route.item && guideByID.get(route.item);
        if ((route.item && !guide) || (route.section &&
          (guide ? !guide.sections.some(heading => heading.id === route.section) : route.section !== 'topics'))) {
          throw new Error(`Broken user-guide link in ${source}: ${href}`);
        }
      }
    }
    if (url.origin !== base.origin) return;
    const path = decodeURIComponent(url.pathname).slice(1);
    const contents = await file(path);
    if (url.hash && path.endsWith('.md')) {
      const anchor = decodeURIComponent(url.hash.slice(1));
      const headings = marked.lexer(contents).flatMap(token => token.type === 'heading' ? [headingId(token.text)] : []);
      if (!headings.includes(anchor)) throw new Error(`Broken Markdown anchor in ${source}: ${href}`);
    }
  }

  let diagramCount = 0;
  for (const article of articles) {
    const headings = article.headings.map(heading => heading.id);
    if (headings.length < 2 || new Set(headings).size !== headings.length || headings.includes('generated-reference') ||
      article.headings.some(heading => !slug.test(heading.id) || ![2, 3].includes(heading.depth)) ||
      new Set(article.related).size !== article.related.length || new Set(article.guides).size !== article.guides.length ||
      article.related.some(id => id === article.id || !byID.has(id)) || article.guides.some(id => !guideByID.has(id))) {
      throw new Error(`Invalid headings or cross-references in ${article.id}.`);
    }
    const checks: Promise<void>[] = [];
    marked.walkTokens(article.body, token => {
      if (!allowedTokens.has(token.type)) throw new Error(`Unsupported Markdown in ${article.id}: ${token.type}`);
      if (token.type === 'link' || token.type === 'def') checks.push(validateLink(token.href, article.file));
      if (token.type === 'code' && token.lang === 'diagram') {
        if (!token.text.startsWith('Diagram ') || !token.text.includes('\n')) throw new Error(`Missing diagram caption in ${article.id}.`);
        diagramCount++;
      }
    });
    await Promise.all(checks);
  }
  if (diagramCount < 5) throw new Error('The technical reference requires five architecture and operational diagrams.');

  const reference = environmentReference();
  const schemaText = byID.get('environment-schema')?.markdown ?? '';
  const relationshipText = byID.get('relationships-and-files')?.markdown ?? '';
  for (const field of new Set(reference.objects.flatMap(object => object.fields))) {
    if (!schemaText.includes(`\`${field}\``)) throw new Error(`Undocumented executable object field: ${field}`);
  }
  for (const { type } of reference.relationships) {
    if (!relationshipText.includes(`\`${type}\``)) throw new Error(`Undocumented relationship: ${type}`);
  }
  if (verificationCommands().some(command => !command.script)) throw new Error('The generated command reference is out of date.');
  const exampleDirectory = `${folder}/examples`;
  const exampleNames = await readdir(pathInRepo(exampleDirectory));
  if (exampleNames.length < 2 || exampleNames.some(name => !name.endsWith('.json'))) throw new Error('Missing versioned documentation examples.');
  for (const name of exampleNames) {
    importEnvironment(await file(`${exampleDirectory}/${name}`));
    await validateLink(`examples/${name}`, '02-relationships-and-files.md');
  }
  const covered = new Set(rows.flatMap(row => row.articles));
  if (covered.size !== byID.size || [...covered].some(id => !byID.has(id))) throw new Error('The traceability matrix must cover every technical article.');
  for (const row of rows) {
    for (const [path, symbols] of Object.entries(row.sources)) {
      const contents = await file(path);
      if (!symbols.length) continue;
      const source = ts.createSourceFile(path, contents, ts.ScriptTarget.Latest, false);
      const names = new Set(source.statements.flatMap(statement => {
        if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.map(variable => variable.name.getText(source));
        if (ts.isFunctionDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)) return [statement.name?.text];
        return [];
      }));
      for (const symbol of symbols) if (!names.has(symbol)) throw new Error(`Missing traceability symbol: ${path} → ${symbol}`);
    }
    for (const path of row.verification) await file(path);
  }
  if (await file(`${folder}/README.md`) !== indexMarkdown() || await file(`${folder}/traceability.md`) !== traceabilityMarkdown()) {
    throw new Error('Generated technical index or traceability has drifted. Run npm run docs:index.');
  }
  return { articles: articles.length, sections: sections.size, diagrams: diagramCount, examples: exampleNames.length };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await writeFile(pathInRepo(`${folder}/README.md`), indexMarkdown());
  await writeFile(pathInRepo(`${folder}/traceability.md`), traceabilityMarkdown());
}
