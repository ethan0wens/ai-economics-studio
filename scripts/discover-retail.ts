// Read-only candidate discovery. Output is evidence for reviewing mappings, never a catalogue.
export {};

const origin = 'https://prices.azure.com';
const filters = {
  'Azure OpenAI provisioned': "productName eq 'Azure OpenAI' and (contains(skuName,'Provisioned') or contains(skuName,'PTU'))",
  'Copilot credit meters': "contains(meterName,'Copilot Credit')",
  'Sentinel conventional': "contains(productName,'Sentinel') and contains(meterName,'Analysis')",
};
if (process.argv[2] !== 'commercial') for (const [name, filter] of Object.entries(filters)) {
  try {
    let url: URL | undefined = new URL('/api/retail/prices', origin);
    url.searchParams.set('api-version', '2023-01-01-preview');
    url.searchParams.set('currencyCode', "'GBP'");
    url.searchParams.set('$filter', `${name.startsWith('Copilot') ? '' : "armRegionName eq 'uksouth' and "}priceType eq 'Consumption' and (${filter})`);
    const rows: string[] = [];
    const seen = new Set<string>();
    for (let page = 0; url && page < 4; page++) {
      if (url.origin !== origin || url.pathname !== '/api/retail/prices' || seen.has(url.href)) throw new Error('Invalid continuation');
      seen.add(url.href);
      const response: Response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json() as { Items: Record<string, string | number>[]; NextPageLink?: string };
      for (const record of body.Items) {
        rows.push(['armRegionName', 'serviceName', 'productName', 'skuName', 'armSkuName', 'meterName', 'unitOfMeasure', 'tierMinimumUnits', 'meterId', 'retailPrice', 'effectiveStartDate'].map(k => record[k]).join(' | '));
      }
      url = body.NextPageLink ? new URL(body.NextPageLink) : undefined;
    }
    const unique = [...new Set(rows)].sort();
    const sample = unique.slice(0, 16).join('%0A');
    console.log(`::notice title=${name} ${unique.length} candidates::${sample || 'No candidates returned'}`);
  } catch (error) {
    console.log(`::notice title=${name}::${error instanceof Error ? error.message : 'Discovery failed'}`);
  }
}
if (process.argv[2] === 'commercial') for (const [name, address] of Object.entries({
  'Copilot Studio pricing UK': 'https://www.microsoft.com/en-gb/microsoft-365-copilot/microsoft-copilot-studio#Pricing',
  'Copilot Studio pricing US': 'https://www.microsoft.com/en-us/microsoft-365-copilot/microsoft-copilot-studio#Pricing',
  'Microsoft 365 Copilot pricing UK': 'https://www.microsoft.com/en-gb/microsoft-365-copilot/pricing',
  'Agent 365 UK': 'https://www.microsoft.com/en-gb/microsoft-agent-365',
  'Entra UK': 'https://www.microsoft.com/en-gb/security/business/microsoft-entra-pricing',
})) {
  try {
    const response = await fetch(address, { signal: AbortSignal.timeout(18000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const plain = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ').replace(/&pound;|&#163;/g, '£').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
    const matches = [...plain.matchAll(/(?:£|\$)\s*\d+(?:[.,]\d+)*|Microsoft Entra ID P[12]|Agent 365|per (?:Copilot )?credit/gi)].slice(0, 36);
    const snippets = [...new Set(matches.map(match => plain.slice(Math.max(0, match.index - 105), match.index + 120)))];
    const message = snippets.join('\n').replaceAll('%', '%25').replaceAll('\n', '%0A').replaceAll('\r', '%0D');
    console.log(`::notice title=${name}::${message || 'No rendered price snippets found'}`);
  } catch (error) { console.log(`::notice title=${name}::${error instanceof Error ? error.message : 'Source failed'}`); }
}
