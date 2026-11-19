export const destinations = {
  home: 'Home', builder: 'Environment Builder', costs: 'Cost & Value Analysis',
  reports: 'Reports & Export', documentation: 'Documentation', catalogue: 'Pricing Catalogue',
  examples: 'Example environments', review: 'Environment Review', architecture: 'Architecture', governance: 'Security & Governance',
} as const;
export type Destination = keyof typeof destinations;
export type Route = { page: Destination; item?: string; technicalArticle?: string; section?: string };

export const reviewPages = new Set<Destination>(['review', 'architecture', 'governance']);

export function routeHref(page: Destination, item?: string, section?: string) {
  return `#/${page === 'home' ? '' : page}${item ? '/' + encodeURIComponent(item) : ''}${section ? '?section=' + encodeURIComponent(section) : ''}`;
}

export function technicalHref(article?: string, section?: string) {
  return `#/documentation/technical${article ? '/' + encodeURIComponent(article) : ''}${section ? '?section=' + encodeURIComponent(section) : ''}`;
}

export function currentRoute(hash = window.location.hash): Route {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const [page, item, extra, tail] = path.replace(/\/$/, '').split('/');
  const section = new URLSearchParams(query).get('section') ?? undefined;
  if (tail !== undefined || (extra !== undefined && !(page === 'documentation' && item === 'technical')) || !page || !Object.hasOwn(destinations, page)) return { page: 'home' };
  try {
    return { page: page as Destination, item: item ? decodeURIComponent(item) : undefined,
      technicalArticle: extra ? decodeURIComponent(extra) : undefined, section };
  } catch {
    return { page: 'home' };
  }
}
