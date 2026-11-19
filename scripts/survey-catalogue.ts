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
    if (group === 'business' || group === 'security') {
      const prices = [...page.matchAll(/£\s*[\d,.]+/g)];
      output.push(...[...new Set(prices.map(hit => page.slice(Math.max(0, hit.index - 130), hit.index + 126)))].slice(0, 17));
      if (!prices.length) output.push('No GBP amount extracted from the accessible body.');
      const guidance = [...body.matchAll(/<(p|li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match => plain(match[2]))
        .filter(line => line.length < 480 && /eligible|prerequisite|included|requires|contact sales|contact your|licensing|plan 1|plan 2/i.test(line));
      output.push(...new Set(guidance.slice(0,9)));
    } else {
      for (const table of body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
        const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => plain(row[1]).split('|').map(cell => cell.trim()).slice(0, -1));
        const header = rows[0] ?? [];
        const regionIndices = header.flatMap((cell, index) => markets.test(cell) ? [index] : []);
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
    notice(title, output.slice(0, title === 'Availability matrix' ? 800 : 130));
  } catch (error) {
    notice(title, [String(error)]);
  }
}));
