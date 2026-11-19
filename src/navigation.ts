export const destinations = {
  home: 'Home', builder: 'Environment Builder', costs: 'Cost Analysis',
  reports: 'Reports & Export', documentation: 'Documentation', catalogue: 'Pricing Catalogue',
  examples: 'Example environments', architecture: 'Architecture', governance: 'Security & Governance',
} as const;
export type Destination = keyof typeof destinations;
export type Route = { page: Destination; item?: string; section?: string };

export function routeHref(page: Destination, item?: string, section?: string) {
  return `#/${page === 'home' ? '' : page}${item ? '/' + encodeURIComponent(item) : ''}${section ? '?section=' + encodeURIComponent(section) : ''}`;
}

export function currentRoute(hash = window.location.hash): Route {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const [page, item, extra] = path.split('/');
  const section = new URLSearchParams(query).get('section') ?? undefined;
  if (extra || !page || !Object.hasOwn(destinations, page)) return { page: 'home' };
  try {
    return { page: page as Destination, item: item ? decodeURIComponent(item) : undefined, section };
  } catch {
    return { page: 'home' };
  }
}
