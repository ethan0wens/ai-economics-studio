# 07 — Governance, security and Microsoft compatibility

## Advisory assessment is not certification

The app estimates implications using **declared planned controls**, not tenant telemetry or evidence of actual deployment. It must never output `Compliant` or `Secure` as an absolute statement. Use `Consider`, `Requires validation`, `Modelled control`, `Unknown`, with reasons and source references. Export findings along with assumptions and declared limits.

## Governance dimensions

- Agent autonomy and actuation (read-only, user-approved writes, autonomous writes), critical tool execution, external data sources.
- Data sensitivity: public/internal/confidential/regulated, as user-declared; location/sovereignty assumptions when relevant, without pretending to verify residency.
- Identity: user delegated vs application identity, role permissions, least privilege, secrets lifecycle.
- Approvals: sensitive actions, human-in-the-loop escalation, separation of duties.
- Observability: logs and audit, retention assumptions, alert routing, incident response, usage visibility.
- Data governance: DLP/Purview controls where applicable, data boundaries, connector controls and retention.
- Security monitoring: Defender/Sentinel links when applicable, but never claim inclusion or automated ingestion without cited compatibility evidence.
- Cost controls: quotas/budget alerts, usage caps, model/fallback selection, rate limits, unexpected retry/runaway consumption.

## Rule object

`{id, version, appliesWhen, findingSeverity, title, why, recommendation, sourceUrls[], lastReviewedAt, verificationState}`. Deterministic rules execute locally, on object facts only. Distinguish recommended from known mandatory legal/control requirements. User input `unknown` stays unknown, never automatically interpreted as absent.

## Compatibility engine

Compatibility by **feature path**, not only product names:

- `Foundry Agent Service → attached Foundry/Azure OpenAI/connected model` supported **only for the documented connection types/model/deployment mode/region**.
- `Copilot Studio → platform-managed model` via documented product plan, including consumption/credit implications.
- `Copilot Studio → user-provided Foundry model` must specify **what it is used for** (e.g. Copilot Studio prompt/model integration versus primary agent model, tool/action). Do **not** assume arbitrary BYOM as a blanket replacement for the whole agent's orchestration model. A supported specialized tool may generate separate costs; avoid automatically charging every top-level agent call both credits and tokens.
- Each potential link resolves to `verified-supported`, `verified-unsupported` or `unverified`, with reason, authoritative URL, checked date, region/deployment/feature restrictions. Do not turn `unverified` into a cost-ready binding.
- The Microsoft documentation may evolve. Build rules as data-driven records with version/last-reviewed metadata and test fixtures, not scattered `if (string.includes('gpt'))` logic.

## Control modeling in costs

Security/governance objects can add explicitly modelled licensing or supporting service costs only through a verified billable meter or manual price, not a fictional arbitrary 'security overhead'. Nonbillable advisory control checkboxes remain purely qualitative. Avoid cross-charging Microsoft 365 or Defender licences as incremental without the user's procurement/baseline selection.

## Rule coverage and report

Display severity, unknown coverage, applicable rules, verified source count and last-reviewed dates. Generated PDF should include top governance observations and a clear **modelled assessment only** disclaimer. No legal or regulatory assurance statement.
