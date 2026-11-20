# Release cleanup manifest

Reviewed tracked source, workflows, docs, fixtures, static assets, configured refs and reachable Git history. Gitleaks v8.30.0 scanned the worktree and Git history with full redaction. Four historical findings and the four equivalent working-tree matches were synthetic case labels in `tests/report.test.ts`, used to select fictional report regression scenarios. No credential exposure was identified in the scanner results or focused review. The original fixture labels remain meaningful. The scan leaves Git history intact.

| Path | Action | Reason | Risk | Verification |
| --- | --- | --- | --- | --- |
| `README.md`, `docs/assets/readme/`, `scripts/capture-readme.spec.ts` | Updated | Product showcase, real local captures, fiction provenance and reproducible instructions | Broken links, inaccessible or stale pictures | Link and media checks, Chromium capture assertions and visual review |
| `.github/workflows/refresh-pricing.yml`, `scripts/deploy.ts` | Updated | Retire the superseded direct main push and separate publication from the sole production promoter | Catalogue may be staged while production remains behind after a failed rollout | Protected workflow simulation, live baseline, explicit recovery and install acceptance |
| `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`, `CONTRIBUTING.md`, `SECURITY.md` | Updated | Guide safe submissions and verified owner merges | Public disclosure of confidential inputs | Review documented private reporting and redaction instructions |
| `.gitignore` | Updated | Exclude common local secrets, logs and editor artefacts | Misclassified build assets | Source and static build review |
| `AGENTS.md`, `PREREQUISITES.md`, `docs/12-operations.md`, `docs/23-maintenance-automation.md`, `docs/technical/` | Updated or retained as dated history | Reconcile operational guidance and preserve migration and verification references | Historic paths mistaken for operational steps | Documentation and link validation |
| `catalogue/`, `fixtures/`, `tests/` | Retained | Provenance, documented test scenarios and reproducible regression | Removing useful evidence | Pricing, evidence, build and regression checks |
| `design/brand/`, `public/brand/`, `src/report-fonts/`, `LICENSE` | Retained | MIT project attribution, Economic Signal files and separately licensed fonts | Redistribution and branding accuracy | Compare source font notices and brand specification |
| `public/third-party-notices.txt` | Added | Keep notices with the browser distribution | Outdated notices after dependency changes | Check source notices for locked runtime packages, the upstream fontkit licence and bundled fonts. Reconcile the notices when these dependencies or fonts change. The build and deploy verify the exact checked-in notice. |
| `package.json`, `package-lock.json` | Retained | No dependency change was needed for the publisher or the captures | Removing runtime or CI tooling used by existing entry points | Check imports, scripts, lockfile audit and production build |

No confirmed obsolete tracked binary, PDF, temporary document or dependency required removal. Archived implementation decisions stay in their dated documents with current operating instructions linked. Independently review private repository settings before public approval. This audit did not serve as a live penetration test.
