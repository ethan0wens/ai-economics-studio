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

[Wrangler](../../wrangler.jsonc) specifies `assets.directory: "./dist"`, strict static-file handling and the Worker name. It disables workers.dev and per-version Preview URLs. It has no custom script or runtime bindings. Vite copies public assets such as pricing JSON and `_headers` into the build. App navigation uses URL hashes. Hash links load the root app and React interprets the destination. A static rewrite supports the direct documentation route. Missing bundle and catalogue files return 404. The production deploy guard checks the dashboard-owned Custom Domain binding for this Worker and the ethan0wens.tech zone. Cloudflare owns its DNS and TLS certificate. The existing GitHub deploy token needs account-scoped Workers Scripts permission and access to read the domain binding. Zone-scoped Workers Routes Edit is only required if Wrangler takes ownership of route changes. Keep the dashboard binding until that permission and ownership are reviewed. The security policy and cache directives are defined in [public/_headers](../../public/_headers). The build adds one-year immutable caching only for the exact fingerprinted bundles and digest-addressed catalogue files it contains. Other paths revalidate via `no-cache`. The manifest and the release health response use the default revalidation policy.

## GitHub responsibilities

| Workflow | Trigger, access and purpose |
| --- | --- |
| [Pull request checks](../../.github/workflows/ci.yml) | Pull request events. Read-only contents, clean install, type/lint/unit/build and Chromium checks. No production secrets. |
| [Custom-domain preflight](../../.github/workflows/custom-domain-preflight.yml) | Read-only DNS, TLS, strict transport and Chromium checks for the approved production hostname. The workflow takes the expected live revision and catalogue as manual inputs. |
| [Azure pricing preview](../../.github/workflows/pricing-preview.yml) | Relevant paths on `work` and `release/**`. Read-only Azure stage with a preview artifact, plus build and browser checks. |
| [Discovery probe](../../.github/workflows/pricing-discovery.yml) | Selected discovery code on `work`. Read-only candidate survey. |
| [Enterprise evidence review](../../.github/workflows/enterprise-evidence.yml) | Relevant `work` changes or manual dispatch. Read-only probes, reconciliation rehearsal and public browser checks. |
| [Static application deploy](../../.github/workflows/deploy.yml) | Push to `main`, hourly recovery or manual dispatch on `main`. Read-only contents. Runs checks and builds before the production deployment step. A push changing only the public approval record keeps the verified technical release active. |
| [Refresh and publish](../../.github/workflows/refresh-pricing.yml) | Daily schedule or manual dispatch on `main`. Read-only preparation. The separately scoped App opens or updates a pricing PR and merges only after the required checks. An isolated reporting job can write deduplicated issues. |

Only the main-branch deploy workflow promotes production. An App squash merge triggers the same workflow as an owner merge. The GitHub Actions `production` environment provides `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the guarded deploy step. The hourly recovery plan checks the current receipt without credentials. The pricing App uses the separate `pricing-publisher` environment. [Publisher scope, setup and recovery](../36-protected-pricing-publication.md)

## Production verification

1. Review the diff and tests before advancing `main`. User-visible moves require a browser test, and financial changes require independently calculated expected values. Application, catalogue and evidence changes all deploy from approved main commits.
2. [scripts/deploy.ts](../../scripts/deploy.ts) checks the account subdomain, existing Worker settings and the exact enabled Custom Domain. It verifies current HTTPS delivery and captures the previous release on the same hostname before upload. It requires the expected target name, and checks that the local SHA still matches `main`. It captures the live rollback target and verified previous bytes. The guard needs one active version at 100%.
3. Wrangler uploads the static build and reports a candidate version ID. The release writes a candidate `health.json` with application and evidence provenance. The guard waits for Cloudflare to identify the 100% serving deployment for that version. The workflow verifies live HTML, stylesheet and icon bytes, the manifest, the selected catalogue and the release receipt. Every built JavaScript and CSS response must match both its media type and build bytes. It then verifies strict production HTTPS and the exact HTTP redirects or Cloudflare refusal, including a path and query probe. The browser tests check reconciliations, catalogue identity and documented journeys. The deploy guard checks that Cloudflare still has workers.dev and Preview URLs disabled and probes both legacy protocols for refused delivery.
4. [promoteWorker](../../scripts/worker-release.ts) confirms that the exact candidate deployment is still serving before completion. The guard checks that main still matches the candidate and can restore the previous version when the candidate owns production. Read the [rollback procedure](06-security-and-operations.md#deployment-and-rollback) for important conditions and manual recovery.

See [GitHub Actions permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication) and [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/). The repository's checked-in workflow and config are authoritative for this deployment.
