# Stage 2 · Guided studio and documentation

## Workspace

Home opens an editable environment by name, from a JSON import, or from a previewed example. Returning Home keeps the workspace open. Replacing a changed environment offers a chance to export JSON. A browser reload clears the active environment.

The left navigation includes Home, Environment Builder, Cost Analysis, Reports & Export and Documentation. Pricing Catalogue appears below the main destinations. At narrow widths a modal menu closes with Escape and restores focus. The guided builder uses a compact step picker on narrow screens.

Guided creates a Foundry agent, usage profile and model deployment transactionally against the existing environment schema. Choosing an existing deployment creates a link to it and gives the new agent its own usage profile. The standard Copilot Studio path creates a platform-managed agent with Copilot Credit inputs. The steps can be visited in any order, including during incomplete configuration. Optional presets preview and apply fictional assumptions only when selected.

Advanced edits the same validated objects and relationships, including deployment capabilities, discounts, forecasts, licence procurement and specialist usage. Advanced retains standalone logical diagrams and advisory controls. Reports also include the diagram. Feature deferrals consist of taking Architecture and Security & Governance out of the primary navigation and moving specialist methods behind contextual controls.

## Financial checks

The known monthly subtotal and annual run-rate share a single deterministic ledger across the builder, Cost Analysis and reports. The interface exposes unresolved lines separately. Estimate readiness links to the field or ledger line that can resolve each issue. Unverified evidence and conditional findings remain visible, and the detailed ledger continues to show rate sources, billing units and assumptions.

All four examples open as editable copies. They use the current applied catalogue, so their live amounts may change. Browser tests intercept fictional rates to independently reconcile the following amounts.

| Example | Learning objective | Monthly result in fictional test |
| --- | --- | ---: |
| Basic Foundry Assistant | Calculate separate input and output token costs | £450 |
| Copilot Studio Business Agent | Price credits for a platform-managed agent | £240 |
| Enterprise AI Environment | Compare existing spend, new seats and discounted Azure AI Search | £1,592 incremental and £5,592 proposed |
| Shared Model Deployment | Charge one 15 PTU deployment for 400 hours and show its 75% and 25% allocation | £3,000 total, split £2,250 and £750 |

The enterprise template explicitly labels its existing spend and sample discount as fictional customer assumptions. The testing rates never enter the published catalogue.

## Documentation authoring and maintenance

The [article inventory](28-stage-1-documentation-plan.md#article-inventory-and-content-sources) lists the 35 stable article IDs and nine sections delivered in the application. Authored text, links and heading IDs live in [the documentation content module](../src/documentation-content.ts). Maintain stable article and heading IDs for deep links. Place field mappings, topic entry points and contextual links in [the help link registry](../src/help-links.ts). The hub indexes article titles, synonyms, summaries and sections locally in the browser.

The public reference is derived by [the documentation reference module](../src/documentation-reference.ts) from the applied static pricing and evidence snapshots. It includes model and region coverage, price availability, exact regional evidence, sizing rules, evidence freshness and pipeline health. Authored guidance stays available if the pricing asset cannot be applied. Catalogue reference content is refreshed through the existing catalogue and evidence workflows.

`npm run docs:validate` runs in every production build. It rejects duplicate or malformed identifiers, missing article content, broken internal references, removed tool destinations, invalid contextual anchors, examples that fail the environment schema, malformed Microsoft source URLs and snapshot totals that fail to reconcile. Official source content and availability are reviewed through the existing Microsoft maintenance pipeline. The production deployment smoke also opens Guided, documentation and a live example, and checks the reference hash against the deployed catalogue.
