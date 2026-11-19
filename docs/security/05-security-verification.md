# Security verification and release decision

Review began on 19 November 2026. The assessment used source inspection, controlled regression tests and low-impact requests for public assets.

| Check | Command or evidence |
| --- | --- |
| Dependency chain | `npm audit --json` and `npm audit --omit=dev --json` returned zero advisories on the locked graph. `npm run security:audit` gates High for the full graph and Moderate for runtime dependencies. Review full advisory results even below the automation threshold. |
| Static analysis | `npm run typecheck` and `npm run lint` check typed contracts and prohibited injection sinks. `npm run security:build` checks the static allowlist, headers, linked entry assets, catalogue hashes and selected credential markers. |
| Security regressions | `npm test` includes malformed input, exact URL/path checks, file and catalogue limits, PDF metadata and existing mocked promotion and rollback tests. |
| Browser and finance | Run `npm run build` then `STUDIO_CHECK_PUBLISHED_CATALOGUE=1 npm run test:e2e`. Coverage includes local Chromium policy enforcement, data isolation, PDF/JSON and fictional financial reconciliations. |
| Delivery policies | Run `npm run security:preview` for the hardened preview and `npm run release:public` for the strict wider-release gate. The read-only GitHub job observes the active preview. |
| Guarded publication | Stage 6 adds a public security check to the existing guarded promotion. Owner settings and production candidate promotion are recorded separately from local and no-secret verification. |

The dependency review included React, Marked, Zod, Decimal, Dagre, pdf-lib, Vite, Tailwind, TypeScript, Vitest, Playwright, PDF.js and Wrangler, including their locked transitive packages. The registry result reflects reported advisories at the time of the scan. The installed packages and referenced action releases have versioned sources. A zero count does not establish package maintainership, unreported vulnerability status or the absence of compromise. Review release activity and reachable functionality for each new alert.

## Local candidate results

A clean lockfile installation with disabled lifecycle scripts succeeded after assigning a writable npm cache. Type checking, the injection-sink rules, security build validation, all 78 Vitest tests and all 44 Chromium tests passed. This includes the existing financial reconciliation and new import, export, network, storage and CSP checks. Wrangler's local Static Assets server returned the candidate CSP, frame denial, HSTS, no-sniff and separate mutable/immutable cache policies. A direct SPA route returned the same shell. The candidate contained the validated 377-rate manifest and its bound snapshots. A lockfile-only CycloneDX SBOM was generated locally with 348 components.

## GitHub verification

The [work-branch run](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44562495907) installed the lockfile, audited dependencies, refreshed from the live Azure API, passed the complete validation and browser suite, and uploaded the staged build. A separate read-only job downloaded the artefact and validated its catalogue, evidence and static security policy. The overall run is red because the public transport check found plaintext delivery on the active Worker. No Stage 6 production release was attempted.

## Stage 6.1 release decision

**Preview policy is CONDITIONAL PASS — PREVIEW ONLY when the guarded deployment and smoke checks pass.** The owner accepted S6-10 for the exact existing Worker. The 19 November 2026 owner confirmation covers the applicable main rules and required checks, authorised writers and bypass roles, production environment restrictions and secret access, the catalogue publisher's authorised write path, and the Cloudflare account, Worker, scoped deployment token and deployment identities. Settings APIs denied direct inspection. This records the owner's confirmation.

**FAIL — WIDER PUBLIC RELEASE.** The [previous public probe](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44562495907/job/135695273441) confirmed the same Stage 5 shell over HTTP and HTTPS. Chromium's [preload configuration](https://github.com/chromium/chromium/blob/main/net/http/transport_security_state_static.json) forces HTTPS for .dev in that browser. S6-10 stays open. The current public-release record has no approved custom domain or launch evidence. Independent penetration testing and certification remain outstanding. See [mandatory public release requirements](06-operational-security.md#before-public-release--mandatory-security-requirements).

The complete [custom-domain issue draft](public-release-blocker.md) is ready for manual creation. GitHub's issue API denied this session access.
