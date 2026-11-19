# Environment schema and object fields

The executable contract is `environmentSchema` in [src/domain.ts](../../src/domain.ts). It wraps a strict Zod environment object with graph checks. Object payloads are a discriminated union tagged by `kind`. Required identity makes drafts addressable, with billing readiness evaluated separately.

## Top-level contract

| Field | Type and requirements | Meaning |
| --- | --- | --- |
| `schemaVersion` | Literal current schema version, see generated reference | The loader rejects unrecognised versions. |
| `id`, `name` | Trimmed non-empty strings, up to 300 characters | Workspace identity and display name. The ID must differ from all object IDs. |
| `description` | Optional trimmed string, up to 300 characters | User context carried in exports. |
| `createdAt`, `updatedAt` | ISO date-time including offset | Creation and most recent edit. |
| `region`, `currency` | Lowercase alphanumerics and hyphens for region, three uppercase letters for currency | Default billing scope. A new environment starts in `uksouth` with `GBP`. Exact catalogue availability is a separate concern. |
| `objects`, `relationships` | Arrays limited by the contract | The inventory and directed typed edges. |
| `pricingOverrides` | Array of up to 1,500 scoped pricing rules | Customer agreements, including effective time and reason. |
| `forecast` | Object with `percent`, `applyToFixed` and up to 1,500 `exceptions` | The global hypothetical percentage and exact-meter exceptions. Defaults to zero, fixed agreements unchanged, and an empty exception list. |
| `sourceSnapshot` | Optional strict object | Last exported catalogue identity, check time, known amounts and unresolved counts. Used for comparison after import. |
| `disclaimer` | Exact literal from the domain module | Carried in JSON and reports. Start from a real export to preserve it verbatim. |

Arrays start empty. `blankEnvironment` supplies IDs and timestamps. Shared field types below are numbers from zero through 10¹⁵ unless a narrower range is noted. A *count* is integral. Text is trimmed and capped at 300 characters. Free text can be empty unless the field requires identity, a name or a reason. Optional fields have no schema default unless specifically described. Missing and explicit zero have distinct meanings.

## Fields by object kind

Every object requires `id`, `name` and its literal `kind`. The generated reference below lists the actual schema's field names. The examples use object fragments suitable for insertion into a complete environment. See [validated imports](02-relationships-and-files.md#validated-example-files) for full files.

### Model deployment

| Fields | Type and role |
| --- | --- |
| `offeringId`, `modelId`, `modelVersion`, `sku` | Optional catalogue identifier and text. The catalogue stamp binds a precise tariff. Custom billing identity uses SKU or model ID, plus version when present. |
| `region`, `deploymentRegion` | Optional Azure codes. Billing inherits the environment region, while actual deployment region feeds technical checks. |
| `mode` | `payg` or `provisioned`. Drives token versus capacity lines. |
| `inputModality`, `outputModality` | `text`, `image`, `audio`, `video` or `embedding` for evidence checks. |
| `requiredFeature` | `function-calling`, `structured-outputs` or `responses` for reviewed capability checks. |
| `deployedModel`, `deployedVersion` | Actual model identity where the tariff represents generic capacity. |
| `inputMeter`, `outputMeter`, `capacityMeter` | Optional exact Consumption meter objects. |
| `capacity`, `billableHours` | Nonnegative numbers, hours capped at 744. The schema accepts draft capacity values. The technical path requires whole PTUs and applicable sizing constraints for a priced provisioned path. |
| `allocationBasis`, `comparisonOfferingId` | Literal `input-tokens` enables reporting allocation. A tariff ID selects an independent same-model/version PAYG comparison. |
| `peakInputTpm`, `peakOutputTpm` | Optional counts for advisory peak analysis. |
| `reservation` | Optional strict object. Text `sku` and `reference`, exact `region` and `currency`, positive integer `ptus`, `term` of string `1` or `12`, positive decimal-string `total`, ISO date `start` and `coveredHours` up to 744. Partial entry is a draft. Costing checks scope, dates, hours and unique reference. |

Examples include a linked model with `mode: "payg"` and a shared model with `mode: "provisioned"`, `capacity: 15` and `billableHours: 400`. These are planning settings. Rate matching and availability are checked separately.

### Agent

