# Stage 6 security assessment

Review began from application commit `ba6b9c9` and catalogue commit `ec2253e`. Review scope included runtime input, rendering, export and privacy paths, CI workflows, package lock, catalogue ingestion and deployment. Baseline full and production-only npm audits returned zero reported advisories on 19 November 2026.

| Surface | Baseline observation | Stage 6 response |
| --- | --- | --- |
| JSON import | A 2 MB file cap, strict shapes and graph validation existed. The shape walk enqueued large arrays before schema bounds applied. Concurrent file reads could apply stale open decisions. | Limit structural work and reject reserved prototype keys. Resolve asynchronous reads against current open state. |
| Text and exports | React and the diagram render text. PDF uses Helvetica and draws text. The slug could exceed portable filename length or use a reserved name. | Bound the portable name and put plain text in document metadata. Verify export content and byte isolation. |
| Documentation | Markdown uses token-to-React rendering. Invalid URL or fragment input could throw and short-circuit the reader. | Fail closed for malformed URLs, require exact approved HTTPS destination, and keep invalid references inert. |
| Catalogue | Hashes and exact matching reject many changes, and pricing ingestion bounds pages and time. Payloads were read whole before validation. | Bound response bytes and JSON structure before parsing/schema work. Constrain source records, pointer counts and evidence URLs. |
| HTTP | Static CSP, frame restrictions, referrer policy and cache rules were configured. Production direct access from this workspace received a proxy refusal. | Verify headers using Chromium locally with actual static rules and with a passive HTTPS probe from GitHub Actions where service access is available. |
| Supply chain | Actions used mutable major tags. The price refresh job had repository and issue writes during source requests, installation and validation. | Pin exact action revisions, introduce reproducible dependency/static checks and separate validation, publication and issue reporting privileges. |
| Repository and account | Repository API access for branch, environment and account rules was unavailable from the workspace. A prior authorised push used the configured production path. | Record external controls as unverified with exact owner steps. No current account-scope conclusion rests on prior deployment success. |
