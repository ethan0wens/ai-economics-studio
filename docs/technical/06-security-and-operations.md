# Security, privacy and release recovery

The application uses a browser trust boundary for the user's environment. Public delivery and publication are separate responsibilities. These controls support local planning and report creation. An independent security assessment remains a separate exercise.

## Browser and infrastructure boundaries

The app holds one validated environment in React state. It uses no account, session database, customer API or automatic environment persistence. Leaving or reloading clears the editable workspace. File import reads the selected JSON in the tab, and file export creates local Blob URLs. JSON and PDF can include entered text, identities, assumptions and customer rates. Review the files and their destination before sharing.

The browser fetches the static application, assets and public catalogue/health files on the same origin. Help or evidence links are ordinary user-initiated navigation. The current runtime has no product analytics, telemetry or customer application upload path. Cloudflare and upstream infrastructure can see normal network metadata. The browser and OS may retain downloaded files or cache public assets. These behaviours are distinct from persistent environment storage in the app. Browser extensions, a compromised browser or an unauthorised copy of an export sit outside this trust model.

## Content and dependency controls

The deployed [header rules](../../public/_headers) restrict scripts, styles, fonts and connections to the same origin. Images may also use data URLs, while external plug-ins, framing and form submissions are denied. The policy includes a same-origin base URI constraint. Additional headers disable MIME sniffing, withhold referrer information and deny camera, microphone and geolocation. Technical Markdown is parsed into supported React elements, and links are checked before rendering. Draft contents are rendered as text rather than executable markup.

Use reviewed dependency changes and compare lockfile differences. Run tests and browser workflows again after updating parsing, validation, money, PDF, graph or build libraries. A content policy and schema checks reduce exposure but do not establish penetration-test coverage or certification. Source updates run on a runner for publication, with production credentials scoped to the deployment step. A contributor or operator should follow the repository's review and access procedures.

## Deployment and rollback

```diagram
Diagram 5. Deployment and rollback

Current production (one active version at 100%) ── capture version + bytes
                                                             │
Check authorised target and main SHA ── deploy checked assets ─┘
                                         │
                     verify assets ── browser smoke ── confirm candidate active
                                         │                        │
                                         ├─ pass ────────────────▶ keep verified release
                                         └─ fail ─▶ confirm candidate still active
                                                          │
                                  restore previous version ── verify bytes + version
```

Canonical verification and rollback both use `https://studio.ethan0wens.tech`. Cloudflare owns the Custom Domain, DNS and TLS binding. The deploy script uses `verifyWorker` and `verifyPublishedAssets`, then calls the guarded `promoteWorker` transaction. A failed verification or superseded revision restores the previous version only when the candidate is still identifiable as the active version. It then verifies previous bytes and version. An external rollout, split traffic or uncertain upload requires operator review. This prevents a failed job from rolling back someone else's deployment. See [Cloudflare promotion code](../../scripts/worker-release.ts), [deploy guard](../../scripts/deploy.ts) and [provider guidance](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/).

The asset guard polls the canonical public URLs for up to 13 checks, with five seconds between attempts. It requests a fresh uncompressed response and requires byte equality before continuing. A persistent mismatch reports the affected path and, when a bounded response was readable, the expected and observed digest prefixes.

### Incident response

1. Identify the failed command, commit, current manifest, evidence status and active Cloudflare version. Check whether the log confirms a verified restore. Pause further operator-initiated promotions if the active rollout is uncertain.
2. If automatic restore was withheld or failed, compare the previous recorded version and actual live files. After review, an authorised operator can select the known-good version in the Cloudflare dashboard. Confirm the intended Worker and 100% deployment. Record the incident and compare the live bytes.
3. Confirm the active source revision and catalogue remain compatible. Fix the underlying issue through the normal review path. Rerun the validated workflow. If GitHub disables schedules after inactivity, re-enable the workflow and dispatch a review on `main`.
4. Treat upstream freshness, review dates and published coverage as observable statuses rather than guaranteed service-level commitments. Review maintenance exceptions instead of assigning unverified values to missing rates.

## Verify a published release

These commands only read public files. Use the approved hostname and the expected application revision from Actions. The shell example uses curl, jq and sha256sum.

```sh
studio_url='https://studio.ethan0wens.tech'
curl --fail --silent --show-error "$studio_url/pricing/manifest.json" > manifest.json
catalogue_id=$(jq -er '.catalogueId | select(test("^[0-9a-f]{64}$"))' manifest.json)
curl --fail --silent --show-error "$studio_url/pricing/catalogue-$catalogue_id.json" > catalogue.json
printf '%s  %s\n' "$catalogue_id" catalogue.json | sha256sum -c -
curl --fail --silent --show-error "$studio_url/pricing/health.json" | jq '.release'
```

Compare the health report's application, catalogue ID and pricing timestamp with the workflow. Open the studio and a deep documentation link. Build an illustrative example, inspect one known and one unresolved cost path, and generate an export. The production smoke in Actions performs repeatable public checks. For documented details see [testing](07-verification-and-tests.md), [freshness and coverage](05-catalogue-contract.md#coverage-and-freshness) and [operator catalogue recovery](05-catalogue-maintenance.md#operator-procedures).

## Verify the delivery boundary

The production gate checks the actual HTTPS policy, SPA fallback, immutable bundle and snapshot caching and the revalidated manifest, then runs browser smoke. See [Security & Privacy](06-security-and-privacy.md). The validation job reads public sources, the publisher receives production credentials, and issue reporting has a separate job.
