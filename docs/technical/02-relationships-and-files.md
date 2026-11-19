# Relationships, drafts and versioned files

Each edge has a `type`, `from` and `to`. Identifiers point to records in the same environment. An environment-scoped policy uses the environment ID as its target. The diagram depicts these links and the ledger consults selected link types for pricing decisions.

## Relationship semantics

The generated direction table below comes from `edgeKinds`. The notes here state what each link does.

| Relationship | Cardinality and financial role |
| --- | --- |
| `agent-uses-deployment` | Up to one per agent. Many agents can share a deployment. PAYG usage belongs to agents and provisioned capacity belongs to the deployment. |
| `agent-uses-usage` | Up to one outgoing profile per agent. The graph permits the same target on different agents. Finance flags ambiguous shared demand and leaves affected token quantities unresolved. Guided can make a distinct usage copy. |
| `agent-uses-prompt-model` | Up to one external prompt model per agent. Used by the separately modelled Copilot Studio path. A compatible PAYG path uses that agent's distinct profile. Eligible provisioned links share the deployment's capacity. |
| `agent-invokes-agent` | Several different targets are allowed. (A → B) records invocation structure and creates no automatic traffic multiplier. Include downstream consumption once in the called agent's profile. Directed cycles fail validation. |
| `group-can-access-agent` | Many-to-many access declaration. Group counts are descriptive and produce no automatic consumption. |
| `group-has-entitlement` | Many-to-many seat assignment, with optional `seats`. Linked assignments may derive the distinct seat count. Prerequisite checks compare the same groups. |
| `agent-has-entitlement` | Records applicability. A per-user tariff still needs a valid customer seat count and assignments as applicable. |
| `licence-replaces-entitlement` | From the incremental licence to an existing licence. Optional `seats` and `effectiveOn` permit drafts. A dated, validated replacement affects retained spend. |
| `agent-uses-resource` | May link several resources. Optional `integration` values are `foundry-search` and `foundry-private-search`. The link can also connect to a credit pack. Links do not duplicate the resource charge. |
| `deployment-uses-resource` | Attaches resource context to a model deployment. The resource retains its own quantity and cost. |
| `policy-applies-to-agent` | Associates a control with an agent. Used for advisory governance. |
| `policy-applies-to-group` | Associates a control with the group. Group access links give the advisory context for agents. |
| `policy-applies-to-environment` | Associates a control with the environment. The target is the current environment ID. |

`graphErrors` validates endpoint kinds, rejects unexpected edge properties and duplicate links, and uses a depth-first traversal to reject invocation cycles. Self-links fail. For the two model links and the usage link, uniqueness is per source agent and relationship type. For other types it is per source, target and type. Scope checks reject references to a deleted object and duplicate agreement keys (including currency) or forecast keys (without currency).

`removeObject` clears incident edges, object-specific overrides and forecast exceptions. It leaves linked objects available for reuse. The UI names linked records during deletion confirmation. `cloneEnvironment` remaps the environment and object identifiers, endpoints and scoped rules, preserves array order, and updates timestamps. Usage order is significant when agents compete for a shared credit pack. See the [domain tests](../../tests/domain.test.ts) and [Guided workflow tests](../../tests/e2e/guided.spec.ts).

## Guided and Advanced lifecycle

1. Starting a new environment creates the base fields and empty arrays. Saving an edit validates the complete proposed value before adopting it. Incomplete domain objects can exist because billing readiness is evaluated separately.
2. `addSolution` creates a platform-managed Copilot agent or a Foundry agent with a new usage profile and a deployment reference. It creates a deployment draft only when there is no selected existing deployment. Foundry agents can share the deployment and keep distinct usage records.
3. `assignLink` replaces the single outgoing edge of that type in the affected Guided action. `reuseDeployment` can remove a pristine Guided-created draft only with no remaining links, scoped agreements or exceptions. Advanced fields and other users of a configured deployment remain available. Mode switches keep the same workspace value.
4. Opening an example creates an independent editable copy with new identities. Replacing modified work offers an export option and preserves the current work on cancel. A reload starts a new in-memory session. Users can reopen explicit JSON exports.

See [Guided state](../../src/guided-state.ts), [Advanced inspector](../../src/inspector.tsx) and [workspace ownership](../../src/app.tsx).

## Import contract and historical snapshots

Import checks the UTF-8 byte size and JSON depth before strict parsing. It rejects unrecognised fields and schema versions, broken references and incompatible graph structure. The active file does not change on a failed parse. The application reports up to four Zod issue paths. A valid import can carry a `sourceSnapshot` with nullable `catalogueId`, `checkedAt` and `current`, and an `incomplete` count. Optional `currentKnown`, `annualKnown` and `forecastKnown` hold decimal strings. The optional `licenceEstate` stores `existing` and `proposed` summaries with `known`, `annual` and `incomplete`.

The file version is a literal. Recognised 1.0.0 files also receive a narrow repair of legacy, object-specific custom model meter IDs when exact mode, billing region and SKU agree, a model version exists, no `offeringId` is present, and the versioned key is free. This compatibility rule applies to agreements and forecasts. It is not a general migration facility.

Export writes the current input model and a new source snapshot. The visible old and new estimate comparison uses saved amounts and the applied catalogue; import recomputes using today's executed application, catalogue and evidence context. Exact historical reproduction requires the original application, catalogue bytes, dated evidence and valuation time. Downloaded JSON can contain sensitive labels and terms. Use the [data handling guidance](06-security-and-operations.md#browser-and-infrastructure-boundaries) before sharing it.

## Validated example files

- [Foundry draft JSON](examples/foundry-draft.json) has one linked agent, deployment and usage profile. Its contract is the schema, and matching retail is resolved separately.
- [Copilot Studio draft JSON](examples/copilot-draft.json) has one platform-managed agent with illustrative declared Copilot Credits.

Save the file with a `.json` extension and select **Import existing** on Home. The examples contain demonstration data and carry no price claims. `npm run docs:validate` parses both with `importEnvironment`.

## Usage assistance in exported files

Applying a Foundry preview updates the existing profile linked by `agent-uses-usage`. It replaces `executions`, `calls`, `input` and `output`. The identifiers, relationships and specialist quantities remain intact. A Copilot preview updates `credits` or `creditBreakdown` for the agent's active method. JSON and PDF represent applied inputs. The temporary business inputs and measured, customer forecast or illustrative label can be recorded in the existing environment description when needed. See [saving and reopening](#/documentation/save-and-reopen?section=save).
