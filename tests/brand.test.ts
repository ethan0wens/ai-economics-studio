import { readFile } from 'node:fs/promises';
import type { PDFPage } from 'pdf-lib';
import { expect, it, vi } from 'vitest';
import tokens from '../design/tokens.json';
import { browserIcons, documentAssetPaths } from '../scripts/security-http';
import { drawReportSignal } from '../src/report-brand';

const geometry = [
  'M 9 76 L 27 76 L 42 52 L 25 52 Z',
  'M 31 76 L 49 76 L 72 30 L 55 30 Z',
  'M 56 76 L 74 76 L 89 15 L 72 15 Z',
];
const svgRoot = 'design/brand/economic-signal-mark';

it('uses the approved bar geometry in every mark variant and in the PDF vectors', async () => {
  for (const suffix of ['', '-on-dark', '-mono', '-white']) {
    const asset = await readFile(`${svgRoot}${suffix}.svg`, 'utf8');
    expect(asset).toContain('viewBox="0 0 96 96"');
    expect([...asset.matchAll(/<path d="([^"]+)"/g)].map(match => match[1])).toEqual(geometry);
  }
  const drawSvgPath = vi.fn<PDFPage['drawSvgPath']>();
  const page = { drawSvgPath } as unknown as PDFPage;
  drawReportSignal(page, 46, 781, 48);
  drawReportSignal(page, 80, 740, 96, 'on-dark', .23);
  for (const [start, params] of [[0, { x: 46, y: 781, scale: .5, opacity: 1 }],
    [3, { x: 80, y: 740, scale: 1, opacity: .23 }]] as const) {
    expect(drawSvgPath.mock.calls.slice(start, start + 3).map(([path]) => path)).toEqual(geometry);
    expect(drawSvgPath.mock.calls.slice(start, start + 3).map(([, options]) => options)).toEqual(
      geometry.map(() => expect.objectContaining(params)));
  }
  expect(drawSvgPath.mock.calls[2]?.[1]?.color).not.toEqual(drawSvgPath.mock.calls[5]?.[1]?.color);
});

it('references each local browser icon and serves the exact raster dimensions and ICO entries', async () => {
  const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/assets/studio-build.js');
  expect(documentAssetPaths(html).assets).toEqual(new Set([...browserIcons.keys(), '/assets/studio-build.js']));
  expect(() => documentAssetPaths(html.replace('rel="icon"', 'rel="preload"'))).toThrow('unexpected resource');
  expect(() => documentAssetPaths(html.replace('/brand/favicon-32.png', '/brand/other.png'))).toThrow('unexpected resource');
  const sizes = { 'favicon-16': 16, 'favicon-32': 32, 'favicon-48': 48, 'apple-touch-icon': 180, 'app-icon-192': 192, 'app-icon-512': 512 };
  for (const [name, size] of Object.entries(sizes)) {
    const png = await readFile(`public/brand/${name}.png`);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size]);
  }
  const ico = await readFile('public/brand/favicon.ico');
  expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
  expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);
  const svg = await readFile('public/brand/favicon.svg', 'utf8');
  expect(svg).toMatch(/<rect[^>]+#17243B/);
  expect([...svg.matchAll(/<path d="([^"]+)"/g)].map(match => match[1])).toEqual(geometry);
});

it('keeps web and report brand tokens aligned and text pairings above WCAG AA', async () => {
  const css = await readFile('src/styles.css', 'utf8');
  const keys = {
    '--canvas': 'canvas', '--surface': 'surface', '--cloud': 'cloudSurface', '--text': 'textPrimary',
    '--muted': 'textSecondary', '--primary': 'primary', '--supporting-blue': 'supportingBlue',
    '--soft-blue': 'softBlue', '--light': 'primaryLight',
  } as const;
  for (const [key, token] of Object.entries(keys)) expect(css.toLowerCase()).toContain(`${key}: ${tokens.colors[token].toLowerCase()};`);
  function luminance(hex: string) {
    return [.2126, .7152, .0722].reduce((sum, weight, index) => {
      const channel = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
      return sum + weight * (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    }, 0);
  }
  const { textPrimary, textSecondary, surface, cloudSurface, softBlue, primaryLight, primary } = tokens.colors;
  for (const [foreground, background] of [
    [surface, textPrimary], [softBlue, textPrimary], [primaryLight, textPrimary], [textSecondary, cloudSurface], [surface, primary],
  ]) {
    const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    expect((high + .05) / (low + .05)).toBeGreaterThanOrEqual(4.5);
  }
});
