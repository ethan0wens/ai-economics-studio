# Contributing

Use Node.js 24 LTS and run `npm ci`. Read [AGENTS.md](AGENTS.md) and the relevant specification before changing financial, domain, deployment or privacy behaviour. Run the checks in the README, including the browser suite for workflow changes. Keep lockfile updates with the dependency change they support.

Use fictional fixtures in tests. A proposed retail mapping should include the official API selector, actual meter ID, original unit and tier, region, currency, and documented applicability. Separate model availability or licensing evidence from price evidence. Add regression cases for missing and ambiguous responses as well as expected output.

Keep calculations deterministic and independent from React. When changing rounding or assumptions, update the on-screen explanation and report together. Record migration behaviour for any schema changes. Never add a tenant identifier, real customer configuration, contractual price or secret to a commit or issue.