- Set `platform` to `foundry-agent-service` or `copilot-studio`. Set `modelSource` to `deployment-ref` or `platform-managed` as appropriate. `offeringId` can identify an applicable platform tariff. Links to models, usage profiles, licences or resources remain in the relationships array.
- Optional design declarations are `autonomy` (`read-only`, `approved-writes`, `autonomous-writes`), `sensitivity` (`public`, `internal`, `confidential`, `regulated`), `identity` (`delegated`, `application`) and `tools` text. They support advisory assessment.
- Optional `agentSetup` uses `current`, `classic-basic` or `classic-standard`. `promptEndpoint` is `chat-completions` or `responses`. These fields describe paths assessed by technical findings.
- Copilot usage can use numeric `credits`, or set `creditMethod` to `"breakdown"` and supply `creditBreakdown`. The breakdown accepts `classic`, `generative`, `actions`, `flows` and `other`. The active input method selects one set of values.
- Optional `includedUsage` accepts `credits`, a non-empty evidence `basis` for calculation and ISO date `expiresOn`. `platformMeter` is an exact meter object for applicable manual assumptions. For example, a platform-managed Copilot agent can declare `credits: 12000` for one modelled month.

### Usage profile

`executions` is a monthly count. `calls` is average requests per execution and may be fractional. `input`, `cachedInput` and `output` count tokens per request. `input` represents uncached tokens when the separate cached field is used. `retries` is a percentage from 0 to 100. The calculation interprets an omitted retry input as zero. `toolCalls` records planning context without adding its own meter. A valid draft can contain only its identity, then add `executions: 1000`, `calls: 1`, `input: 1500` and `output: 300`.

### User group

`population`, `intended`, `active` and `interactions` are optional nonnegative counts. A group might declare `population: 100`, `intended: 80` and `active: 40`. The calculation reports unexpected population bounds. A group supplies assignment scope and notes. Monthly usage and seats come from explicit usage and licence inputs rather than automatically from population.

### Licence entitlement

`offeringId` is an optional catalogue ID and `product` is descriptive text used in duplicate detection. `procurement` is `existing`, `incremental` or `unknown`. `seats` and `overlapSeats` are counts. `seatScope` is text for a distinct purchase pool. `existingMonthly` records a nonnegative monthly spend in the environment currency, and `meter` can describe an exact seat/month charge. For example `procurement: "existing"`, `seats: 40`, `existingMonthly: 720` records historical expenditure separately from new charges.

### Supporting resource

`offeringId`, `category`, `region`, `deploymentRegion`, `monthlyQuantity` and `meter` describe one resource and charge. The optional quantity is in the tariff's base units. For example `monthlyQuantity: 240` for an exact Search offering means 240 search-unit-hours. Manual rates require consistent units and billing scope. An unattached resource can still contribute its charge.

### Security policy

`control` is `identity`, `approval`, `audit`, `dlp` or `budget`. `status` is `implemented`, `planned`, `absent` or `unknown`. `detail` is optional text, for example a note about a proposed approval process. Link the policy to an agent, group or environment. It informs advisory findings. A billable control service is a separate supporting resource.

## Meter and pricing rule fields

A `Meter` contains `meterId`, `sku`, `region`, `unit`, positive `quantityPerUnit` and `priceType: "Consumption"`. Exact identity includes all six fields. An override adds `currency`, `reason`, optional `objectId` and optional `effectiveAt`. Its `mode` is `retail`, `fixed`, `discount` or `intentional-zero`. Fixed `value` is a positive decimal string with up to 16 whole and 15 fractional digits. Discount `value` is a number from 0 to 100. A forecast exception targets the same meter scope with `percent` from −100 to 10,000 and optional `applyToFixed`. See the [pricing precedence](03-agreements-and-licences.md#price-precedence) for selection and application.

## Optional value plan

Version 1.0.0 files can omit `valuePlan`. The optional object contains its currency and a strict set of assumptions. Each assumption holds a bounded nonnegative number, its source and an optional note of up to 300 characters. Audience is a whole count. Adoption and realisation are percentages up to 100. Unknown inputs are absent keys. Import recognises prior entered assumptions as imported and preserves fictional labels. An earlier application version can read the original file shape. It may reject a newer file containing the optional field.
