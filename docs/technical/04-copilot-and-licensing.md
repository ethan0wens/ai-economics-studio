# Copilot Studio and Microsoft licensing evidence

Price, included entitlement, assigned licences and actual workload are separate inputs. Azure and commercial prices establish what can be estimated under an exact tariff. The customer's agreement and Microsoft's current rules establish the right to use a service.

## Platform-managed Copilot Studio

The standard billable route is a platform-managed Copilot Studio agent. Use an entered monthly Copilot Credits total or the total from declared activity buckets. The studio does not convert prompts or messages into credits. The [Microsoft Copilot Studio billing guidance](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management) is the source for activity rules. Use measured or customer-planned credits with its applicable plan.

Included usage needs a stated quantity, documented basis and expiry. The engine applies the declared allowance ahead of prepaid pack allocation. It validates the declaration and reports conditional evidence. The exact recognised UK monthly pack offers a reviewed 25,000-credit capacity per pack, represented as a supporting resource. It has its own price and requires an integer pack count and eligible linkage. In [offerings](../../src/offerings.ts) `copilotPack` identifies the single recognised pooled tariff. Other allocation models, carryover, trial terms and tenant-specific offers need independent review. See [licensing and subscription requirements](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions) and [pack and overage arithmetic](03-ledger-methodology.md#copilot-credits-and-supporting-resources).

## External prompt inference

A separate Foundry charge can be modelled when a managed agent explicitly links an external prompt deployment through `agent-uses-prompt-model`. The link needs an applicable prompt endpoint and deployment, with distinct usage for the separately priced work. The current reviewed evidence covers the prompt-specific chat completions path subject to model and integration conditions. Known incompatible selections produce an unresolved inference path. Unverified selections require review even if a price can be shown. A standard managed agent generates its credit line without an automatic duplicate Foundry charge. Replacing the primary managed model with this link is outside the implemented billing path. See [Microsoft bring-your-own-model prompts](https://learn.microsoft.com/en-us/microsoft-copilot-studio/bring-your-own-model-prompts), [the compatibility checks](../../src/compatibility.ts) and [the Copilot fixture](03-worked-reconciliations.md#copilot-credits-and-a-shared-pack).

## Commercial licences and prerequisites

| Family | Implemented use and evidence boundary |
| --- | --- |
| Microsoft 365 and Microsoft 365 Copilot | Reviewed UK suite and add-on offers can price new seats. Separate exact prerequisite evidence evaluates eligible base subscriptions and full-group declarations. |
| Agent 365 and agent-related rights | A reviewed seat offer may represent a planned purchase. Actual administrator/agent rights and included use depend on documented SKU, tenant and agreement. The studio records an agent entitlement link as applicability. |
| Microsoft Entra | Reviewed identity plans may be modelled as per-seat licences. Assignment scope and potential bundle overlap remain explicit. |
| Microsoft Defender and Microsoft Purview | Reviewed security and compliance components can be modelled separately. Exact qualifying bundles can require every component assigned to the same user group. Missing or uncertain variants remain identified in the catalogue and evidence. |
| Other reviewed UK offers | Use the catalogue's precise product name, billable unit, published terms, market and review date. Commercial pricing comes from reviewed offer records. |

The studio matches by exact offering ID and product identity. An eligible base must be an existing or incremental unblocked entitlement. A prerequisite can be verified for the modelled group when the group's population is documented and every assigned member is covered by an eligible base or all members of an allowed bundle. Partial assignments, possible alternatives and unverified terms require follow-up. Agent links do not invent per-agent unit prices. Missing, conditional or expired evidence stays visible. Potentially redundant assignments can generate advice. Duplicate or inconsistent seat declarations can leave the billed quantity unresolved.

`licensing` in [entitlements.ts](../../src/entitlements.ts) returns a seat plan and dated findings. [Entitlement rules](../../catalogue/entitlements.json) carry exact product IDs, rule kinds, scope, source, `verifiedOn`, optional `observedSince` and `reviewBy`. `currentEvidence` uses an inclusive date window. The [reviewed commercial prices](../../catalogue/commercial.json) separately track term, price, scope and expiry. [Evidence validation](../../scripts/evidence.ts) checks the repository contracts. Use [Microsoft Product Terms](https://www.microsoft.com/licensing/terms/) and the current customer agreement for purchase decisions.

## Understanding the results

A verified price answers a billing question for the specified configuration. A verified licence finding describes the declarations and exact covered rule. A technical finding describes that rule's compatibility scope. Other inputs can remain unresolved. Treat conditional and unverified findings as questions to confirm. Existing and proposed licence totals reflect recorded spend and effective replacement assumptions, explained in [the finance method](03-agreements-and-licences.md#dated-replacement-and-proposed-scopes).

## Assisted Copilot Credits

The Guided assistant sums the monthly credits the user already calculated or measured for applicable categories. It previews gross credits before any eligible declared allowance or prepaid capacity. Apply replaces the monthly total or the active category breakdown. The helper leaves activity counts unresolved because it lacks an implemented reviewed conversion for the exact activity and billing circumstances. The existing ledger resolves qualifying allowances, packs and PAYG overage. See the [credit guidance](#/documentation/copilot-credits?section=documented-credit-totals).
