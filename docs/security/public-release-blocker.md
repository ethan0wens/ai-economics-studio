# Public release blocker: Configure custom domain and enforce HTTPS

The existing publicly reachable workers.dev site is a development preview. The owner has accepted S6-10 for that preview. Wider public release stays blocked until a custom domain delivers the application with verified HTTPS enforcement and the owner approves the release. Keep this issue open during preview. Suggested labels, if they exist in the repository, are `security` and `release-blocker`.

- [ ] Select and register the public domain.
- [ ] Configure the domain within Cloudflare.
- [ ] Attach the domain to the existing `ai-econmics-studio` Worker.
- [ ] Confirm valid TLS certificate delivery.
- [ ] Enable Cloudflare HTTPS enforcement for the custom domain.
- [ ] Verify plaintext HTTP cannot serve the application.
- [ ] Validate HSTS and other security headers.
- [ ] Confirm the production CSP remains effective.
- [ ] Verify the application and pricing catalogue on the new domain.
- [ ] Update deployment and browser test targets.
- [ ] Update application documentation and public links.
- [ ] Verify GitHub production protections.
- [ ] Verify Cloudflare publishing credentials.
- [ ] Rerun the full security and regression suites.
- [ ] Close or resolve S6-10 only after successful verification.
- [ ] Complete final public-release approval.

Record the exact domain, application revision, catalogue hash and approved review evidence in `docs/security/public-release.json`. Run `npm run release:public` as a blocking check before promotion. See the [risk register](03-risk-register.md) and [public release requirements](06-operational-security.md#before-public-release--mandatory-security-requirements).

## 20 November 2026 custom-domain observations

The owner selected `studio.ethan0wens.tech`. GitHub Actions observed Cloudflare nameservers `casey.ns.cloudflare.com` and `gabriella.ns.cloudflare.com`, IPv4 and IPv6 answers, and a trusted TLS 1.3 certificate covering the exact hostname. The certificate reported issuer WE1 and validity from 20 November 2026 to 18 February 2027. HTTPS returned 200 with `Strict-Transport-Security: max-age=31536000`. HTTP returned 301 to the exact HTTPS URL at the root and at `/documentation?studio_transport_probe=1`. The strict check verified the release and the catalogue against the expected revision and digest. [Transport observations](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44734726030)

Initial Chromium checks detected a request for the Cloudflare Web Analytics beacon from `static.cloudflareinsights.com`. The repository uses `Cache-Control: public, no-cache, no-transform` for the static shell to prevent Cloudflare's automatic injection and keeps the same-origin browser checks in place. The Cloudflare owner can also turn off automatic injection for this hostname in **Web Analytics → Manage site**, or exclude the Studio hostname from the existing zone site. Verify the browser requests again after any setting change. [Chromium failure evidence](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44735776118) · [Cloudflare automatic injection documentation](https://developers.cloudflare.com/web-analytics/get-started/#sites-proxied-through-cloudflare)

### Review before approving

- Verify the dashboard shows the enabled Custom Domain on the existing `ai-econmics-studio` Worker and the intended Cloudflare zone. Check the managed DNS, edge certificate, redirect scope and any conflicting rules. Keep Workers Routes Edit limited to the intended zone if declarative ownership is needed.
- Review the production and rollback job receipts, the exact application revision and catalogue digest, the full security and financial/browser results, and the status of the legacy endpoint.
- Record current GitHub branch and environment protections, approved publisher and bypass roles, Cloudflare credential and identity scope, and the risk-register review. Link the reviewed evidence and the owner's separate launch approval in `public-release.json`. Keep secret values out of the record.

### Reference classification

| Use | Entries |
| --- | --- |
| Canonical production target | `productionOrigin`, guarded asset capture and publish, Chromium smoke, rollout reporting, rollback, current documentation and pricing links |
| Legacy preview | `previewOrigin`, the preview-only verifier, the owner exception and its historical evidence |
| Configuration and deployment guards | `workers_dev`, the exact Worker and Custom Domain lookup, HTTPS policy selection, and the S6-10 evidence gate |
| Test fixtures | Explicit HTTPS and HTTP policy fixtures with fictional applications, prices and responses |
| Historical records | Earlier workflow receipts, preview-specific remediations and the original risk acceptance |
