// Read-only candidate discovery. Output is evidence for reviewing mappings, never a catalogue.
const origin = 'https://prices.azure.com';
const filters = {
  'Foundry UK South': "(contains(productName,'OpenAI') or contains(meterName,'gpt-4o-mini'))",
  'Foundry provisioned': "(contains(meterName,'Provisioned') or contains(meterName,'PTU')) and serviceName eq 'Cognitive Services'",
  'Search': "(serviceName eq 'Azure Cognitive Search' or serviceName eq 'Azure AI Search')",
  'Storage': "productName eq 'General Block Blob v2' and (contains(meterName,'LRS Data Stored') or contains(meterName,'LRS Read Operations') or contains(meterName,'LRS Write Operations'))",
  'Monitoring': "serviceName eq 'Log Analytics' and contains(meterName,'Data Ingestion')",
  'Database': "serviceName eq 'SQL Database' and contains(meterName,'S0')",
  'Networking': "serviceName eq 'Bandwidth' and contains(meterName,'Data Transfer Out')",
  'Sentinel': "(serviceName eq 'Microsoft Sentinel' or serviceName eq 'Azure Sentinel') and contains(meterName,'Analysis')",
};
for (const [name, filter] of Object.entries(filters)) {
  try {
    let url: URL | undefined = new URL('/api/retail/prices', origin);
    url.searchParams.set('api-version', '2023-01-01-preview');
    url.searchParams.set('currencyCode', "'GBP'");
    url.searchParams.set('$filter', `armRegionName eq 'uksouth' and priceType eq 'Consumption' and (${filter})`);
    const rows: string[] = [];
    const seen = new Set<string>();
    for (let page = 0; url && page < 4; page++) {
      if (url.origin !== origin || url.pathname !== '/api/retail/prices' || seen.has(url.href)) throw new Error('Invalid continuation');
      seen.add(url.href);
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      for (const record of body.Items) {
        const label = `${record.productName} ${record.skuName} ${record.meterName}`;
        if (name === 'Foundry UK South' && !/gpt[- ]4o[- ]mini|gpt[- ]4\.1[- ]mini/i.test(label)) continue;
        rows.push(['serviceName', 'productName', 'skuName', 'armSkuName', 'meterName', 'unitOfMeasure', 'tierMinimumUnits', 'meterId', 'retailPrice', 'effectiveStartDate'].map(k => record[k]).join(' | '));
      }
      url = body.NextPageLink ? new URL(body.NextPageLink) : undefined;
    }
    const unique = [...new Set(rows)].sort();
    for (let i = 0; i < Math.min(unique.length, 32); i += 6) {
      console.log(`::notice title=${name} ${i + 1} of ${unique.length}::${unique.slice(i, i + 6).join('%0A')}`);
    }
    if (unique.length === 0) console.log(`::notice title=${name}::No candidates returned`);
  } catch (error) {
    console.log(`::notice title=${name}::${error instanceof Error ? error.message : 'Discovery failed'}`);
  }
}
