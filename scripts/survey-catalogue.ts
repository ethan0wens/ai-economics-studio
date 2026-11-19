export {};

const learn = 'https://learn.microsoft.com/en-us/';
const gb = 'https://www.microsoft.com/en-gb/';
const foundry = learn + 'azure/foundry/';
const openai = foundry + 'openai/concepts/';
const azureModels = foundry + 'foundry-models/concepts/';
const groups: Record<string, [string, string][]> = {
  business: [
    ['Business Standard', gb + 'microsoft-365/business/microsoft-365-business-standard'],
    ['Business Premium', gb + 'microsoft-365/business/microsoft-365-business-premium'],
    ['Frontline', gb + 'microsoft-365/enterprise/frontline-plans-and-pricing'],
    ['Office 365 F3', gb + 'microsoft-365/enterprise/office-365-f3'],
    ['Teams Essentials', gb + 'microsoft-teams/small-medium-business'],
    ['Teams Essentials offer', gb + 'microsoft-teams/compare-microsoft-teams-business-options'],
    ['Copilot Business', gb + 'microsoft-365-copilot/pricing'],
    ['Business security descriptions', learn + 'microsoft-365/business-premium/m365-business-premium'],
  ],
  security: [
    ['Endpoint', gb + 'security/business/endpoint-security/microsoft-defender-endpoint'],
    ['Endpoint plan 1', learn + 'defender-endpoint/defender-endpoint-plan-1'],
    ['Identity', gb + 'security/business/siem-and-xdr/microsoft-defender-identity'],
    ['Office Defender', gb + 'security/business/siem-and-xdr/microsoft-defender-office-365'],
    ['Office Defender offer', gb + 'microsoft-365/exchange/advance-threat-protection'],
    ['Cloud Apps', gb + 'security/business/siem-and-xdr/microsoft-defender-cloud-apps'],
    ['Defender Suite', gb + 'security/business/microsoft-defender-pricing'],
    ['Purview', gb + 'security/business/microsoft-purview-pricing'],
    ['Purview offer', gb + 'security/business/microsoft-purview'],
    ['Purview licence terms', learn + 'purview/ediscovery-assign-permissions'],
    ['Purview service terms', learn + 'office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description'],
    ['Product Terms', 'https://www.microsoft.com/licensing/terms/productoffering/Microsoft365/MCA'],
  ],
  securityoffers: [
    ['Office Defender prices', gb + 'microsoft-365/exchange/advance-threat-protection'],
    ['Defender for Office offer', gb + 'security/business/siem-and-xdr/microsoft-defender-office-365'],
    ['Identity pricing', gb + 'security/business/identity-access/microsoft-defender-identity'],
    ['Purview Suite exact', gb + 'security/business/microsoft-purview-suite'],
    ['Office 365 F3 exact', gb + 'microsoft-365/enterprise/office-365-f3'],
    ['Frontline service', learn + 'office365/servicedescriptions/office-365-platform-service-description/office-365-plan-options'],
  ],
  meters: [
    ['GPT-family Azure meter identities', "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&currencyCode='GBP'&%24filter=armRegionName%20eq%20'uksouth'%20and%20priceType%20eq%20'Consumption'%20and%20productName%20eq%20'Azure%20OpenAI'%20and%20(contains(skuName,'gpt%205')%20or%20contains(skuName,'gpt-5')%20or%20contains(skuName,'GPT-5'))"],
    ['Public reservation tariff check by product', "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&currencyCode='GBP'&%24filter=priceType%20eq%20'Reservation'%20and%20contains(productName,'OpenAI')"],
  ],
  grid: [
    ['Regional cells compact', azureModels + 'models-sold-directly-by-azure-region-availability'],
  ],
  sizingvalues: [
    ['Sizing values compact', foundry + 'openai/how-to/provisioned-throughput-sizing'],
    ['Public reservation tariff check', "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&currencyCode='GBP'&%24filter=priceType%20eq%20'Reservation'%20and%20productName%20eq%20'Azure%20OpenAI'%20and%20(armRegionName%20eq%20'uksouth'%20or%20armRegionName%20eq%20'eastus2'%20or%20armRegionName%20eq%20'westeurope')"],
    ['Defender Suite offer terms', gb + 'security/business/siem-and-xdr/microsoft-defender-cloud-apps'],
    ['Defender Office plan terms', gb + 'security/business/siem-and-xdr/microsoft-defender-office-365'],
  ],
  sizing: [
    ['Exact minimums', foundry + 'openai/how-to/provisioned-throughput-sizing'],
    ['Reservation price sources', openai + 'provisioned-throughput-billing'],
    ['Model retirement schedule', openai + 'model-retirement-schedule'],
    ['Reservation catalogue Azure', "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&currencyCode='GBP'&%24filter=priceType%20eq%20'Reservation'%20and%20productName%20eq%20'Azure%20OpenAI'%20and%20(armRegionName%20eq%20'uksouth'%20or%20armRegionName%20eq%20'eastus2'%20or%20armRegionName%20eq%20'westeurope')"],
  ],
  throughput: [
    ['Azure OpenAI throughput', openai + 'provisioned-throughput'],
    ['Azure OpenAI onboarding', openai + 'provisioned-throughput-onboarding'],
    ['Foundry deployment types', azureModels + 'deployment-types'],
    ['Throughput reference', openai + 'provisioned-throughput-parameters'],
    ['Retirements', openai + 'model-retirements'],
    ['UK Azure pricing', 'https://azure.microsoft.com/en-gb/pricing/details/cognitive-services/openai-service/'],
    ['Reservations', learn + 'azure/cost-management-billing/reservations/azure-openai'],
  ],
  models: [
    ['Availability matrix', azureModels + 'models-sold-directly-by-azure-region-availability'],
    ['Model capabilities', azureModels + 'models-sold-directly-by-azure'],
    ['Partner availability', azureModels + 'models-from-partners-and-community'],
    ['Lifecycle', openai + 'model-retirements'],
    ['Agent capabilities', foundry + 'agents/how-to/connected-models'],
    ['Public baseline', 'https://ai-econmics-studio.ethan0wens.workers.dev/pricing/manifest.json'],
  ],
};

