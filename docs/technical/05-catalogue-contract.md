# Catalogue formats, provenance and live coverage

The pricing catalogue answers two questions: which product configurations the studio represents and which of their components have a matching current public rate. The inventory can describe supported configurations with absent or partial prices, and explicitly unsupported configurations.

## Public assets and contracts

| Asset or source | Contract and purpose |
| --- | --- |
| `/pricing/manifest.json` | `Manifest` with `schemaVersion`, `catalogueId`, `records`, `lastCheckedAt` and `previous`. The current ID is a hex SHA-256 digest. An empty bootstrap has a null current ID, null timestamp and zero records. |
| `/pricing/catalogue-<sha256>.json` | Immutable UTF-8 snapshot with `schemaVersion`, rate records and normally offering inventory. Digest covers the exact asset bytes, including formatting and trailing line break when published by CI. |
| `/pricing/health.json` | Deployment-generated release metadata plus maintenance evidence. The release reports application revision, catalogue ID, last pricing check, evidence hash, coverage and previous Cloudflare version. |
| [Scope](../../catalogue/scope.json), [pinned meters](../../catalogue/pinned.json) and [retained offerings](../../catalogue/retained.json) | Declare bounded products, normalised units and known identities. Discovery and reviewed additions produce the broad published inventory. |
| [Commercial prices](../../catalogue/commercial.json) | Reviewed public UK prices with provenance, expected terms and expiry. |
| [Compatibility](../../catalogue/compatibility.json), [entitlements](../../catalogue/entitlements.json) and [PTU sizing](../../catalogue/provisioned.json) | Dated evidence for three separate decisions. These inputs are bundled into the application and validated independently of the price file. |

[Catalogue schema](../../src/catalogue.ts), [offering schema](../../src/offerings.ts) and [health schema](../../src/catalogue-health.ts) define the contracts. Published inventory binds one rate per exact offering component and currency. Rate rows contain a meter, price decimal string, product, currency, source URL, effective time, verification type and optional tier or publication metadata. Azure graduated records require strictly ascending tier starts beginning at zero. The commercial review metadata identifies the check and expiry. The validator rejects mismatched or duplicate identities, unexpected fields and unverifiable provenance shapes.

## Exact price identity

`meterKey` contains meter ID, SKU, billing region, displayed unit, number of base units in the billed unit and price type. Price selection also matches the environment currency and the source's effective time and review window. `resolveOffering` requires one exact offering/component match. `findRetail` handles an explicit meter match, including usage rows where allowed. Both return no record for ambiguity. `offeringFor` binds model ID, version, SKU and mode to the selected offering. A manual custom model usually resolves through the customer's own scoped price. The UK commercial market can apply separately from the Azure billing region.

Verified provenance means an exact current Azure Retail Prices API row or a reviewed Microsoft commercial offer match. Ingested rate and availability evidence have different scope. A verified retail record does not establish a customer's actual rate, licence eligibility or production availability. When a component is unpriced, preserve the unresolved subtotal and add an evidenced manual assumption only when a valid meter and quantity are available.

## Coverage and freshness

The generated public coverage table uses `catalogueCoverage` against the actual applied catalogue and evaluation date. The supported denominator excludes explicitly unsupported offerings. A fully priced configuration has every listed component resolved, partial means some, and unpriced means none. Marketing or governance gaps can be documented separately from the offer counts. The public rate count includes the records in the snapshot, and it can differ from the count actionable at the valuation date after review expiry.

`environmentCompleteness` groups current ledger rows by object. It distinguishes complete, partial, no resolved rates with known quantities, and rows awaiting configuration. Customer agreements can resolve some current amounts without adding verified Microsoft rates to the inventory. An object may appear under both retail and manual scope if it has multiple components. [Coverage implementation](../../src/coverage.ts).

## Loading and reproducibility

The browser revalidates the manifest, checks SHA-256 and validates the current asset and its expected record count. A bad current asset can fall back to the previous digest, with the applied ID changed and current check time unavailable in the fall-back state. If the manifest fails to load or both assets fail, the initially empty catalogue leaves retail unresolved. A manual check may set a candidate that comes into use when the user applies it. A failed later check keeps the applied catalogue. Health details are shown when application metadata matches the applied manifest identity and check time.

Record application commit, hash, evidence revision and assessment date together for a historical replay. A manifest and a fingerprint alone cannot reconstruct expired source evidence or every rate. Keep the catalogue from a relevant Git revision if exact historical data are required. The environment's downloaded snapshot is a comparison record, and opening it recalculates. [Import and export details](02-relationships-and-files.md#import-contract-and-historical-snapshots).
