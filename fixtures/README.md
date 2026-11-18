# Fictional fixture data — TESTS ONLY

These files exist to define calculation invariants and sample environment shapes for Codex. **They are not current Microsoft pricing** and must never be shipped as a verified production retail catalogue.

- `price-cases.json`: deterministic pure-math test cases for contract, scenario, fixed price and unknown cost behavior.
- `sample-environment.json`: sample object graph shape with two agents referencing one model. Does not contain live prices.
- `catalogue-sample.json`: example of catalogue metadata and two fictional token meters showing exact unit normalization. All price records have `verificationState: "fixture-only"`.

Codex may evolve the final domain JSON schema; maintain explicit schema/version migration tests and equivalent fixtures.
