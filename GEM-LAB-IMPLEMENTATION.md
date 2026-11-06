# GEM LAB prototype — implementation notes

## Isolation and safety
- Prototype branch: `gem-lab-prototype-2026-11-06`
- Baseline: `main` at commit `673dd3f69ec575d54f2cab15f3edd2d4cbcf7d3b`
- The live `main` branch has not been modified.
- This prototype adds only three new frontend files: `gem-lab.html`, `gem-lab.css`, and `gem-lab.js`.
- Existing product data, images, prices, checkout/order logic, music scripts, navigation, and language code are not edited.

## Current prototype features
- Independent bilingual English/Arabic laboratory page.
- Responsive laboratory visual system.
- Educational gemstone index (amethyst, tiger's eye, aquamarine).
- Educational side-by-side comparison for selected materials.
- Guided learning-path quiz.
- Local image preview with file type and 8 MB size checks.
- AI chat interface shell with explicit unavailable-state handling.

## Important: live AI is not connected
The browser UI calls the relative endpoint `POST /api/gem-lab/chat`, but this repository is a static GitHub Pages site and no API endpoint exists yet. The image examination currently provides an honest preview/analysis-ready state; it does not claim to identify the stone. No API key is present in browser code.

## Required secure production architecture
1. Deploy a small server-side endpoint (e.g. Cloudflare Worker or another controlled serverless runtime).
2. Store the model API key only as a server-side secret, never in HTML, JS, repository files, or browser storage.
3. Add rate limiting, request-size limits, abuse protection, and basic logging that avoids retaining sensitive image data unnecessarily.
4. Validate image MIME type and file size server-side; use temporary processing and defined retention/deletion rules.
5. Return structured answers with uncertainty, likely alternatives, visible evidence, and suggested confirmatory tests.
6. The assistant must clearly distinguish educational guidance from gemological certification. A photograph cannot establish natural origin or treatment status.
7. Add a separate image-analysis endpoint only after choosing the model/provider and defining safe upload handling.

## Validation before promotion
- Confirm mobile layout and bilingual direction.
- Check keyboard accessibility, labels, and screen-reader status announcements.
- Test image file validation and local preview.
- Test compare controls and quiz results in both languages.
- Confirm failed/missing AI endpoint produces a clear message and never exposes secrets.
- Verify no changes to the original store files using a branch comparison.
- Only after user approval, add a link from the store and publish.
