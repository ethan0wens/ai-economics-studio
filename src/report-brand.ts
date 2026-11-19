import { rgb, type PDFPage } from 'pdf-lib';
import standard from '../design/brand/economic-signal-mark.svg?raw';
import onDark from '../design/brand/economic-signal-mark-on-dark.svg?raw';

const variants = { standard, 'on-dark': onDark } as const;
type SignalVariant = keyof typeof variants;

const paths = (asset: string) => {
  const viewBox = /viewBox="0 0 (\d+) \1"/.exec(asset);
  const bars = [...asset.matchAll(/<path d="([MLZ\d\s]+)" fill="#([A-Fa-f0-9]{6})"\s*\/>/g)];
  if (!viewBox || bars.length !== 3) throw new Error('Expected the approved three-bar Economic Signal SVG.');
  return {
    size: Number(viewBox[1]),
    bars: bars.map(([, path, hex]) => ({
      path, color: rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4), 16) / 255),
    })),
  };
};

const signals = { standard: paths(variants.standard), 'on-dark': paths(variants['on-dark']) };

export function drawReportSignal(page: PDFPage, x: number, top: number, size: number, variant: SignalVariant = 'standard', opacity = 1) {
  const signal = signals[variant];
  for (const { path, color } of signal.bars) page.drawSvgPath(path, { x, y: top, scale: size / signal.size, color, opacity });
}
