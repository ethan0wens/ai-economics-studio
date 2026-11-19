export {};

const sources: Record<string, [string, string, RegExp][]> = {
  technical: [
    ['OpenAI standard', 'https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models', /gpt-4\.1|gpt-4o-mini|global standard|data zone standard/i],
    ['OpenAI regional matrices', 'https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions', /uksouth|westeurope|eastus2|gpt-4\.1/i],
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
    ['Purview', 'https://www.microsoft.com/en-gb/security/business/microsoft-purview-pricing', /£|includes|prerequisite|requires|E3|E5/i],
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
    const output = [`HTTP ${response.status} ${response.url}`, ...[...new Set([...pricing, ...rows])].slice(0, 44)];
    console.log(`::notice title=${title}::${output.join('\n').replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
    await import('node:fs/promises').then(fs => fs.writeFile(`enterprise-${title.toLowerCase().replaceAll(' ', '-')}.txt`, output.join('\n')));
  } catch (error) {
    console.log(`::warning title=${title}::${error instanceof Error ? error.message : 'Could not read source'}`);
  }
}));
