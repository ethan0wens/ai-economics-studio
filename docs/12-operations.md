# Operations

> See the [technical reference](technical/06-build-and-deploy.md) for current implementation and procedures. This document also records earlier design decisions.

## GitHub and Cloudflare

1. Configure a GitHub Actions environment called `production` restricted to `main`. Add `CLOUDFLARE_API_TOKEN` as a scoped Workers Scripts Edit secret and `CLOUDFLARE_ACCOUNT_ID` as an environment secret.
2. Production targets the existing `ai-econmics-studio` Worker at `https://studio.ethan0wens.tech`. The deploy command checks the account, Worker settings and enabled Custom Domain before invoking Wrangler. Rollback captures and verifies the previous assets at the same canonical origin. A wrong account, missing Worker, or denied lookup stops deployment. The configuration has no Worker entrypoint or runtime bindings.
3. Merge through **Pull request checks**, then confirm **Deploy static Studio to the custom domain** succeeds. The deployment job checks the built HTML, pricing manifest and current catalogue against the live files, verifies the HTTPS edge and exercises downloads, privacy and reconciliation in Chromium. Wrangler disables workers.dev and Preview URLs. The workflow verifies both settings and checks that the old hostname refuses the Studio.
4. **Refresh and publish Studio retail prices** runs daily and by manual dispatch on `main`. It validates the evidence, stages a pricing-only PR and uses the configured GitHub App to squash-merge after the required checks. [Publisher setup and recovery](36-protected-pricing-publication.md)
5. Confirm the main deployment completed. Check the live manifest and release health for the catalogue identifier, record count, currency and billed units, and compare the digest-addressed snapshot with the approved revision.

One production workflow deploys from main after a merge. A scheduled verification retries an approved revision whose live receipt is still behind. No-change runs leave the current assets in place.

## Pre-release pricing check

Changes to the pricing pipeline on `work` or `release/**` run **Verify Azure retail feed before release** in GitHub Actions. It checks the live Azure feed with read-only repository permissions and saves a preview artifact and coverage matrix. The production refresh on `main` fetches and validates a fresh catalogue before publication. Run `npx tsx scripts/pricing.ts coverage` for the same matrix from a local snapshot.

## Pricing incidents

A failed retrieval, schema, mapping or coverage check leaves the manifest unchanged and blocks deployment. Use the failed job's logs to diagnose the selector or upstream response. Recheck the official SKU, billing tier, currency, region, unit and effective date before changing mappings or accepting large price movements. A deployed version includes the current and previous validated catalogue assets. The client can use the previous asset if the current immutable download fails.

The publishing command restores the previous single active Cloudflare version if production verification fails and the candidate still owns the active deployment. For an incident outside that transaction, or if automated restoration could not be confirmed, use the Cloudflare dashboard and the version recorded in the Actions log. Reconcile the checked-in manifest with the live one and rerun the validated workflow before resuming the schedule. If GitHub pauses scheduled runs after repository inactivity, re-enable the workflow and dispatch it manually. Provider terms and free allowances can change.

## Technical notes

- Catalogue ingestion runs in CI. The client fetches only same-origin static manifest and rate assets. Apply an in-session catalogue update explicitly. Existing agreement rules stay in the workspace.
- The ledger rounds half up at the line boundary to the ISO currency minor-unit precision. Annual run-rate is the rounded known monthly subtotal times twelve. Provisioned allocation uses declared input token shares and rounds cumulative shares to keep the total reconciled. Invocation links are descriptive and usage is entered once per billed workload.
- Support resources use catalogue or manual monthly usage assumptions. Licence coverage and Copilot credit quantities are declared by the user. There is no tax, FX, tenant validation or automatic entitlement model.
- Environment JSON has a 2 MB import limit and holds up to 300 objects. PDF uses embedded PDF standard fonts with a replacement glyph for unsupported characters. Large diagrams include a text register with full object and relationship names.

See [catalogue maintenance](23-maintenance-automation.md) for the daily and weekly cadence, health report and exception issues.
