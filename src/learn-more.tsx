import { documentationHref, guides } from './help-links';

export function LearnMore({ guide, children }: { guide: keyof typeof guides; children?: string }) {
  const target = guides[guide];
  return <a className="learn-more" href={documentationHref(target)}>{children ?? target.label ?? 'Learn more in Documentation'}</a>;
}
