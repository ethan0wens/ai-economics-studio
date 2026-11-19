# Verification, validation and financial regression

Use several independent layers. TypeScript checks the static contract, runtime validation checks actual data, numerical tests verify formulas and browser tests check what a reviewer sees. The production check also confirms the live version and its evidence.

## What each check proves

| Check | Scope and useful failure signals |
| --- | --- |
| `npm run typecheck` and `npm run lint` | Strict TypeScript and ESLint including React hooks. Catch invalid use of interfaces, unresolved symbols and lint errors. |
| `npm test` | Vitest loads the Node tests under `tests`. Unit-level and module-level tests cover graph/schema checks, prices, discovery, finance, expiry, evidence and the promotion guard. |
| `npm run pricing:validate` | Verifies the versioned catalogue contract, exact identities, digest and manifest count. The previous asset must validate if referenced. |
| `npm run evidence:validate` | Validates dated commercial terms, entitlements, technical region/feature evidence and PTU scope. The result describes validation of captured evidence, with source reachability checked by maintenance. |
| `npm run docs:validate` | Checks user and technical article metadata, navigation, anchors, supported Markdown, links, source file and named-symbol references, schema example files and derivation of public reference data. |
| `npm run build` | Runs the data/documentation gates and compiles static Vite output. |
| `npm run test:e2e` | Chromium covers real interaction, focus, reflow, fixtures, deployment price checks when enabled, PDF text and JSON reconciliation. These are representative scenarios. |
| Production smoke | Runs through the checked-in deployment after verifying candidate bytes. Reconciles public catalogue health, activated documentation, core estimate flows and candidate identity. |

Use [package scripts](../../package.json), [Vitest configuration](../../vite.config.ts), [browser configuration](../../playwright.config.ts) and [deployment smoke](../../scripts/deploy.ts) as executable references. Browser tests support `STUDIO_TEST_URL` for an existing built site, `STUDIO_CHECK_PUBLISHED_CATALOGUE` for public price assertions, `STUDIO_CHECK_RELEASE_HEALTH` for a deployed health asset, and `STUDIO_EXPECTED_CATALOGUE_ID` for a pinned hash. Build first for local preview. Set the release health flag only when that fixture exists or when checking a release.

## Financial regression method

Use an independent decimal calculation. Record assumptions, units, valuation instant, evidence scope and expected results before invoking the production evaluator. Start from [price cases](../../fixtures/price-cases.json) or [enterprise scenarios](../../fixtures/enterprise-scenarios.ts), all explicitly fictional. Fix the assessment time to reproduce a source or agreement window. The browser tests intercept manifest and catalogue using well-formed exact matching identities and their real SHA-256. An intercepted rate never belongs in the production catalogue.

The [ledger suite](../../tests/ledger.test.ts) exercises discount and current versus forecast precedence, unknowns, import and shared charges. [Enterprise tests](../../tests/enterprise.test.ts) verify credit allocation, line and basis totals, seat conflicts, separate existing expenditure, technical scope and graduated bands. [Provisioned tests](../../tests/provisioned.test.ts) verify sizing, quote scope, optional comparison, rounding and expiry. The [browser enterprise suite](../../tests/e2e/enterprise.spec.ts) drives the UI, opens the diagram, reads the JSON source snapshot and extracts text from the PDF with PDF.js. Compare known monthly and annual amounts and unresolved counts. The [worked calculations](03-worked-reconciliations.md) reproduce seven scenarios. The [business-case fixture](../../fixtures/adoption-business-case.ts) pins both token rates and exact adoption outcomes. [Example tests](../../tests/examples.test.ts) check pricing units, absent rates, provenance and non-mutation. The [browser value and review suite](../../tests/e2e/value-review.spec.ts) follows the built-in example through its walkthrough, explicit workload link, both PDFs and a JSON round-trip. The Guided suite pins the original four example totals.

### Add a new financial scenario

1. Define an exact quantity, rate identity, unit multiplier, currency, scope and assessment date. State which rules or failures the scenario exercises.
2. Compute the expected outcome separately from the ledger, with line-level half-up rounding. Include null paths and declared zero, if relevant. For a shared charge, check one billed line and independently summed allocations.
3. Add the fictional inputs and expected values to the appropriate fixture. Assert each line and totals for relevant bases and licence scopes. Include at least one near mismatch for a new rate selector.
4. Add an interaction/export assertion if the behaviour changes what a user sees. Preserve exact expected values when editing copy. Run local checks and review public CI before release.

## Report verification

The [PDF regression suite](../../tests/report.test.ts) generates both formats using fictional environments. It reads page text and metadata, checks page boundaries and overlapping text, checks embedded fonts and PDF action restrictions, and reconciles known and unresolved charges. Run `STUDIO_PDF_ARTIFACTS=/tmp/studio-report-review npm test -- tests/report.test.ts` to save the reports. Render any saved PDF with `pdftoppm -png -r 110 input.pdf output-page` for print review. Visual review makes glyph, chart and diagram issues visible independently of text extraction.

## Security and accessibility verification

Browser coverage exercises keyboard controls, modal focus, narrow layouts, explicit import/export and customer-data boundaries. Accessible names and scrollable code/table regions help users navigate at small widths. Targeted checks cover the most important paths. Service-side metadata, full browser compatibility, complete WCAG conformance and external security audit remain independent concerns. See [known limitations](07-limitations.md) and [production verification](06-build-and-deploy.md#production-verification).

## Usage estimation acceptance

The usage-assistance checks cover Foundry workload products, retry and cache quantities, conversion limits, Copilot monthly credits, missing activity conversion evidence and temporary sensitivities. Browser tests exercise preview, cancel, apply, manual editing, keyboard and 320-pixel reflow. The exported totals are reconciled against independently specified fictional prices. Automated checks establish reproducible behaviour. The [human study protocol](#/documentation/technical/usability-study) provides separately moderated tasks.
