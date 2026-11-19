# Maintaining the technical documentation

Use [product language guidance](../31-product-language.md) and treat the source, tests, dated evidence and workflows as authoritative. Keep task-oriented User Guides useful for readers building estimates. Use Technical Documentation for software design, equations, evidence logic, maintenance and implementation details.

## Editing and publication

1. Edit the Markdown chapter and `index.json` together when changing its navigation title, summary, aliases or related documents. The Markdown H1 mirrors the metadata title. Article IDs and heading slugs are public links. Keep both stable when changing surrounding copy. Use simple ASCII headings with stable GitHub-compatible slugs and top-level H2 followed by H3 where useful.
2. Use repository-relative links for source files and other technical chapters. The studio deep-links to registered chapters and headings and opens other source files at their GitHub paths. Include official Microsoft URLs when making external claims. Give the source window and scope. Use the guide linkage in the index for context across both areas.
3. Use inclusive tables with header labels, explicit unit text and fenced math or code. Text diagrams use a fenced `diagram` block. Put a caption on the first line and describe the flow in prose. Scrollable code and tables must remain keyboard accessible at narrow widths.
4. Update `sources.json` for new topics or renamed implementation symbols. Run `npm run docs:index` to regenerate the [article inventory](README.md) and [traceability matrix](traceability.md). Publish both generated Markdown files with the content change.
5. Run `npm run docs:validate`, `npm run build` and the applicable tests. The validation step checks file presence, registered article metadata, stable headings, internal link and scope syntax, source files and selected TypeScript names, example imports, executable object fields and relationships, and generated inventory and matrix currency. It validates external link origins without contacting all external pages. Review public external source changes through existing evidence ownership and exception handling. A provider failure can have a dated source exception and need manual investigation.
6. Review the redeployed Technical Documentation area when releasing. The browser suite checks all seven sections, source-linked routes, term search, cross-links and mobile reflow. GitHub already runs the data and documentation gates before promotion.

Supported Markdown includes inline emphasis, code, links, headings, lists, tables, block quotations, code and text diagrams. The studio renders supported parser tokens as React elements. Raw HTML, image fetches and scripts are outside this content format. Write new articles as files in this directory. Dynamic coverage, model rates, evidence counts, command scripts and reference fields come from the implementation or applied snapshot. Use date and scope labels on any historical example figures. The fictional imports in `examples/` exercise the current schema without including customer data or Microsoft rate claims.

## Pull request checklist

| If changing | Review these chapters and tests |
| --- | --- |
| Environment schema or public exports | Schema fields, relationships and migration, workspace flow, both validated example files, JSON round-trip and PDF reconciliation. |
| Quantities, rounding, overrides or licence calculation | Ledger method, contracts and licence expenditure, worked calculations, relevant independent financial fixtures and report checks. |
| Microsoft capabilities, rates or entitlements | Microsoft chapters, catalogue identity and limitations. Link exact reviewed evidence with dates and add an ambiguity/unpriced test where appropriate. |
| Catalogue ingestion, discovery or promotion | Catalogue contract and maintenance workflow, operational recovery, price/evidence tests and doc coverage generation. |
| GitHub Actions, Cloudflare or security policies | Deployment, privacy and rollback chapters, command reference, smoke verification and configured ownership. |
| Navigation, editor or documentation infrastructure | User Guide wording, technical index/cross-links, stable IDs, search, responsive layouts and focus. |

Use the [style guide](../31-product-language.md), [verification guidance](07-verification-and-tests.md) and [source traceability](traceability.md) for the rest of the review. Use a pull request or the repository's approved contributor path and include relevant checks and scope.
