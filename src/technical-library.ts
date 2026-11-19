import { technicalArticle, technicalEntries } from './technical-content';

const sources = import.meta.glob<string>('../docs/technical/0*.md', { query: '?raw', import: 'default', eager: true });
export const technicalArticles = technicalEntries.map(meta => technicalArticle(meta, sources[`../docs/technical/${meta.file}`]));
