export {};

const sources: Record<string, [string, string, RegExp][]> = {
  region: [
    ['GLOBAL region matrix reinforced', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability?tabs=global-standard', /gpt-4.?1|eastus2|west europe|uk south|region/i],
    ['Regional markdown', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability.md', /gpt-4.?1|eastus2|west europe|uk south|region/i],
    ['Model availability linked', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-catalog-overview', /availability|supported|region/i],
  ],
  matrix: [
    ['Dedicated region matrix', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability', /Global Standard|gpt-4.1|region/i],
    ['Availability region matrix', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-availability', /Global Standard|gpt-4.1|region/i],
    ['GLOBAL region matrix', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?tabs=global-standard%2Cstandard-chat-completions', /Global Standard|gpt-4.1|region/i],
    ['REGIONAL region matrix', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?tabs=standard%2Cstandard-chat-completions', /Standard|gpt-4.1|region/i],
    ['Foundry GA overview', 'https://learn.microsoft.com/en-us/azure/foundry/agents/overview', /gpt-4.1|model deployment|connect|tool/i],
    ['Agent service current models', 'https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/models', /gpt-4.1|region|deployment/i],
    ['Agent service connected models', 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models', /gpt-4.1|supported|endpoint|connection/i],
    ['Search classic linked sources', 'https://learn.microsoft.com/en-us/azure/foundry-classic/agents/how-to/tools-classic/azure-ai-search', /same tenant|private|deprecated/i],
    ['UK enterprise exact', 'https://www.microsoft.com/en-gb/microsoft-365/enterprise/microsoft-365-plans-and-pricing', /£|paid yearly|VAT/i],
    ['Products by region', 'https://azure.microsoft.com/en-gb/explore/global-infrastructure/products-by-region/table', /Search|West Europe|UK South|East US 2/i],
  ],
  technical: [
    ['OpenAI standard', 'https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models', /gpt-4\.1|gpt-4o-mini|global standard|data zone standard/i],
    ['OpenAI regional matrices', 'https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions', /uksouth|westeurope|eastus2|gpt-4\.1/i],
    ['Foundry GA models', 'https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/model-region-support', /gpt-4\.1|region|network|support/i],
    ['Foundry GA Search', 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/ai-search', /tenant|managed identity|RBAC|private|classic|network/i],
    ['Foundry agents', 'https://learn.microsoft.com/en-us/azure/ai-foundry/agents/concepts/model-region-support', /uksouth|westeurope|eastus2|gpt-4\.1|network|regional/i],
    ['Provisioned', 'https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/provisioned-throughput', /minimum|capacity|quota|PTU/i],
    ['Search index', 'https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/azure-ai-search', /same|region|managed identity|role|private|tool/i],
    ['Copilot external', 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/bring-your-own-model-prompts', /custom prompt|deployment|model|managed identity/i],
  ],
  licensing: [
    ['Copilot eligibility', 'https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-licensing', /Microsoft 365 E3|Microsoft 365 E5|Office 365 E3|Business Basic|separate|qualifying/i],
    ['Copilot Studio', 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions', /25,000|included|Copilot Chat|users with|license|capacity/i],
    ['Agent 365', 'https://www.microsoft.com/en-gb/microsoft-agent-365', /license|require|E7|includes|GBP|£/i],
    ['Entra', 'https://www.microsoft.com/en-gb/security/business/microsoft-entra-pricing', /included|prerequisite|£|Microsoft 365 E3|Microsoft 365 E5/i],
    ['M365 enterprise', 'https://www.microsoft.com/en-gb/microsoft-365/enterprise/microsoft365-plans-and-pricing', /£|without Teams|paid yearly|VAT/i],
    ['Business', 'https://www.microsoft.com/en-gb/microsoft-365/business/compare-all-microsoft-365-business-products', /£|without Teams|paid yearly|VAT/i],
    ['Office 365', 'https://www.microsoft.com/en-gb/microsoft-365/enterprise/office365-plans-and-pricing', /£|without Teams|paid yearly|VAT/i],
    ['Defender', 'https://learn.microsoft.com/en-us/defender-xdr/prerequisites', /licens|Microsoft 365 E5|Office 365|Defender for Cloud Apps|Purview/i],
    ['Purview', 'https://learn.microsoft.com/en-us/purview/purview-licensing', /prerequisite|requires|E3|E5|licens/i],
    ['Copilot commercial', 'https://www.microsoft.com/en-gb/microsoft-365-copilot/pricing', /£|annual|commitment|VAT/i],
    ['Copilot credits', 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management', /included|interactive|licen|meter|25,000/i],
  ],
};

function plain(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#(?:163|xA3);|&pound;/gi, '£').replace(/\s+/g, ' ').trim();
}

await Promise.all((sources[process.argv[2]] ?? []).map(async ([title, source, terms]) => {
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(24_000) });
    const html = await response.text();
    const body = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(?:td|th)>/gi, ' | </td>');
    const rows = [...body.matchAll(/<(tr|p|li|h[1-5]|div)\b[^>]*>((?:(?!<\1\b)[\s\S])*?)<\/\1>/gi)]
      .map(match => plain(match[2])).filter(value => value.length > 4 && value.length < 650 && terms.test(value));
    const pricing = rows.filter(row => row.includes('£'));
    const tables = title.includes('region matrix') ? [...body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].flatMap((table, ordinal) => {
      const result = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => plain(row[1]));
      const header = result.find(row => /model.*\|.*version/i.test(row));
      const columns = header?.split('|').map(cell => cell.trim()) ?? [];
      const targetColumns = columns.flatMap((cell, index) => /eastus2|uksouth|westeurope/i.test(cell) ? [index] : []);
      const models = result.filter(row => /^(gpt-4(?:o(?:-mini)?|\.1(?:-mini|-nano)?)|deepseek-v3\.2|grok-4\.1|llama-4-maverick) \|/i.test(row));
      const preceding = body.slice(0, table.index);
      const section = [...preceding.matchAll(/<(?:section|div)[^>]*(?:tabpanel|data-tab)[^>]*>/gi)].at(-1)?.[0];
      const heading = [...preceding.matchAll(/<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/gi)].map(item => plain(item[1]))
        .filter(value => /global|regional|data zone|standard|provisioned|batch/i.test(value)).at(-1);
      return models.length && targetColumns.length ? [[
        `Table ${ordinal} | ${heading ?? ''} | ${section?.replaceAll('<', '[').replaceAll('>', ']') ?? ''}`,
        ['Model', 'Version', ...targetColumns.map(index => columns[index])].join(' | '),
        ...models.map(row => {
          const cells = row.split('|').map(cell => cell.trim());
          return [cells[0], cells[1], ...targetColumns.map(index => cells[index])].join(' | ');
        }),
      ].join('\n')] : [];
    }) : [];
    const links = ['Search classic linked sources', 'GLOBAL region matrix'].includes(title) ? [...body.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .filter(link => /new Foundry IQ|new agents|Region availability for Foundry Models|Model availability/i.test(plain(link[2]))).map(link => new URL(link[1], response.url).href) : [];
    if (title === 'GLOBAL region matrix reinforced') for (const group of tables.filter(table => /Regional Provisioned|Data Zone Provisioned/.test(table))) {
      const weekly = group.split('\n').filter((row, index) => index < 2 || /^gpt-4\.1|^gpt-4o-mini|^DeepSeek/i.test(row));
      if (weekly.length > 2) console.log(`::notice title=Exact regional evidence::${weekly.join('%0A')}`);
    }
    const markup = ['GLOBAL region matrix reinforced', 'Regional markdown'].includes(title) ? [
      `MIME ${response.headers.get('content-type')} · ${html.length} bytes · ${[...body.matchAll(/<table/g)].length} tables`,
      ...[...html.matchAll(/gpt-4\.1-mini|eastus2|uksouth|westeurope|mslearn-model|model-availability|model-region-availability/gi)].slice(0, 19)
        .map(hit => plain(html.slice(Math.max(0, hit.index - 42), hit.index + 115))),
    ] : [];
    const pageText = plain(body);
    const near = ['M365 enterprise', 'UK enterprise exact', 'Business', 'Office 365', 'Entra', 'Copilot commercial'].includes(title)
      ? [...pageText.matchAll(/£[0-9]+\.[0-9]+/g)].slice(0, 32).map(match => pageText.slice(Math.max(0, match.index - 90), match.index + 150)) : [];
    const output = [`HTTP ${response.status} ${response.url}`, ...[...new Set([...tables, ...markup, ...links, ...near, ...pricing, ...rows])].slice(0, title.includes('region matrix') ? 90 : 34)];
    console.log(`::notice title=${title}::${output.join('\n').replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
    await import('node:fs/promises').then(fs => fs.writeFile(`enterprise-${title.toLowerCase().replaceAll(' ', '-')}.txt`, output.join('\n')));
  } catch (error) {
    console.log(`::warning title=${title}::${error instanceof Error ? error.message : 'Could not read source'}`);
  }
}));
