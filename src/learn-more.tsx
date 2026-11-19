import { guides } from './help-links';
import { routeHref } from './navigation';

export function LearnMore({ guide, children }: { guide: keyof typeof guides; children: string }) {
  return <a className="learn-more" href={routeHref('documentation', ...guides[guide])}>{children}</a>;
}
