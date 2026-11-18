# Operations

## GitHub and Cloudflare

1. Configure a GitHub Actions environment called `production` restricted to `main`. Add `CLOUDFLARE_API_TOKEN` as a scoped Workers Scripts Edit secret and `CLOUDFLARE_ACCOUNT_ID` as an environment secret.
2. Production targets the existing `ai-econmics-studio` Worker at `https://ai-econmics-studio.ethan0wens.workers.dev`. The deploy command checks the account subdomain and reads the Worker settings before invoking Wrangler. A wrong account, missing Worker, or denied lookup stops deployment. The configuration has no Worker entrypoint or runtime bindings.
3. Merge through **Pull request checks**, then confirm **Deploy static studio** succeeds. In a clean browser check the application, successful downloads, responsive/keyboard operation and only same-origin requests. The deployment job also checks that public HTML, the pricing manifest and the current catalogue file match the build. Verify the CSP/security headers and cache headers on HTML, hashed code and the price manifest.
4. Manually dispatch **Refresh and deploy retail prices** on `main`. It checks the curated public source, writes a validated catalogue commit, and deploys its own build. The workflow needs permission to push the catalogue commit. If branch protection prevents this, use an approved bot/PR or change the publication mechanism with repository owner review.
5. Fetch the live `/pricing/manifest.json`. Check `catalogueId`, `lastCheckedAt`, record count, and the matching content-addressed asset. Confirm the verified resource meter appears in the studio and its unit/rate reconcile to the source. This is required for community release.

Both production workflows share a concurrency group and check out the current `main` head when they start. A non-fast-forward refresh push fails before deploy. GitHub may coalesce pending runs, so review the production deployment and re-dispatch if an expected run was replaced.

## Pre-release pricing check

Changes to the pricing pipeline on `work` run **Verify Azure retail feed before release** in GitHub Actions. It checks the live Azure feed with read-only repository permissions and saves a preview artifact. The production refresh on `main` fetches and validates a fresh catalogue before publication.

## Pricing incidents

A failed retrieval, schema, mapping or coverage check leaves the manifest unchanged and blocks deployment. Use the failed job's logs to diagnose the selector or upstream response. Recheck the official SKU, billing tier, currency, region, unit and effective date before changing mappings or accepting large price movements. A deployed version includes the current and previous validated catalogue assets. The client can use the previous asset if the current immutable download fails.

For an incident in a published deployment, use the Cloudflare dashboard to roll back to the last known-good deployment. Reconcile the checked-in manifest with the live one and rerun the validated workflow before resuming the schedule. If GitHub pauses scheduled runs after repository inactivity, re-enable the workflow and dispatch it manually. Provider terms and free allowances can change.

## Technical notes

- Catalogue ingestion runs in CI. The client fetches only same-origin static manifest and rate assets. Apply an in-session catalogue update explicitly. Existing agreement rules stay in the workspace.
- The ledger rounds half up at the line boundary to the ISO currency minor-unit precision. Annual run-rate is the rounded known monthly subtotal times twelve. Provisioned allocation uses declared input token shares and rounds cumulative shares to keep the total reconciled. Invocation links are descriptive and usage is entered once per billed workload.
- Support resources use catalogue or manual monthly usage assumptions. Licence coverage and Copilot credit quantities are declared by the user. There is no tax, FX, tenant validation or automatic entitlement model.
- Environment JSON has a 2 MB import limit and holds up to 300 objects. PDF uses embedded PDF standard fonts with a replacement glyph for unsupported characters. Large diagrams include a text register with full object and relationship names.
