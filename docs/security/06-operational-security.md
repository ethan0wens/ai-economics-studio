# Operational security

## Owner publishing checks for preview and public release

1. In GitHub **Settings → Rules → Rulesets** and **Settings → Branches**, review the rules applying to `main`. Confirm required reviews and passing CI checks, authorised maintainers, bypass roles, force-push and deletion rules. Confirm the approved path for verified catalogue writes. Use the [separate GitHub App publisher](../36-protected-pricing-publication.md) with a required, current PR check and no ruleset bypass.
2. In **Settings → Environments → production**, verify branch restrictions, reviewers and bypass roles. Confirm that only trusted main jobs use the Cloudflare deployment secrets. Review **Settings → Actions → General** for fork approval and read-only token defaults. Record the settings without secret values.
3. In Cloudflare **My Profile → API Tokens**, inspect the deployment token's permissions and account scope. Confirm it uses the intended account and required Workers Scripts access. Review people who can create or promote deployments outside GitHub, and confirm `ai-econmics-studio` uses Static Assets.
4. In GitHub **Settings → Code security** or **Advanced Security**, verify Dependabot alerts, security updates, secret scanning and push protection where available. Under **Security → Advisories**, enable private vulnerability reporting if needed. Confirm an authorised maintainer receives and can acknowledge a test advisory before advertising that channel as monitored.
5. Review the staged artefacts, regressions and evidence before publication. Record owner confirmation and save the workflow results. The owner confirmed checks 1–3 for the existing preview on 19 November 2026. Direct inspection was unavailable to the review. Check current protections again before wider release or after changes to publisher access.

## Custom-domain delivery checks

The deploy guard targets the existing Worker through `studio.ethan0wens.tech`. A guarded release requires an enabled Cloudflare Custom Domain on the exact account and Worker, valid TLS, direct HTTPS enforcement and the expected application, assets and catalogue. The browser smoke and rollback use the same hostname. The Work observation runs `npm run security:production -- --observe-current` against the active canonical receipt. For an independent expected release, use `npm run security:production -- <application SHA-1> <catalogue SHA-256>`.

The legacy workers.dev hostname was the development preview. Its transport policy and exception are retained for historical evidence only. The current Wrangler configuration disables the hostname and Preview URLs. Deployments verify Cloudflare's settings and check that the legacy host refuses the Studio over both protocols. Legacy routing settings are separate from Worker versions. A rollback restores static assets at the Custom Domain with the current routing settings.

## Before public release — mandatory security requirements

**Wider public release requires verified custom-domain delivery, a reviewed S6-10 decision and owner approval.**

- Open and retain the [custom-domain release blocker](public-release-blocker.md) in GitHub and keep the [risk register](03-risk-register.md) current.
- Attach the approved custom domain to the existing Worker. Verify provider TLS, exact HTTPS redirection or Cloudflare refusal of plaintext, the hardened response policy, static assets and the catalogue. Update the deployment and browser test targets and published links as part of the migration.
- Capture approved evidence for edge enforcement, repository protections, Cloudflare token scope, full security and financial regressions, verified deployment, risk review and public approval. Record the exact application revision and catalogue hash in [public-release.json](public-release.json). Keep secret values out of evidence.
- Run `npm run release:public` before wider promotion. It rejects the preview hostname, open S6-10 or missing evidence, then performs live strict delivery checks against the approved custom domain and revision. `npm run security:http` also defaults to strict public. A technical deployment does not approve wider public release. No automated personal notification is configured. The issue and the executable gate carry the mandatory reminder.
- Submit the approval record on its own after checking the exact active release. A record-only push leaves the verified application receipt in place. Any later application or catalogue promotion must match the release being reviewed.

## Release failure and incident handling

- Keep activation and restoration serialised in the production concurrency group. Review the active Worker version. An intervening deployment requires an explicit operator decision. After restoring a known release, confirm its public catalogue matches the recorded digest.
- If a credential may have been disclosed, revoke or rotate it in the provider settings, restrict affected accounts and review workflow history. Verify production before resuming scheduled publication.
- For each proposed security exception record the advisory, component, severity, reachability, compensating controls, owner, review date and follow-up. Review a new advisory against the installed and shipped files.
- Coordinate disclosure after the fix. Keep customer data, credentials and private infrastructure details out of publicly shared artefacts.

Verify the edge rule for the approved hostname. To scope an HTTP redirect to Studio, match the exact hostname and plaintext scheme, redirect to the matching HTTPS path, and enable query-string preservation. Cloudflare also documents the zone-wide **Always Use HTTPS** option. See [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) and [workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
