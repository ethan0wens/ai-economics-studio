# Security verification and release decision

Review began on 19 November 2026. The assessment used source inspection, controlled regression tests and low-impact requests for public assets.

| Check | Command or evidence |
| --- | --- |
| Dependency chain | `npm audit --json` and `npm audit --omit=dev --json` returned zero advisories on the locked graph. `npm run security:audit` gates High for the full graph and Moderate for runtime dependencies. Review full advisory results even below the automation threshold. |
| Static analysis | `npm run typecheck` and `npm run lint` check typed contracts and prohibited injection sinks. `npm run security:build` checks the static allowlist, headers, linked entry assets, catalogue hashes and selected credential markers. |
| Security regressions | `npm test` includes malformed input, exact URL/path checks, file and catalogue limits, PDF metadata and existing mocked promotion and rollback tests. |
| Browser and finance | Run `npm run build` then `STUDIO_CHECK_PUBLISHED_CATALOGUE=1 npm run test:e2e`. Coverage includes local Chromium policy enforcement, data isolation, PDF/JSON and fictional financial reconciliations. |
| Public HTTP | Run `npm run security:http`. This workspace's Cloudflare request received a proxy refusal. The read-only GitHub `public-security` job runs the same delivery probe. |
| Guarded publication | Stage 6 adds a public security check to the existing guarded promotion. Owner settings and production candidate promotion are recorded separately from local and no-secret verification. |

The dependency review included React, Marked, Zod, Decimal, Dagre, pdf-lib, Vite, Tailwind, TypeScript, Vitest, Playwright, PDF.js and Wrangler, including their locked transitive packages. The registry result reflects reported advisories at the time of the scan. The installed packages and referenced action releases have versioned sources. A zero count does not establish package maintainership, unreported vulnerability status or the absence of compromise. Review release activity and reachable functionality for each new alert.

## Local candidate results

A clean lockfile installation with disabled lifecycle scripts succeeded after assigning a writable npm cache. Type checking, the injection-sink rules, security build validation, all 78 Vitest tests and all 44 Chromium tests passed. This includes the existing financial reconciliation and new import, export, network, storage and CSP checks. Wrangler's local Static Assets server returned the candidate CSP, frame denial, HSTS, no-sniff and separate mutable/immutable cache policies. A direct SPA route returned the same shell. The candidate contained the validated 377-rate manifest and its bound snapshots. A lockfile-only CycloneDX SBOM was generated locally with 348 components.

## GitHub verification

The [work-branch run](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44562495907) installed the lockfile, audited dependencies, refreshed from the live Azure API, passed the complete validation and browser suite, and uploaded the staged build. A separate read-only job downloaded the artefact and validated its catalogue, evidence and static security policy. The overall run is red because the public transport check found plaintext delivery on the active Worker. No Stage 6 production release was attempted.

## Release decision

**FAIL for wider release pending essential owner verification.** Required evidence includes the rules protecting the GitHub production path, the actual scope of the Cloudflare publishing credential, and edge enforcement of HTTPS on the Worker hostname. A [GitHub probe](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44562495907/job/135695273441) confirmed the active release's HTTPS CSP, cache rules, SPA fallback and catalogue digest. The Worker response included no explicit HSTS or X-Frame-Options header. The policy's frame-ancestors restriction was present. The plaintext endpoint returned the same shell with HTTP 200. Chromium's [preload configuration](https://github.com/chromium/chromium/blob/main/net/http/transport_security_state_static.json) forces HTTPS for .dev and its subdomains. The passive probe checked the edge with a client that does not apply the browser preload list. Candidate application defences are verified locally. Provider enforcement of the first request remains open. The settings APIs were unavailable to the review. The Stage 6 candidate is suitable for review from the work branch. Resume through the existing guarded workflow after the [owner checks](06-operational-security.md). A complete independent security assessment and penetration test have not been performed.
