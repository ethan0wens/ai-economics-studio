export {};

const groups: Record<string, [string, string, string?][]> = {
  focused: [
    ['New OpenAI', "serviceName eq 'Foundry Models' and productName eq 'Azure OpenAI' and (contains(meterName,'gpt 5 mini') or contains(meterName,'gpt-5-mini') or contains(meterName,'o3 mini') or contains(meterName,'o3-mini'))"],
    ['Embeddings and speech', "serviceName eq 'Foundry Models' and productName eq 'Azure OpenAI' and (contains(meterName,'embedding') or contains(meterName,'transcribe') or contains(meterName,'whisper'))"],
    ['Grok', "serviceName eq 'Foundry Models' and productName eq 'Azure Grok Models'"],
    ['Llama', "serviceName eq 'Foundry Models' and productName eq 'Azure Llama Models'"],
    ['Azure Private Link', "contains(meterName,'Private Endpoint') and contains(productName,'Private Link')"],
    ['Azure NAT', "contains(meterName,'NAT Gateway') and serviceName eq 'Virtual Network'"],
  ],
  models: [
    ['OpenAI', "serviceName eq 'Foundry Models' and productName eq 'Azure OpenAI'", "gpt.?4\.1 |gpt.?4o |o3.mini|gpt.?5.mini|embedding|speech|Whisper|Provisioned Managed"],
    ['Partners', "serviceName eq 'Foundry Models' and productName ne 'Azure OpenAI'", "DeepSeek|Llama|Grok|Mistral|Cohere|Claude"],
  ],
  compute: [
    ['Dsv5', "serviceName eq 'Virtual Machines' and productName eq 'Virtual Machines Dsv5 Series'"],
    ['Esv5', "serviceName eq 'Virtual Machines' and productName eq 'Virtual Machines Esv5 Series'"],
    ['Container Apps', "serviceName eq 'Azure Container Apps'"],
    ['Kubernetes', "serviceName eq 'Azure Kubernetes Service'"],
    ['Functions', "serviceName eq 'Functions'"],
    ['Container Instances', "serviceName eq 'Container Instances'"],
  ],
  data: [
    ['Storage', "serviceName eq 'Storage' and productName eq 'General Block Blob v2' and (contains(meterName,'LRS Read Operations') or contains(meterName,'LRS Write Operations'))"],
    ['Search', "productName eq 'Azure AI Search' and contains(meterName,'Unit')"],
    ['SQL', "serviceName eq 'SQL Database' and productName eq 'SQL Database Single Standard'"],
    ['Cosmos DB', "serviceName eq 'Azure Cosmos DB' and (contains(meterName,'RU') or contains(meterName,'Data Stored'))"],
    ['PostgreSQL', "serviceName eq 'Azure Database for PostgreSQL' and contains(productName,'Flexible Server')"],
    ['Redis', "contains(serviceName,'Redis') and contains(meterName,'Cache')"],
  ],
  operations: [
    ['Private Link', "serviceName eq 'Azure Private Link'"],
    ['NAT Gateway', "contains(productName,'NAT Gateway')"],
    ['Monitor', "serviceName eq 'Azure Monitor' and (contains(meterName,'Query') or contains(meterName,'Data Collection'))"],
    ['Key Vault', "serviceName eq 'Key Vault'"],
    ['Service Bus', "serviceName eq 'Service Bus'"],
    ['Event Hubs', "serviceName eq 'Event Hubs'"],
  ],
};
const origin = 'https://prices.azure.com';
for (const [name, filter, match] of groups[process.argv[2]] ?? []) {
  try {
    let url: URL | null = new URL('/api/retail/prices', origin);
    url.searchParams.set('api-version', '2023-01-01-preview');
    url.searchParams.set('currencyCode', "'GBP'");
    url.searchParams.set('$filter', `armRegionName eq 'uksouth' and priceType eq 'Consumption' and (${filter})`);
    const results = new Map<string, Set<number>>();
    for (let n = 0; url && n < 5; n++) {
      if (url.origin !== origin || url.pathname !== '/api/retail/prices') throw new Error('Unexpected continuation');
      const response: Response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = await response.json() as { Items: Record<string, string>[]; NextPageLink?: string };
      for (const row of page.Items) {
        const key = ['serviceName','productName','skuName','armSkuName','meterName','unitOfMeasure'].map(field => row[field] ?? '').join(' | ');
        if (match && !new RegExp(match, 'i').test(key)) continue;
        const tiers = results.get(key) ?? new Set<number>();
        tiers.add(Number(row.tierMinimumUnits));
        results.set(key, tiers);
      }
      url = page.NextPageLink ? new URL(page.NextPageLink) : null;
    }
    const rows = [...results].sort().slice(0, name === 'OpenAI' ? 75 : 24).map(([key, tiers]) => `${key} | ${[...tiers].sort((a,b)=>a-b)}`);
    const output = (rows.join('\n') || 'No candidates').replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
    console.log(`::notice title=${name} ${results.size} signatures::${output}`);
  } catch (error) {
    console.log(`::notice title=${name}::${error instanceof Error ? error.message : 'Survey failed'}`);
  }
}
