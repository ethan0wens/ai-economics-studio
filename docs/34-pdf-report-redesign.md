# PDF reporting audit and design decisions

The previous browser report ran the existing ledger but placed its findings in a single text stream. The executive title, totals and estimates all competed with rows of pipe-separated text. The report repeated source URLs for individual charges, displayed categories as labels and repeated item details without column alignment. Unknown charges appeared in the text but took work to distinguish from a complete estimate. The single-column appendix made it difficult to compare bases, find contractual rates or separate retained licence spend.

The renderer wrapped paragraphs on every page independently and reserved space using fixed guesses. That could separate headings from content, leave uneven space and make long names hard to follow. Footer and heading rules were consistent in position, but there was no cover, contents, section navigation or hierarchy for reading the assessment selectively. The diagram scaled all nodes into one fixed box and silently clipped names to 25 characters. A large graph could become too small to read. Standard Helvetica could replace accented and non-Latin characters with question marks.

The redesign uses Cloud Professional A4 templates, a cover, a shared executive summary and clearly labelled appendix sections. Tables will measure rows and repeat context at page transitions. The same ledger will supply monthly and annual amounts, pricing basis, licence scopes and uncertainty. Known-cost bars will exclude unresolved lines from their denominator. The full report will keep a per-charge detail register and reuse numbered, plain-text source references. Readable landscape diagrams will use the existing projection where it fits. Larger graphs will use grouped relationships and complete registers with stable node references. Browser generation will use locally bundled fonts, preserve control-character sanitisation and keep customer data on the device.

## Reproduce the visual review

The PDF test generates both formats for each fictional scenario with a fixed report timestamp. Save the outputs locally, then render any page for review.

```sh
STUDIO_PDF_ARTIFACTS=/tmp/studio-report-review npm test -- tests/report.test.ts
pdftoppm -png -r 110 /tmp/studio-report-review/04-enterprise-full.pdf /tmp/studio-report-review/enterprise-page
pdftoppm -png -r 110 /tmp/studio-report-review/09-dense-architecture-full.pdf /tmp/studio-report-review/dense-page
```

Compare the cover, the financial summary and known-cost chart, the technical findings, the diagram or grouped relationships, the itemised ledger and the source register. Inspect the long text, mixed Unicode, all-unresolved, shared capacity and licence cases separately. Check that headers repeat with a data row, wide amounts stay within their columns and page numbers match the contents.

The first rendered samples exposed glyphs missing from the dynamically subset TrueType fonts in Poppler despite correct text extraction. The report now embeds tested static font assets and includes more Japanese and Traditional Chinese characters in its conditional fallback. The fictional Unicode fixture retains a replacement symbol for emoji. Final PDFs use selectable text and printed contents. Tags and PDF bookmarks are outside this release.

## Embedded fonts

The [font source notes](../src/report-fonts/README.md) list upstream revision, licences and the browser loading and embedding choices.
