# Prerequisites and exact handoff sequence

## Before starting Codex — mandatory (about five decisions, no Azure subscription needed)

1. **GitHub**: create a **public**, initially empty repository named `ai-economics-studio` (or your preferred name). Choose a licence only once; **MIT** is the suggested permissive licence, but it is the repository owner's decision. If creating a README through GitHub, merge this handover's README rather than overwriting unrelated content.
2. **Cloudflare**: create or use a **Free** account and identify its **Account ID** under the account dashboard. For this repository, use the existing Worker `ai-econmics-studio` at `https://studio.ethan0wens.tech`.
3. **Codex access**: connect GitHub in Codex Cloud and grant access to this repository, or clone it locally and use Codex in your IDE/CLI. Confirm Codex has write access to its working branch. A paid Azure subscription, Microsoft tenant, Microsoft API key and database are **not** prerequisites.
4. **Upload**: extract `ai-economics-studio-codex-handover.zip` and commit the **contained files**, including root `AGENTS.md`, `docs/`, `fixtures/`, `prompts/` and `design/` to the repository root. Do not commit just the ZIP or put everything inside a nested `ai-economics-studio-handover/` folder.
5. **Launch the first task**: paste `prompts/01-build-mvp.md` into Codex. Let it execute across milestones without demanding approval for ordinary internal coding decisions. Review the final diff and CI tests, not just a screenshot.

## Before automatic production deployment — mandatory but can be postponed until after the first Codex task

1. In Cloudflare, create a **scoped API token for Workers deployment**, using Cloudflare's documented permissions (Workers Scripts Edit on the intended account). Do not use a global API key. Consider additional permissions only if tooling proves they are necessary.
2. In GitHub repository **Settings → Environments → production**, add:
   - `CLOUDFLARE_API_TOKEN` as an Actions **secret** (never commit or paste it in a prompt).
   - `CLOUDFLARE_ACCOUNT_ID` as an environment **secret** (the account ID is not inherently a password, but treat it as configuration).
3. Allow Actions to run; ensure the deployment workflow triggers on pushes to **`main`** and manual dispatch. No deployment on untrusted pull requests; no `pull_request_target` secret exposure.
4. Keep the default Actions token read-only. Configure the [dedicated pricing GitHub App](docs/36-protected-pricing-publication.md#one-time-owner-setup) in its own environment.
5. Confirm the Cloudflare Worker name, account ID reference and enabled Custom Domain. Validate the live TLS certificate and path-preserving HTTPS redirect before deploying. The deployment token needs to read the binding and deploy the existing Worker.

**GitHub Actions behaviour.** A push with the built-in `GITHUB_TOKEN` does not reliably trigger downstream workflows. The pricing App opens and merges a validated PR through the required checks. Its resulting main push triggers the authoritative production deployment.

## Exactly how to use Codex

- Upload the files first; then paste **one** prompt from `prompts/01-build-mvp.md`. Do not manually paraphrase the specs in follow-up messages.
- Request one cohesive implementation and incremental commits/PR, not isolated UI components.
- For Codex Cloud, finish by reviewing/merging its pull request into `main` so the deployment workflow can run after secrets are added.
- Run `prompts/02-verify-and-release.md` only if the first implementation needs independent review, deployment assistance or corrections.
- Keep all credentials in GitHub secrets / Cloudflare settings; **never in exported environment JSON or browser code**.

## Post-deployment manual acceptance

- Load Worker URL in a clean/incognito browser, test a new and a restored environment, and verify page reload erases unsaved in-memory changes.
- Use browser Network tools: ensure user environments are **not transmitted** to Microsoft, Cloudflare functions, analytics providers or a bespoke API; only static same-origin assets/catalogue should be fetched by the normal app.
- Confirm no customer data is in `localStorage`, IndexedDB or cookies.
- Check prices display timestamps and sourcing; intentionally missing catalogue rates show `Unknown` rather than £0.
- Manually run the pricing workflow and check **published catalogue freshness** on the live website, not just a green GitHub run.
- Check the legal disclaimer and verify exported PDF/JSON contains no secrets.

## Operational caveats

- Cloudflare static requests currently have a free/unlimited allowance; Worker **script execution** is distinct and must remain unused in this MVP.
- Public GitHub-hosted standard Actions runners are currently free; provider terms can change.
- GitHub may disable scheduled workflows after 60 days of repository inactivity; monitor the workflow's last-success time, permit manual dispatch and document recovery.
- Daily retail pricing updates do not imply fully automated licensing, regional availability or guaranteed customer-specific prices.
- A copyright/logo-clean independent community project must not represent itself as an official Microsoft estimator.
