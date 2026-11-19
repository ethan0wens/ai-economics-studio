import { attr, elements, main, normalize, words, type Element } from './microsoft-source';

const exact = (value: string) => normalize(value).toLowerCase().replace(/[®™]/g, '');
const titles = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th']);
const seats = /\b(?:per user\s*(?:\/|per)\s*month|user\s*\/\s*month)\b/i;
const vat = /\b(?:price does not include vat|exclud(?:es|ing) vat|excl\.?\s*vat)\b/i;
const annual = /\b(?:paid yearly|annual (?:commitment|subscription))\b/i;
const monthly = /\bmonthly (?:commitment|subscription)\b/i;
const promotional = /\b(?:originally|starting (?:at|from)|promo(?:tion|tional)?|limited.time offer|sale price|discounted price|for the first \d+ months)\b/i;
const pricePattern = /£\s*([1-9]\d{0,3}(?:,\d{3})*(?:\.\d{2})?|0\.\d{2})\b/g;

export type UKOffer = { name: string; price: string; term: 'annual' | 'monthly' | 'monthly-pack'; gbp: true; excludesVat: true; identity?: string };

function pricesIn(text: string, type: 'seats' | 'pack', term?: UKOffer['term']) {
  if (!vat.test(text) || /\b(?:includes vat|vat inclusive)\b/i.test(text)) return [];
  const prices = [...text.matchAll(pricePattern)];
  return prices.flatMap((found, i) => {
    const end = prices[i + 1]?.index ?? text.length;
    const tail = text.slice(found.index + found[0].length, Math.min(found.index + 300, end));
    const before = text.slice(Math.max(0, found.index - 46), found.index);
    if (promotional.test(tail) || promotional.test(before) || /\b(?:USD|EUR|US\$)\b/.test(tail)) return [];
    const commitment = annual.test(tail) && !monthly.test(tail) ? 'annual' :
      monthly.test(tail) && !annual.test(tail) ? 'monthly' : undefined;
    const actual: UKOffer['term'] | undefined = type === 'pack' && /\b25,?000\s+(?:copilot )?credits\b/i.test(text) && /\b(?:pack\/month|per pack per month|per month|monthly)\b/i.test(tail)
      ? 'monthly-pack' : type === 'seats' && seats.test(tail) ? commitment : undefined;
    if (!actual || (term && actual !== term)) return [];
    const value = Number(found[1].replaceAll(',', ''));
    return value > 0 ? [{ price: value.toFixed(2), term: actual }] : [];
  });
}

function purchaseIdentities(container: Element) {
  return [...new Set(elements(container).flatMap(node => {
    const product = attr(node, 'data-product-id'), sku = attr(node, 'data-sku-id');
    return product && sku && /^[A-Z0-9]{4,24}$/i.test(product) && /^[A-Z0-9]{2,12}$/i.test(sku) ? [`${product}:${sku}`] : [];
  }))];
}

function containers(html: string, names: readonly string[]) {
  const root = main(html);
  const exactNames = new Set(names.map(exact));
  const headings = elements(root, titles);
  const matching = headings.filter(node => exactNames.has(exact(words(node))));
  return matching.map(heading => {
    let node = heading;
    let card = heading;
    for (let level = 0; level < 9; level++) {
      const parent = node.parentNode;
      if (!parent || !('tagName' in parent) || ['main', 'article', 'body'].includes(parent.tagName)) break;
      const title = words(heading);
      const text = words(parent);
      if (text.length > 3300 || elements(parent, titles).some(other => other !== heading &&
          exact(words(other)) !== exact(title) && /£/.test(words(other.parentNode ?? other)))) break;
      card = parent;
      if (/£/.test(text) && vat.test(text) && (seats.test(text) || /25,?000\s+(?:copilot )?credits/i.test(text))) break;
      node = parent;
    }
    return { title: words(heading), card };
  });
}

export function inspectUkOffer(html: string, names: readonly string[], type: 'seats' | 'pack', term?: UKOffer['term']) {
  const cards = containers(html, names);
  const candidates = new Map<string, UKOffer>();
  const references = new Set<string>();
  for (const { title, card } of cards) {
    const identities = purchaseIdentities(card);
    const text = words(card);
    const matches = pricesIn(text, type, term);
    for (const match of matches) {
      const key = `${match.price}|${match.term}`;
      const identity = identities.length === 1 ? identities[0] : undefined;
      if (identity) references.add(identity);
      candidates.set(key, { name: title, ...match, gbp: true, excludesVat: true, identity });
    }
  }
  if (candidates.size > 1 || references.size > 1) return { issue: 'conflicting-offer' as const, cards: cards.length };
  if (!candidates.size) return { issue: cards.length ? 'missing-terms' as const : 'missing-offer' as const, cards: cards.length };
  const offer = [...candidates.values()][0];
  return { offer: { ...offer, identity: [...references][0] }, cards: cards.length };
}
