# Operational security

## Owner publishing checks for preview and public release

1. In GitHub **Settings → Rules → Rulesets** and **Settings → Branches**, review the rules applying to `main`. Confirm required reviews and passing CI checks, authorised maintainers, bypass roles, force-push and deletion rules. Confirm the approved path for verified catalogue writes. If a required-PR rule rejects the current built-in publisher, approve a scoped bot or reviewed catalogue workflow that preserves the same-run deployment and rollback safeguards.
2. In **Settings → Environments → production**, verify branch restrictions, reviewers and bypass roles. Confirm that only trusted main jobs use the Cloudflare deployment secrets. Review **Settings → Actions → General** for fork approval and read-only token defaults. Record the settings without secret values.
3. In Cloudflare **My Profile → API Tokens**, inspect the deployment token's permissions and account scope. Confirm it uses the intended account and required Workers Scripts access. Review people who can create or promote deployments outside GitHub, and confirm `ai-econmics-studio` uses Static Assets.
4. In GitHub **Settings → Code security** or **Advanced Security**, verify Dependabot alerts, security updates, secret scanning and push protection where available. Under **Security → Advisories**, enable private vulnerability reporting if needed. Confirm an authorised maintainer receives and can acknowledge a test advisory before advertising that channel as monitored.
5. Review the staged artefacts, regressions and evidence before publication. Record owner confirmation and save the workflow results. The owner confirmed checks 1–3 for the existing preview on 19 November 2026. Direct inspection was unavailable to the review. Check current protections again before wider release or after changes to publisher access.

## Preview delivery checks

Main deploys the existing public development preview Worker. `npm run security:preview` requires the Stage 6 security headers. The guarded deployment checks the exact Worker, published application revision, staged bytes and catalogue, runs browser reconciliation, and restores the prior version when an unrelated check fails. It reports HTTP and adds a warning when the known S6-10 response matches. A separate read-only Work workflow uses `npm run security:preview -- --observe-current`. During transition it can identify the previously verified Stage 5 application from its release receipt and report its legacy headers. Candidate verification always requires both HSTS and X-Frame-Options.

## Before public release — mandatory security requirements

**The current workers.dev deployment is a preview. The temporary HTTP transport exception must be removed before wider public release.**

- Open and retain the [custom-domain release blocker](public-release-blocker.md) in GitHub and keep the [risk register](03-risk-register.md) current.
- Attach the approved custom domain to the existing Worker. Verify provider TLS, exact HTTPS redirection or Cloudflare refusal of plaintext, the hardened response policy, static assets and the catalogue. Update the deployment and browser test targets and published links as part of the migration.
- Capture approved evidence for edge enforcement, repository protections, Cloudflare token scope, full security and financial regressions, verified deployment, risk review and public approval. Record the exact application revision and catalogue hash in [public-release.json](public-release.json). Keep secret values out of evidence.
- Run `npm run release:public` before wider promotion. It rejects the preview hostname, open S6-10 or missing evidence, then performs live strict delivery checks against the approved custom domain and revision. `npm run security:http` also defaults to strict public. A main deployment remains a preview. No automated personal notification is configured. The issue and the executable gate carry the mandatory reminder.

## Release failure and incident handling

- Keep activation and restoration serialised in the production concurrency group. Review the active Worker version. An intervening deployment requires an explicit operator decision. After restoring a known release, confirm its public catalogue matches the recorded digest.
- If a credential may have been disclosed, revoke or rotate it in the provider settings, restrict affected accounts and review workflow history. Verify production before resuming scheduled publication.
- For each proposed security exception record the advisory, component, severity, reachability, compensating controls, owner, review date and follow-up. Review a new advisory against the installed and shipped files.
- Coordinate disclosure after the fix. Keep customer data, credentials and private infrastructure details out of publicly shared artefacts.

Cloudflare documents the **Always Use HTTPS** option under Edge Certificates for managed zones. Apply the control to the approved custom domain before wider launch. See [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) and [workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
