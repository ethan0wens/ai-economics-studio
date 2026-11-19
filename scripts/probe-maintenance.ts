import { inspectUkOffer, priceHeadings } from './microsoft-commercial';
import { sourceReader, regionSource, sizingSource, lifecycleSource, capabilitySource, main, tables } from './microsoft-source';
import { capabilityCells, lifecycleCells, regionalCells, sizingCells } from './microsoft-foundry';
import { curatedPrices } from './commercial-pricing';

const read = sourceReader();
const escape = (text: string) => text.replaceAll('%', '%25').replaceAll('\r', '').replaceAll('\n', '%0A');
const emit = (label: string, data: unknown) => console.log(`::notice title=${label}::${escape(JSON.stringify(data).slice(0, 2800))}`);
for (const source of [...new Set(curatedPrices.map(row => row.source)), regionSource, sizingSource, lifecycleSource, capabilitySource]) {
  const page = await read(source);
  const name = new URL(source).pathname.split('/').at(-1)!;
  if (!page.html) { emit(name, page.error); continue; }
  const parser = new Map([[regionSource, regionalCells], [sizingSource, sizingCells], [lifecycleSource, lifecycleCells], [capabilitySource, capabilityCells]] as const);
  const extract = [...parser].find(([link]) => link === source)?.[1];
  if (extract) {
    emit(name, { exact: extract(page.html).size, headers: tables(main(page.html)).slice(0, 8).map(t => [t.headings.at(-1),t.header.slice(0,4)]) });
  } else {
    emit(name, curatedPrices.filter(row => row.source === source).map(row =>
      [row.offeringId, row.product, inspectUkOffer(page.html!, [row.product], row.component === 'seats' ? 'seats' : 'pack',
        row.offeringId === 'm365-business-copilot-gb' ? 'monthly' : row.component === 'seats' ? 'annual' : 'monthly-pack')]));
    emit(name + ' titles', priceHeadings(page.html).filter(title => /entra|defender|copilot|microsoft 365|office 365|teams|mobility/i.test(title)));
  }
}
