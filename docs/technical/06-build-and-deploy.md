# Local development and Cloudflare deployment

Production uses Cloudflare Workers Static Assets on the existing Worker `ai-econmics-studio`. This spelling is intentional. The application is available at [studio.ethan0wens.tech](https://studio.ethan0wens.tech). Application and evidence releases go through GitHub Actions so the checked-in scope, actual assets and live smoke tests stay together.

## Local setup

Use Node.js 24 LTS with npm and a Chromium browser for browser tests. Start from a checkout with the published sample catalogue assets. Repository credentials and Cloudflare credentials are needed only for authorised publication.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run pricing:validate
npm run evidence:validate
npm run docs:validate
npm run build
npx playwright install chromium
npm run test:e2e
```

`build` runs pricing, evidence and documentation validation before Vite writes `dist`. `preview` serves that build for local inspection. Browser tests normally start it automatically. Set `STUDIO_CHROMIUM` to the path to an installed browser if appropriate. See [Playwright configuration](../../playwright.config.ts) and the [setup-browser action](../../.github/actions/setup-browser/action.yml). The generated command table lists the script names from [package.json](../../package.json). The [test chapter](07-verification-and-tests.md) describes when to use each check.

## Delivery configuration

[Wrangler](../../wrangler.jsonc) specifies `assets.directory: "./dist"`, SPA handling and the Worker name. It disables workers.dev and per-version Preview URLs. It has no custom script or runtime bindings. Vite copies public assets such as pricing JSON and `_headers` into the build. App navigation uses URL hashes. Pasting a deep link reaches the same static app document and React interprets the destination. The production deploy guard checks the dashboard-owned Custom Domain binding for this Worker and the ethan0wens.tech zone. Cloudflare owns its DNS and TLS certificate. The existing GitHub deploy token needs account-scoped Workers Scripts permission and access to read the domain binding. Zone-scoped Workers Routes Edit is only required if Wrangler takes ownership of route changes. Keep the dashboard binding until that permission and ownership are reviewed. The security policy and cache directives are defined in [public/_headers](../../public/_headers). The default is revalidation via `no-cache`, with one-year immutable caching for fingerprinted bundles and the digest-addressed catalogue. The manifest and the release health response use the default revalidation policy.

## GitHub responsibilities

| Workflow | Trigger, access and purpose |
| --- | --- |
| [Pull request checks](../../.github/workflows/ci.yml) | Pull request events. Read-only contents, clean install, type/lint/unit/build and Chromium checks. No production secrets. |
| [Custom-domain preflight](../../.github/workflows/custom-domain-preflight.yml) | Read-only DNS, TLS, strict transport and Chromium checks for the approved production hostname. The workflow takes the expected live revision and catalogue as manual inputs. |
| [Azure pricing preview](../../.github/workflows/pricing-preview.yml) | Relevant paths on `work`. Read-only Azure stage with a preview artifact, plus build and browser checks. |
| [Discovery probe](../../.github/workflows/pricing-discovery.yml) | Selected discovery code on `work`. Read-only candidate survey. |
| [Enterprise evidence review](../../.github/workflows/enterprise-evidence.yml) | Relevant `work` changes or manual dispatch. Read-only probes, reconciliation rehearsal and public browser checks. |
| [Static application deploy](../../.github/workflows/deploy.yml) | Push to `main` or manual dispatch on `main`. Read-only contents. Runs checks and builds before the production deployment step. A push changing only the public approval record keeps the verified technical release active. |
| [Refresh and deploy](../../.github/workflows/refresh-pricing.yml) | Daily schedule, relevant `main` pushes or manual dispatch on `main`. Read-only Actions access, contents write for checked-in snapshots, issues write for deduplicated exceptions. |

Changes limited to browser tests, documentation or app presentation follow the application deployment path and reuse the published catalogue. The automatic pricing push trigger covers mapped pricing implementation and evidence inputs. Schedule and manual dispatch can refresh and publish independently.

Both production jobs use the `production` environment and share the production concurrency group. Enable repository-approved access for the refresh bot to publish verified data. The secret names are `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, set as environment secrets. The token must allow the existing Worker lookup and deployment operations for the intended account. Keep values out of repository content and logs. GitHub token pushes do not provide a separate deployment trigger. The refresh performs its own deployment and verification.

## Production verification

1. Review the diff and tests before advancing `main`. User-visible moves require a browser test, and financial changes require independently calculated expected values. A normal source release uses the static workflow. Catalogue and evidence changes use the refresh workflow's publication transaction.
2. [scripts/deploy.ts](../../scripts/deploy.ts) checks the account subdomain, existing Worker settings and the exact enabled Custom Domain. It verifies current HTTPS delivery and captures the previous release on the same hostname before upload. It requires the expected target name, and checks that the local SHA still matches `main`. It captures the live rollback target and verified previous bytes. The guard needs one active version at 100%.
3. Wrangler uploads the static build and reports a candidate version ID. The release writes a candidate `health.json` with application and evidence provenance. The guard waits for Cloudflare to identify the 100% serving deployment for that version. The workflow verifies live HTML, stylesheet and icon bytes, the manifest, the selected catalogue and the release receipt. It then verifies strict production HTTPS and the exact HTTP redirects or Cloudflare refusal, including a path and query probe. The browser tests check reconciliations, catalogue identity and documented journeys. The deploy guard checks that Cloudflare still has workers.dev and Preview URLs disabled and probes both legacy protocols for refused delivery.
4. [promoteWorker](../../scripts/worker-release.ts) confirms that the exact candidate deployment is still serving before a refresh commits and pushes its staged data. A stale checkout or non-fast-forward push fails safely. Read the [rollback procedure](06-security-and-operations.md#deployment-and-rollback) for important conditions and manual recovery.

See [GitHub Actions permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication) and [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/). The repository's checked-in workflow and config are authoritative for this deployment.
