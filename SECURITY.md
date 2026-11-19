# Security policy

The supported version is the current production release of AI Economics Studio and its matching public catalogue. Security fixes are reviewed against the main release line.

## Report a vulnerability

Use GitHub's private vulnerability reporting when the **Report a vulnerability** button is available. Include the affected version, a short description, impact and safe reproduction details with fictional data. Remove confidential configuration, private identifiers and credentials. [Repository advisories](https://github.com/ethan0wens/ai-economics-studio/security/advisories)

If the private reporting button is unavailable, the repository owner must enable and confirm that channel. Avoid opening a public issue with details of an unresolved security problem. Coordinate disclosure with the maintainer after they confirm receipt and have had time to triage and fix the issue.

## Security updates

Maintainers triage impact and reachability, run a focused regression and verify the guarded production promotion. The environment is processed in the browser. Use a trusted browser and handle downloaded files as potentially sensitive. [Threat model](docs/security/01-threat-model.md) · [Operational security](docs/security/06-operational-security.md)
