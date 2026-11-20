# Operations

> See the [technical reference](technical/06-build-and-deploy.md) for current implementation and procedures. This document also records earlier design decisions.

## GitHub and Cloudflare

1. Configure a GitHub Actions environment called `production` restricted to `main`. Add `CLOUDFLARE_API_TOKEN` as a scoped Workers Scripts Edit secret and `CLOUDFLARE_ACCOUNT_ID` as an environment secret.
2. Production targets the existing `ai-econmics-studio` Worker at `https://studio.ethan0wens.tech`. The deploy command checks the account, Worker settings and enabled Custom Domain before invoking Wrangler. Rollback captures and verifies the previous assets at the same canonical origin. A wrong account, missing Worker, or denied lookup stops deployment. The configuration has no Worker entrypoint or runtime bindings.
3. Merge through **Pull request checks**, then confirm **Deploy static studio** succeeds. In a clean browser check the application, successful downloads, responsive/keyboard operation and only same-origin requests. The deployment job also checks that public HTML, the pricing manifest and the current catalogue file match the build. Verify the CSP/security headers and cache headers on HTML, hashed code and the price manifest.
4. Changes to the pricing pipeline on `main` trigger **Refresh and deploy retail prices**. It also runs daily and can be dispatched manually. It scans reviewed Azure product and SKU families, validates exact billing components, writes a content-addressed inventory and rate snapshot, and deploys its own build. The workflow needs permission to push the catalogue commit. If branch protection prevents this, use an approved bot/PR or change the publication mechanism with repository owner review.
5. Fetch the live `/pricing/manifest.json`. Check `catalogueId`, `lastCheckedAt`, record count, and the matching content-addressed asset. Confirm the verified resource meter appears in the studio and its unit/rate reconcile to the source. This is required for community release.

Both production workflows share a concurrency group and check out the current `main` head when they start. The maintenance workflow checks that main has not advanced, verifies the candidate on the live Worker, and then pushes the validated data. A rejected push restores the previous Worker version. GitHub may coalesce pending runs, so review the production deployment and re-dispatch if an expected run was replaced.

## Pre-release pricing check

Changes to the pricing pipeline on `work` run **Verify Azure retail feed before release** in GitHub Actions. It checks the live Azure feed with read-only repository permissions and saves a preview artifact and coverage matrix. The production refresh on `main` fetches and validates a fresh catalogue before publication. Run `npx tsx scripts/pricing.ts coverage` for the same matrix from a local snapshot.

## Pricing incidents

A failed retrieval, schema, mapping or coverage check leaves the manifest unchanged and blocks deployment. Use the failed job's logs to diagnose the selector or upstream response. Recheck the official SKU, billing tier, currency, region, unit and effective date before changing mappings or accepting large price movements. A deployed version includes the current and previous validated catalogue assets. The client can use the previous asset if the current immutable download fails.

The publishing command restores the previous single active Cloudflare version if production verification or the catalogue push fails. For an incident outside that transaction, or if automated restoration could not be confirmed, use the Cloudflare dashboard and the version recorded in the Actions log. Reconcile the checked-in manifest with the live one and rerun the validated workflow before resuming the schedule. If GitHub pauses scheduled runs after repository inactivity, re-enable the workflow and dispatch it manually. Provider terms and free allowances can change.

## Technical notes

- Catalogue ingestion runs in CI. The client fetches only same-origin static manifest and rate assets. Apply an in-session catalogue update explicitly. Existing agreement rules stay in the workspace.
- The ledger rounds half up at the line boundary to the ISO currency minor-unit precision. Annual run-rate is the rounded known monthly subtotal times twelve. Provisioned allocation uses declared input token shares and rounds cumulative shares to keep the total reconciled. Invocation links are descriptive and usage is entered once per billed workload.
- Support resources use catalogue or manual monthly usage assumptions. Licence coverage and Copilot credit quantities are declared by the user. There is no tax, FX, tenant validation or automatic entitlement model.
- Environment JSON has a 2 MB import limit and holds up to 300 objects. PDF uses embedded PDF standard fonts with a replacement glyph for unsupported characters. Large diagrams include a text register with full object and relationship names.

See [catalogue maintenance](23-maintenance-automation.md) for the daily and weekly cadence, health report and exception issues.
