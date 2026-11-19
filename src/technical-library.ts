import { documentLocation, technicalArticle, technicalEntries } from './technical-content';

const sources = import.meta.glob<string>([
  '../docs/technical/*.md', '!../docs/technical/README.md',
  '../docs/31-product-language.md', '../CONTRIBUTING.md',
], { query: '?raw', import: 'default', eager: true });
export const technicalArticles = technicalEntries.map(meta =>
  technicalArticle(meta, sources[`..${documentLocation(meta.file).pathname}`]));
