# Security policy

The supported version is the current publicly reachable development preview and its matching catalogue. Security fixes are reviewed on the main release line. The owner temporarily accepts the existing workers.dev HTTP behaviour as S6-10 for preview. Wider public release requires a custom domain with verified HTTPS enforcement. [Release requirements](docs/security/06-operational-security.md#before-public-release--mandatory-security-requirements) · [Risk register](docs/security/03-risk-register.md)

## Report a vulnerability

Use GitHub's private vulnerability reporting when the **Report a vulnerability** button is available. Include the affected version, a short description, impact and safe reproduction details with fictional data. Remove confidential configuration, private identifiers and credentials. [Repository advisories](https://github.com/ethan0wens/ai-economics-studio/security/advisories)

If the private reporting button is unavailable, the repository owner must enable and confirm that channel. Avoid opening a public issue with details of an unresolved security problem. Coordinate disclosure with the maintainer after they confirm receipt and have had time to triage and fix the issue.

## Security updates

Maintainers triage impact and reachability, run a focused regression and verify the guarded production promotion. The environment is processed in the browser. Use a trusted browser and handle downloaded files as potentially sensitive. [Threat model](docs/security/01-threat-model.md) · [Operational security](docs/security/06-operational-security.md)
