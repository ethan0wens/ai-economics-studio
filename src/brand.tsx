import standard from '../design/brand/economic-signal-mark.svg?no-inline';
import onDark from '../design/brand/economic-signal-mark-on-dark.svg?no-inline';
import mono from '../design/brand/economic-signal-mark-mono.svg?no-inline';
import white from '../design/brand/economic-signal-mark-white.svg?no-inline';

const marks = { standard, 'on-dark': onDark, mono, white } as const;
type BrandVariant = keyof typeof marks;

export function BrandMark({ variant = 'standard', decorative = false }: { variant?: BrandVariant; decorative?: boolean }) {
  return <img className="brand-mark" src={marks[variant]} width={48} height={48}
    alt={decorative ? '' : 'AI Economics Studio Economic Signal'} aria-hidden={decorative || undefined} />;
}

export function BrandLockup({ variant }: { variant?: BrandVariant }) {
  return <span className="brand-lockup"><BrandMark variant={variant} decorative />
    <span>AI Economics <span className="brand-studio">Studio</span></span>
  </span>;
}

export function EconomicSignalMotif({ size }: { size: 'hero' | 'section' }) {
  return <span aria-hidden="true" className={`signal-motif signal-motif-${size}`} />;
}
