import { PageSizes, rgb, type PDFDocument, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import tokens from '../design/tokens.json';

export function ink(hex: string) {
  return rgb(...[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255) as [number, number, number]);
}

export const colour = {
  navy: ink(tokens.colors.textPrimary), blue: ink(tokens.colors.primary), canvas: ink(tokens.colors.canvas),
  paleBlue: ink(tokens.colors.primaryLight), border: ink(tokens.colors.border), white: ink(tokens.colors.surface),
  muted: ink(tokens.colors.textSecondary), amber: ink('#854D0E'), paleAmber: ink('#FFFBEB'), red: ink('#991B1B'),
};
export const margin = 46;
const topInset = 76;
const bottomInset = 61;
const paragraphGap = 9;
const graphemes = new Intl.Segmenter('en-GB', { granularity: 'grapheme' });
const sanitise = /[\p{Bidi_Control}\p{Cc}]/gu;
export const safeText = (text: string) => text.normalize('NFC').replace(sanitise, char => char === '\n' ? char : ' ');

type Font = { pdf: PDFFont; supported: Set<number> };
export type ReportFonts = { regular: Font; bold: Font; extra?: Font };
export type Style = { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right'; leading?: number };
export type Column = { title: string; width: number; align?: 'left' | 'right' };
type Cell = string | { text: string; color?: RGB; bold?: boolean };
type Frame = { page: PDFPage; label: string; landscape: boolean; cover?: true };
type Line = { text: string; font: PDFFont; width: number }[];
type Box = { lines: Line[]; style: Style; width: number };
const bodySize = 10.2;
const step = (style: Style) => style.leading ?? (style.size ?? bodySize) * 1.32;

export class ReportLayout {
  private frames: Frame[] = [];
  private sections: { number: string; name: string; page: number }[] = [];
  private frame!: Frame;
  private contents?: Frame;
  y = 0;

  constructor(private document: PDFDocument, private fonts: ReportFonts) {}

  get page() { return this.frame.page; }
  get width() { return this.page.getWidth() - 2 * margin; }
  get remaining() { return this.y - bottomInset; }

  newPage(label = this.frame?.label ?? '', landscape = this.frame?.landscape ?? false, cover?: true) {
    const [width, height] = PageSizes.A4;
    const page = this.document.addPage(landscape ? [height, width] : [width, height]);
    this.frame = { page, label, landscape, cover };
    this.frames.push(this.frame);
    this.y = page.getHeight() - (cover ? 56 : topInset);
  }

  reserve(height: number) {
    if (height > this.remaining) this.newPage();
  }

  private fontFor(text: string, bold?: boolean) {
    const primary = this.fonts[bold ? 'bold' : 'regular'];
    const supported = (font: Font) => [...text].every(char => font.supported.has(char.codePointAt(0)!));
    if (supported(primary)) return { pdf: primary.pdf, text };
    if (this.fonts.extra && supported(this.fonts.extra)) return { pdf: this.fonts.extra.pdf, text };
    return { pdf: primary.pdf, text: primary.supported.has(0x25a1) ? '□' : '?' };
  }

  private runs(text: string, style: Style): Line {
    const size = style.size ?? bodySize;
    const groups: { text: string; font: PDFFont }[] = [];
    for (const { segment } of graphemes.segment(text)) {
      const part = this.fontFor(segment, style.bold);
      const last = groups.at(-1);
      if (last?.font === part.pdf) last.text += part.text;
      else groups.push({ text: part.text, font: part.pdf });
    }
    return groups.map(group => ({ ...group, width: group.font.widthOfTextAtSize(group.text, size) }));
  }

  lineWidth(line: Line) { return line.reduce((sum, run) => sum + run.width, 0); }

  wrap(value: string, width: number, style: Style = {}): Line[] {
    const output: Line[] = [];
    for (const paragraph of safeText(value).split('\n')) {
      let current = '';
      for (const word of paragraph.trim().split(/\s+/u)) {
        const candidate = current ? `${current} ${word}` : word;
        if (this.lineWidth(this.runs(candidate, style)) <= width) { current = candidate; continue; }
        if (current) output.push(this.runs(current, style));
        current = '';
        for (const { segment } of graphemes.segment(word)) {
          if (current && this.lineWidth(this.runs(current + segment, style)) > width) {
            output.push(this.runs(current, style));
            current = '';
          }
          current += segment;
        }
      }
      output.push(this.runs(current, style));
    }
    return output;
  }

  draw(page: PDFPage, line: Line, x: number, top: number, width: number, style: Style = {}) {
    const size = style.size ?? bodySize;
    let left = x + (style.align === 'right' ? width - this.lineWidth(line) : 0);
    for (const run of line) {
      page.drawText(run.text, { x: left, y: top - size, font: run.font, size, color: style.color ?? colour.navy });
      left += run.width;
    }
  }

  at(value: string, x: number, top: number, width: number, style: Style = {}) {
    const lines = this.wrap(value, width, style);
    this.drawLines(this.page, lines, x, top, width, style);
    return lines.length * step(style);
  }

  private drawLines(page: PDFPage, lines: Line[], x: number, top: number, width: number, style: Style) {
    lines.forEach((line, index) => this.draw(page, line, x, top - index * step(style), width, style));
  }

  paragraph(value: string, style: Style = {}, gap = paragraphGap) {
    const lines = this.wrap(value, this.width, style);
    if (lines.length <= 3) this.reserve(lines.length * step(style));
    for (const line of lines) {
      this.reserve(step(style));
      this.draw(this.page, line, margin, this.y, this.width, style);
      this.y -= step(style);
    }
    this.y -= gap;
  }

  section(name: string, intro?: string, landscape = false) {
    if (this.frame !== this.contents || this.frame.label !== 'Contents') this.newPage(name, landscape);
    else this.frame.label = name;
    const number = String(this.sections.length + 1).padStart(2, '0');
    this.sections.push({ number, name, page: this.frames.length });
    this.paragraph(number, { size: 11, bold: true, color: colour.blue }, 5);
    this.paragraph(name, { size: 24, bold: true }, 8);
    if (intro) this.paragraph(intro, { color: colour.muted }, 15);
  }

  subhead(name: string, room = 48) {
    const style = { size: 13.5, bold: true };
    this.reserve(room + this.wrap(name, this.width, style).length * step(style) + 10);
    this.y -= 3;
    this.paragraph(name, style, 7);
  }

  callout(title: string, message: string, warning = false) {
    const width = this.width - 26;
    const titleStyle = { size: 10, bold: true, color: warning ? colour.amber : colour.navy };
    const bodyStyle = { size: 9.6, color: warning ? colour.amber : colour.muted };
    const top = this.wrap(title, width, titleStyle);
    const body = this.wrap(message, width, bodyStyle);
    const height = top.length * step(titleStyle) + body.length * step(bodyStyle) + 25;
    this.reserve(height);
    this.page.drawRectangle({ x: margin, y: this.y - height, width: this.width, height, color: warning ? colour.paleAmber : colour.canvas });
    this.page.drawRectangle({ x: margin, y: this.y - height, width: 2, height, color: warning ? colour.amber : colour.blue });
    this.drawLines(this.page, top, margin + 13, this.y - 11, width, titleStyle);
    this.drawLines(this.page, body, margin + 13, this.y - 14 - top.length * step(titleStyle), width, bodyStyle);
    this.y -= height + 10;
  }

  cards(cards: { label: string; value: string; note: string; warning?: boolean }[]) {
    const columns = 2;
    const gap = 10;
    const width = (this.width - gap) / columns;
    const styles = [{ size: 9.5, bold: true, color: colour.muted }, { size: 22, bold: true }, { size: 8.5, color: colour.muted }];
    for (let start = 0; start < cards.length; start += columns) {
      const group = cards.slice(start, start + columns).map(card => ({
        boxes: [card.label, card.value, card.note].map((text, index) => {
          const style = index === 1 && card.warning ? { ...styles[index], color: colour.amber } : styles[index];
          return { lines: this.wrap(text, width - 26, style), style };
        }),
      }));
      const height = Math.max(...group.map(({ boxes }) => boxes.reduce((sum, box) => sum + box.lines.length * step(box.style) + 2, 23)));
      this.reserve(height);
      group.forEach(({ boxes }, index) => {
        const x = margin + index * (width + gap);
        this.page.drawRectangle({ x, y: this.y - height, width, height, color: colour.canvas, borderColor: colour.border, borderWidth: .6 });
        let top = this.y - 12;
        for (const box of boxes) {
          this.drawLines(this.page, box.lines, x + 13, top, width - 26, box.style);
          top -= box.lines.length * step(box.style) + 2;
        }
      });
      this.y -= height + gap;
    }
  }

  table(columns: Column[], rows: Cell[][], options: { size?: number; caption?: string; heading?: string; intro?: string } = {}) {
    if (!rows.length) return;
    const cellPadding = 5.5;
    const styles = { head: { size: 8.2, bold: true, color: colour.white }, body: { size: options.size ?? 9.15 } };
    const widths = columns.map(column => column.width * this.width);
    const build = (cells: Cell[], style: Style): Box[] => cells.map((cell, index) => {
      const data = typeof cell === 'string' ? { text: cell } : cell;
      const cellStyle = { ...style, bold: data.bold ?? style.bold, color: data.color ?? style.color, align: columns[index].align };
      return { lines: this.wrap(data.text, widths[index] - cellPadding * 2, cellStyle), style: cellStyle, width: widths[index] };
    });
    const leading = step(styles.body);
    const height = (boxes: Box[]) => Math.max(...boxes.map(box => box.lines.length * step(box.style))) + cellPadding * 2;
    const headings = build(columns.map(column => column.title), styles.head);
    const titleStyle = { size: 8.5, bold: true, color: colour.muted };
    const paint = (boxes: Box[], rowHeight: number, fill: RGB) => {
      this.page.drawRectangle({ x: margin, y: this.y - rowHeight, width: this.width, height: rowHeight, color: fill });
      let left = margin;
      for (const box of boxes) {
        this.drawLines(this.page, box.lines, left + cellPadding, this.y - cellPadding, box.width - cellPadding * 2, box.style);
        left += box.width;
      }
      this.y -= rowHeight;
      this.page.drawLine({ start: { x: margin, y: this.y }, end: { x: margin + this.width, y: this.y }, color: colour.border, thickness: .45 });
    };
    const head = (continued = false) => {
      if (continued && options.caption) this.paragraph(`${options.caption} · continued`, titleStyle, 6);
      paint(headings, height(headings), colour.navy);
    };
    const headingStyle = { size: 13.5, bold: true };
    const introStyle = { size: 9.4, color: colour.muted };
    const headingRoom = (options.heading ? this.wrap(options.heading, this.width, headingStyle).length * step(headingStyle) + 9 : 0)
      + (options.intro ? this.wrap(options.intro, this.width, introStyle).length * step(introStyle) + 9 : 0);
    const fresh = this.page.getHeight() - topInset - bottomInset - height(headings) - 22;
    const firstRowHeight = Math.min(height(build(rows[0], styles.body)), fresh - headingRoom);
    this.reserve(headingRoom + height(headings) + firstRowHeight);
    if (options.heading) this.paragraph(options.heading, headingStyle);
    if (options.intro) this.paragraph(options.intro, introStyle);
    head();
    rows.forEach((row, index) => {
      const boxes = build(row, styles.body);
      const rowHeight = height(boxes);
      if (index && rowHeight > this.remaining && (rowHeight <= fresh || this.remaining < 55)) { this.newPage(); head(true); }
      const fill = index % 2 ? colour.canvas : colour.white;
      if (rowHeight <= this.remaining) { paint(boxes, rowHeight, fill); return; }
      const maxLines = Math.max(...boxes.map(box => box.lines.length));
      let offset = 0;
      while (offset < maxLines) {
        const count = Math.max(1, Math.floor((this.remaining - cellPadding * 2) / leading));
        const slice = boxes.map(box => ({ ...box, lines: box.lines.slice(offset, offset + count) }));
        paint(slice, Math.max(...slice.map(box => box.lines.length)) * leading + cellPadding * 2, fill);
        offset += count;
        if (offset < maxLines) { this.newPage(); head(true); }
      }
    });
    this.y -= 10;
  }

  bars(rows: { name: string; amount: string; share: string; width: number | null; unresolved: string; color: RGB }[]) {
    const amountStyle = { size: 10, bold: true, align: 'right' as const };
    const detailStyle = { size: 8.6, color: colour.muted, align: 'right' as const };
    for (const row of rows) {
      const amount = this.wrap(row.amount, 156, amountStyle);
      const height = Math.max(31, amount.length * step(amountStyle) + 16);
      this.reserve(height);
      this.at(row.name, margin, this.y, 142, { size: 9.6, bold: true });
      if (row.width !== null) {
        this.page.drawRectangle({ x: margin + 144, y: this.y - 10, width: this.width - 313, height: 6, color: colour.border });
        if (row.width > 0) this.page.drawRectangle({ x: margin + 144, y: this.y - 10, width: (this.width - 313) * row.width, height: 6, color: row.color });
      }
      const right = margin + this.width - 156;
      this.drawLines(this.page, amount, right, this.y, 156, amountStyle);
      this.at([row.share, row.unresolved].filter(Boolean).join(' · '), right - 40, this.y - amount.length * step(amountStyle), 196, detailStyle);
      this.y -= height;
    }
    this.y -= 5;
  }

  reserveContents() {
    this.newPage('Contents', false);
    this.contents = this.frame;
    // The six entries fit in this block at the measured contents styles.
    this.y -= 242;
  }

  finish() {
    if (this.contents) {
      this.frame = this.contents;
      this.y = this.page.getHeight() - topInset;
      this.paragraph('Contents', { size: 25, bold: true }, 12);
      this.table([{ title: 'Section', width: .12 }, { title: 'Report section', width: .73 }, { title: 'Page', width: .15, align: 'right' }],
        this.sections.map(row => [row.number, row.name, String(row.page)]));
      this.paragraph('Page numbers refer to the printed report.', { size: 9, color: colour.muted });
    }
    this.frames.forEach(({ page, label, cover }, index) => {
      const width = page.getWidth() - margin * 2;
      const top = page.getHeight() - 33;
      const small = { size: 8, color: colour.muted };
      if (!cover) {
        this.draw(page, this.runs('AI Economics Studio', { ...small, bold: true }), margin, top, width, { ...small, bold: true });
        this.draw(page, this.runs(label, small), margin, top, width, { ...small, align: 'right' });
        page.drawLine({ start: { x: margin, y: top - 17 }, end: { x: margin + width, y: top - 17 }, color: colour.border, thickness: .7 });
      }
      page.drawLine({ start: { x: margin, y: 43 }, end: { x: margin + width, y: 43 }, color: colour.border, thickness: .7 });
      this.draw(page, this.runs('Independent planning assessment', small), margin, 32, width, small);
      this.draw(page, this.runs(`Page ${index + 1} of ${this.frames.length}`, small), margin, 32, width, { ...small, align: 'right' });
    });
  }
}
