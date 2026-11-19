# Stage 5 documentation link audit

The audit followed every link that starts in field help, Guided, Advanced, Cost Analysis, estimate checks, Pricing Catalogue, Reports & Export, example previews, User Guides, the generated references and Technical Documentation. It also reviewed PDF source references and searched application source and repository Markdown for hardcoded GitHub destinations.

| Surface | Baseline | Stage 5 routing decision |
| --- | --- | --- |
| Field help | 27 fields had contextual links. Financial tooltips reused the GitHub copy of the original pricing methodology. Several fields showed only a Microsoft link. | Every field has a typed in-studio target. The help panel places its explanation and internal link first. Optional Microsoft citations are labelled external. |
| Guided and Advanced | Guided used a short registry. Advanced inherited the legacy financial target and some help links had no workspace return target. | Both surfaces use the same registry. Help navigation remembers the field and restores it when returning to the workspace. |
| Cost Analysis and estimate checks | Method links opened guides. Price agreement help could open the old GitHub methodology. | Agreement links open technical price precedence. Price forecasts, calculating charges and missing prices have their own targets. Back to workspace restores a relevant charge and field. |
| Pricing Catalogue and generated views | Source documentation opened the Azure API reference. General refresh guidance used the GitHub Actions workflow. | Price verification and maintenance explanation open internal guides. Named Microsoft evidence and the explicitly labelled GitHub Actions run history remain available as primary sources. |
| Examples, Home and Reports & Export | Example walkthroughs and privacy already had in-app targets. Export guidance was mostly prose. | Existing walkthroughs and privacy targets remain internal, and export guidance uses Save and reopen. PDFs keep official evidence provenance. No PDF help reference points to GitHub Markdown. |
| Technical Markdown | Registered chapters resolved internally. Other repository-relative Markdown fell back to GitHub. | Supporting references register the audit, traceability, maintenance, product language and contributor guide. References to historical architecture and acceptance material point to current in-app equivalents. Unregistered Markdown fails validation. |
| Source and evidence links | Source files, fixtures, workflows and Microsoft evidence shared the same visual link pattern. | The Markdown renderer labels implementation sources and external evidence. Explicit source code, workflow/run history and the repository link may open GitHub. Official vendor evidence may open the relevant provider. |

## Destinations by concept

| Concept | In-studio destination |
| --- | --- |
| Model calls, tokens, cached input, retries | Foundry usage guide, per-request guidance |
| Cost lines and quantities | Technical ledger methodology, inputs and outputs |
| Price agreements | Technical contracts and licences, price precedence |
| Existing and incremental spend, licence replacement | Existing and new spend guide, comparison and replacement |
| PTUs and shared capacity | PTU guide, capacity and hours, and technical ledger allocation |
| Copilot Credits and allowance deductions | Copilot Credits guide, monthly credits and allowances |
| Licence compatibility and distinct seats | Licence evidence and assignment guidance |
| Exact rates, catalogue and forecasts | Technical catalogue identity, catalogue maintenance guide and price forecast guide |
| Unknown costs | Missing price or volume guide |
| Fields, graph and editing | Technical environment schema and relationship semantics, Guided and Advanced guide |
| JSON import/export | Save and reopen guide |

## Validation

The registry is exhaustive over the field type. The build checks both collections and all heading IDs. The Markdown resolver accepts registered documentation or explicitly allowed implementation/evidence sources. The validator rejects accidental GitHub Markdown destinations in the application's source. Playwright exercises Guided, Advanced, Cost Analysis, workspace return and each link category. The source-code links expose only public repository material.
