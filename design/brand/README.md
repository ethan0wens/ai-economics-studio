# Economic Signal

Economic Signal is AI Economics Studio’s identity within the light-first Cloud Professional design system. The approved three bars represent architecture, economic modelling and potential business value. The identity is an original design concept and has not received trademark clearance.

## Masters and browser assets

| Location | Use |
| --- | --- |
| `design/brand/economic-signal-mark.svg` | Three-colour mark on light surfaces |
| `design/brand/economic-signal-mark-on-dark.svg` | Supplied dark-surface colours, used in the mobile top bar, hero and PDF covers |
| `design/brand/economic-signal-mark-mono.svg` and `economic-signal-mark-white.svg` | Single-colour variants for appropriate backgrounds |
| `design/brand/economic-signal-lockup.svg` and `economic-signal-lockup-on-dark.svg` | Reference compositions with wordmarks |
| `design/brand/app-icon.svg` and `favicon-on-light.svg` | Navy and light app-icon masters |
| `public/brand/favicon.svg` and `favicon.ico` | Navy browser icon and ICO fallback |
| `public/brand/favicon-16.png`, `favicon-32.png`, `favicon-48.png` | Browser raster fallbacks |
| `public/brand/apple-touch-icon.png`, `app-icon-192.png`, `app-icon-512.png` | Touch and high-density browser icon sizes |

The SVG masters use the original kit geometry. Keep the aspect ratio and the bar sequence. Reserve clear space of at least 12% of the visible mark width. The React lockup uses the asset frame and an 8–10 CSS pixel gap to adjacent HTML text at its current sizes.

Use `BrandMark` for a standalone labelled mark and `BrandLockup` for linked navigation identity. The lockup’s image is decorative because adjacent HTML provides the accessible name. The Home hero and Review introduction can use the optional, non-interactive `EconomicSignalMotif`. Keep motifs away from forms, financial tables, warnings and evidence. The direction board in the supplied kit is a visual reference. The published catalogue and the workspace remain the sources for production data.

## Colour, type and surfaces

[Cloud Professional tokens](../tokens.json) define midnight navy, cobalt, supporting blue, soft blue, primary light, cloud surface, canvas and white. CSS variables use the same values and regression tests check their alignment. Use navy for the Home hero and narrow top bar, cloud for secondary surfaces, white for forms and evidence, and blue for actions and selection. Retain semantic status labels and the existing category palette. Inter remains bundled locally. Use tabular numerals for quantities and money.

Reflow at 320 CSS pixels, preserve visible keyboard focus, and keep the navigation dialog and scrollable tables accessible. Brand imagery derives from local assets. The motif is hidden from assistive technology and uses no motion or pointer events.

## Browser and PDF delivery

The HTML declares the same-origin SVG, ICO and PNG paths. Cloudflare revalidates them with the existing `no-cache` policy. Brand marks referenced by JavaScript and CSS use Vite’s content-hashed assets. Build checks cover the icon allowlist; deployment checks the referenced icon bytes, cache rules and media types on the existing Worker. A new deployment replaces the same-origin shell and icon references together.

Both PDF formats draw the original light and dark SVG paths using `pdf-lib` vector primitives. They share a navy cover, a small internal page identifier, rules, and footers. The internal pages use paper-friendly light surfaces. The renderer uses its existing Inter and Unicode fallback fonts, measured layout, accepted ledger and report-format rules.

## Updating derived files

Prefer the supplied PNGs for the current identity. To regenerate after a reviewed master update, render `app-icon.svg` on its transparent square viewBox with a local SVG renderer at 16, 32, 48, 180, 192 and 512 pixels. For example, CairoSVG can render a 32-pixel output with `cairosvg design/brand/app-icon.svg -W 32 -H 32 -o favicon-32.png`. Copy the 180-pixel output to `apple-touch-icon.png` and the 192- and 512-pixel outputs to `app-icon-192.png` and `app-icon-512.png`. A local ICO encoder such as ImageMagick can package the 16-, 32- and 48-pixel outputs into `favicon.ico`. The supplied artwork tools are only used offline. They are not build or browser dependencies.

Keep the public SVG and rendered square master aligned. Check the small sizes visually and run the brand, PDF and browser regression suites before releasing an updated asset.
