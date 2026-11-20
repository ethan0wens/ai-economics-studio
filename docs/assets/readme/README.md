# README screenshot capture

These are real Chromium screenshots of the verified local production build at 1440 × 960. The capture reuses the same fictional business case and intercepted fictional prices as the browser regression suite. The interception stays in the test browser. The images sit outside Vite's public asset directory.

Use Node.js 24 LTS and npm. Run the following from the repository root.

```sh
npm ci
npm run build
npx playwright install chromium
npx playwright test --config playwright.readme.config.ts
```

Set `STUDIO_CHROMIUM` to a local Chromium executable if using a system browser. Review the updated screenshots for legible text, meaningful focus and private information before committing. Check that the image links and alternative text still match the GitHub README.
