# 03 — Versioned environment domain model

> See the [technical reference](technical/02-environment-schema.md) for current implementation and procedures. This document also records earlier design decisions.

## Modeling philosophy

All editable entities are **objects**, references are typed edges by stable IDs, not embedded object copies. Users create objects in **any order**. Objects have `draft | configured | invalid | unsupported` computed status, and a list of actionable validation messages; status should not be trusted when deserialized, but recomputed.

Provider-neutral core type IDs and monetary units, with Microsoft-specific properties under an adapter-specific discriminated union. Avoid coding a fake generic provider that pretends all cloud vendors have matching billing semantics. Only Microsoft adapter is implemented in MVP.

## Entity registry

- **Environment**: `schemaVersion`, `id`, `name`, `description?`, `createdAt`, `updatedAt`, `currency` (`GBP` default), `region` (`uksouth` default, changeable), `catalogueRef`, `forecastSettings`, `objects`, `relationships`, `pricingOverrides`, `sourceSnapshot?`, `metadata?`.
- **ModelDeployment**: provider, platform, model identifier/version, region, deployment SKU/mode (`payg` / `provisioned` where verified), units/capacity/availability, name, linked pricing meter IDs, shared fixed capacity, optional base workload assumptions.
- **Agent**: platform (`foundry-agent-service` / `copilot-studio`), autonomy classification, model source (`platform-managed` / `deployment-ref`), model reference when supported, usage profile reference, tools/knowledge sources, sensitive-data exposure and policy links. `platform-managed` must have an explicit supported pricing path, not assumed zero inference.
- **UserGroup**: named population, intended audience, monthly active users, optionally known unique identities/reach, expected monthly interactions. Seats assigned per licence. Do not infer group disjointness or sum populations into unique organisation-wide users without evidence.
- **LicenceEntitlement**: product/SKU/rule version/seat count, `existing | incremental | unknown` procurement state, retail/contract unit rate, applicable groups. LicenceAssignment links group and entitlement; flag overlap and double-licensing.
- **SupportingResource**: Azure category (`ai-search`, `storage`, `functions`, etc.), region, billable usage quantities, billing meter references, fixed costs and associated agent/dep references. Can exist unattached; warn rather than drop costs silently.
- **SecurityPolicy**: requirements/controls, applicability to agent/group/environment, status (`implemented | planned | absent | unknown`), governance ruleset version.
- **UsageProfile**: explicit monthly executions, model calls/execution, input/output token quantity per call, retries, tool calls, agent-to-agent invocation expectation, user allocation assumptions. Distinguish inferred versus user-specified; avoid applying both interaction-based and execution-based counts to same workload.
- **PricingOverride**: scoped to one meter/one object or environment when appropriate, mode `fixed | retail-discount-percent | intentional-zero`, currency, unit, positive/valid value, reason, effective date; overrides are reusable across catalogue refreshes.
- **ForecastSettings**: optional environment factor, per-meter/per-object replacement factor, `applyToFixedContract` opt-in (false default), optional projection period; clearly labelled hypothetical.

## Relationship types

`agent-uses-deployment`, `group-can-access-agent`, `group-has-entitlement`, `agent-invokes-agent`, `agent-uses-resource`, `policy-applies-to-agent`, `policy-applies-to-environment`, `deployment-uses-resource`. Validate source/target type, prevent dangling references, self-loop and uncontrolled invocations. Typed unions and lookup indexes facilitate fast rendering.

## Object lifecycle and validation

- Any object can be created with a name (or draft generated label) and incomplete details; `draft` is normal, not catastrophic.
- An **agent's cost-ready configuration** requires valid platform/model source, supported binding, and sufficient consumption inputs/prices; draft agent can exist without them.
- When a deployment is deleted and has dependent agents, confirm detachment or block deletion with a list of dependents. No automatic silent cascade.
- Reassigning a deployment recomputes costs for all references using derived selectors; shared deployment totals remain once per environment.
- Incomplete objects remain visible in architecture and inventory with appropriate status; the TCO summary must show `Known subtotal + X incomplete items`, **not** a definitive total while unpriced required costs exist.
- Warn on overlapping licences/groups when uniqueness is not provable; never automatically assume all groups are unique or all seats incremental.
- `agent-invokes-agent` edges do not automatically multiply token cost without explicit invocation frequency and bounded cycle handling.

## JSON serialization contract

- Schema version `1.0.0` initial. Persist **only** public inputs, user-created objects, relationships, pricing overrides, forecast settings, currency, catalogue reference and optional **historical price snapshot** for auditing. No secrets or tenant identifiers required; allow narrative labels but warn not to include sensitive info.
- Import: parse untrusted JSON, enforce byte/object/depth limits, validate via discriminated schemas, reject unknown critical version, show errors rather than crash, preserve stable IDs unless intentionally duplicating, reject malicious strings as plain text (no HTML rendering).
- Duplicate in memory: remap **all** object IDs, relationship source/target references, override object references and template-linked identifiers; preserve source metadata, but new env ID and dates.
- Imported environments **recalculate against the current catalogue by default**. Historical snapshots can power a clearly labelled comparison or retained-reference view; never confuse them with today's live catalogue. If a historical meter no longer maps, mark unknown with reason.
- Use `Blob` + object URLs for explicit local downloads and a file input for imports; revoke URLs. Warn on `beforeunload`, and show persistent `Not exported` status after edits; no hidden browser persistence.
- Use typed reducers/actions, no arbitrary JSON object deep merges that bypass validation.

## Extensibility

Keep public interfaces such as `ProviderAdapter`, `MeterRef`, `CatalogueSource`, `RateResolver`, `CompatibilityRule`, `AssessmentRule` behind feature modules. Only one `MicrosoftProviderAdapter` should exist now. Future provider implementations will register adapters; do not bake Azure region strings into core arithmetic.