function plain(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#(?:163|xA3);|&pound;/gi, '£').replace(/&mdash;|&#8212;/g, '—').replace(/\s+/g, ' ').trim();
}
function notice(title: string, lines: string[]) {
  const escape = (value: string) => value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  let batch = '';
  for (const line of lines) {
    if (batch.length + line.length > 2900 && batch) {
      console.log(`::notice title=${title}::${escape(batch)}`);
      batch = '';
    }
    batch += line.slice(0, 2700) + '\n';
  }
  if (batch) console.log(`::notice title=${title}::${escape(batch)}`);
}
const focus = /gpt-4(?:\.1|o)|gpt-5(?:[ .-]|$)|^o[134](?:[ -]|$)|deepseek|llama|grok|mistral|cohere|embedding|image|whisper|transcri|^sora/i;
const markets = /eastus2|uksouth|westeurope/i;
const group = process.argv[2];
const { writeFile } = await import('node:fs/promises');
await Promise.all((groups[group] ?? []).map(async ([title, url]) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    const html = await response.text();
    const body = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/(?:td|th)>/gi, ' | </td>');
    const page = plain(body);
    const output = [`HTTP ${response.status} ${response.url}`];
    if (title === 'Public baseline') output.push(html);
    if (group === 'meters' && response.ok) {
      const parsed = JSON.parse(html) as { Items: Record<string, unknown>[]; NextPageLink?: string };
      const keys = ['serviceName','productName','skuName','meterName','unitOfMeasure','tierMinimumUnits','type','reservationTerm'];
      const observed = [...new Set(parsed.Items.map(row => keys.map(key => row[key] ?? '').join(' | ')))];
      output.push(`Returned ${parsed.Items.length} rows; has continuation ${!!parsed.NextPageLink}`,
        ...observed.filter(row => !title.startsWith('GPT-') || /(?:gpt[- ]5(?:[ -]mini|[ -]nano|[ .-]2|[ .-]4)?)(?![0-9.a-z])/i.test(row)).slice(0,120));
    }
    if (title.includes('reservation tariff') && response.ok) {
      const rows = JSON.parse(html) as { Items: Record<string, unknown>[]; NextPageLink?: string };
      output.push(`Returned ${rows.Items.length} rows; has continuation ${!!rows.NextPageLink}`,
        ...rows.Items.slice(0,12).map(row => JSON.stringify(row)));
    }
    if (['business', 'security', 'securityoffers'].includes(group) || title.includes('offer terms') || title.includes('plan terms')) {
      const prices = [...page.matchAll(/£\s*[\d,.]+/g)];
      output.push(...[...new Set(prices.map(hit => page.slice(Math.max(0, hit.index - 175), hit.index + 310)))].slice(0, 17));
      if (!prices.length) output.push('No GBP amount extracted from the accessible body.');
      const guidance = [...body.matchAll(/<(p|li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match => plain(match[2]))
        .filter(line => line.length < 480 && /eligible|prerequisite|included|requires|contact sales|contact your|licensing|plan 1|plan 2/i.test(line));
      output.push(...new Set(guidance.slice(0,9)));
    } else {
      for (const table of body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
        const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => plain(row[1]).split('|').map(cell => cell.trim()).slice(0, -1));
        const header = rows[0] ?? [];
        const regionIndices = header.flatMap((cell, index) => markets.test(cell) ? [index] : []);
        if (title === 'Regional cells compact') {
          if (!regionIndices.length) continue;
          const mode = [...body.slice(0, table.index).matchAll(/<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/gi)]
            .map(entry => plain(entry[1])).filter(label => /^(Global Standard|Data Zone Standard|Standard\/Regional|Global Provisioned Managed|Data Zone Provisioned Managed|Regional Provisioned Managed|Global Batch|Data Zone Batch)$/.test(label)).at(-1);
          if (!mode || mode.includes('Batch')) continue;
          for (const row of rows.slice(1)) if (/^(gpt-(?:4\.1(?:-mini|-nano)?|4o(?:-mini)?|5(?:-mini|-nano|\.1|\.2|\.4(?:-mini)?|\.6-sol)?|6-sol|audio(?:-mini)?|4o-mini-(?:tts|transcribe)|image-1\.5)|o[134](?:-mini)?|deepseek-v3\.2|llama-3\.3-70b-instruct|llama-4-maverick.*|grok-4\.1(?:-fast)?|text-embedding-3-(?:small|large))$/i.test(row[0])) {
            output.push([mode, row[0], row[1], ...regionIndices.map(i => header[i] + '=' + row[i])].join(' | '));
          }
          continue;
        }
        if (title === 'Sizing values compact') {
          const columns = header.flatMap((column,i) => /gpt-(?:4\.1|4o|5|6-sol|audio|image)|deepseek|llama|grok|^o[134]/i.test(column) ? [i] : []);
          for (const i of columns) {
            const values = rows.slice(1).filter(row => /minimum deployment|scale increment|input TPM per PTU|output-to-input/i.test(row[0])).map(row => row[0] + '=' + (row[i] ?? ''));
            if (values.length) output.push(header[i] + ' | ' + values.join(' | '));
          }
          continue;
        }
        if (title === 'Availability matrix' && !regionIndices.length) continue;
        const selected = rows.slice(1).filter(row => {
          if (title === 'Availability matrix') return focus.test(row[0]);
          if (title === 'Model capabilities') return focus.test(row[0]) && /input|output|embedding|transcri/i.test(row.join(' '));
          return /PTU|minimum|increment|retire|\b20[2-3]\d\b/i.test(row.join(' '));
        });
        if (!selected.length) continue;
        const sections = [...body.slice(0, table.index).matchAll(/<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/gi)].slice(-3).map(item => plain(item[1]));
        output.push(sections.join(' / '));
        const columns = regionIndices.length ? [0, 1, ...regionIndices] : header.map((_,i) => i);
        output.push(columns.map(i => header[i]).join(' | '));
        for (const row of selected) output.push(columns.map(i => row[i]).join(' | ').slice(0,600));
      }
      const links = [...body.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
        .filter(link => /throughput values|model throughput|reserve|reservation|retirement|model availability/i.test(plain(link[2])))
        .map(link => plain(link[2]) + ' | ' + new URL(link[1], response.url).href);
      output.push(...[...new Set(links)].slice(0,18));
      const paragraphs = [...body.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match => plain(match[2])).filter(line => line.length < 650 &&
        /per PTU|provisioning increment|PTU minimum|minimum deployment|reservation.*hour|capacity calculator|tokens per minute/i.test(line));
      output.push(...[...new Set(paragraphs)].slice(0,18));
    }
    await writeFile(`enterprise-accuracy-${title.toLowerCase().replaceAll(' ', '-')}.txt`, output.join('\n'));
    notice(title, output.slice(0, title === 'Regional cells compact' ? 380 : title === 'Availability matrix' ? 800 : 150));
  } catch (error) {
    notice(title, [String(error)]);
  }
}));
