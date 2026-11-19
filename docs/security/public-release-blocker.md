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
