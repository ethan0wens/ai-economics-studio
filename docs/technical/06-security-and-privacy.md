# Security & Privacy

Your environment, customer rates and licence assumptions are processed by the browser. Normal requests retrieve public application, catalogue and evidence assets. Opening an external evidence link is a separate navigation. Downloading and sharing a file moves it outside the workspace. Browser extensions, downloaded files and hosting network metadata are separate from the application's data handling.

## Importing and sharing files

Open environment files from a source you trust. The studio checks format, size and structure before it can replace your workspace. Review imported assumptions, agreements and rates before sharing an estimate. JSON contains applied inputs and the last estimate snapshot. A PDF contains planning details from the open environment. Store and share each file according to its sensitivity. Read [save and reopen](#/documentation/save-and-reopen?section=save) and [browser data handling](#/documentation/privacy?section=storage).

## Catalogue and delivery controls

The browser checks the pricing manifest and verifies the selected snapshot's SHA-256 checksum before use. An exact billing identity and valid evidence determine whether a rate can be applied. The checksum detects a changed asset and relies on a trusted publisher. See [catalogue identity](05-catalogue-contract.md#exact-price-identity).

The site restricts scripts and connections to its origin, and prevents framing and object embedding. Releases use a checked lockfile and immutable GitHub Actions revisions. Automated checks run before guarded promotion to Static Assets and verify the public application afterwards. Account protection and credential scope are reviewed by the repository owner. See [release recovery](06-security-and-operations.md) and [verification](07-verification-and-tests.md).

## Limits and independent review

An estimate describes the inputs and verified public rates available at an assessment time. It does not establish the confidentiality of a device or the accuracy of entered assumptions. The publicly reachable workers.dev site is a development preview. Use its HTTPS address. Some clients without HTTPS upgrade protection can receive the application shell over HTTP. The studio checks for a secure browser context before opening a workspace. Wider public release requires an approved custom domain and Cloudflare HTTPS enforcement. Independent review and owner verification of publishing permissions are separate from the automatic checks. See [limitations and independent review](07-limitations.md).
