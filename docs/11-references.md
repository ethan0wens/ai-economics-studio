# 11 — Public reference links reviewed for this handover

**Review date: 2026-11-18.** Recheck current terms and documentation during implementation. This is a reading list, **not a database of verified product prices**. Documentation pages are not always the same as customer agreements.

## Cloudflare

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) — serve built assets through Workers with no script required.
- [Static Assets SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) — `assets.directory`, `not_found_handling`.
- [Billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) — static asset requests are free/unlimited under present terms, separate from Worker script execution.
- [GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) — API token, account ID and Wrangler.
- [Static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/) — headers and caching.
- [Workers platform limits](https://developers.cloudflare.com/workers/platform/limits/) — static asset count and free plan limits.

## GitHub

- [GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage) — standard GitHub-hosted runners are free in public repos under present terms.
- [Automatic workflow events / schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) — scheduling and inactivity limitations.
- [GITHUB_TOKEN event behavior](https://docs.github.com/en/actions/concepts/security/github_token) — pushes made using token do not generally start another workflow run.

## Microsoft

- [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) — public unauthenticated retail meter API, currencies, filters, units, `NextPageLink`, effective dates.
- [Foundry Agent Service connected models](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) — model connections and feature restrictions.
- [Copilot Studio bring your own model for prompts](https://learn.microsoft.com/en-us/microsoft-copilot-studio/bring-your-own-model-prompts) — BYOM contexts and feature limits; not proof of arbitrary full-agent model substitution.
- [Copilot Studio agent tools](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-tools) — agent tool/model integrations.
- [Microsoft Foundry integration](https://learn.microsoft.com/en-us/azure/foundry/how-to/integrate-with-other-apps) — general integration surface.

## Codex

- [Codex Cloud](https://chatgpt.com/codex) — connect a repo and launch implementation task.
- [Codex CLI](https://github.com/openai/codex) — local alternative if preferred.

## Pricing / compatibility curation instruction

During coding, add a documented `SOURCES.md` or checked structured source catalogue with each **specific** supported model, meter, price and licensing rule. A general product documentation link alone does **not** prove a specific SKU rate, entitlement or compatible binding. Mark unsupported/unverified coverage explicitly until reviewed.
