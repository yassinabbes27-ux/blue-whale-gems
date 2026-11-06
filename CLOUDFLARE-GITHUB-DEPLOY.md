# GEM LAB — Cloudflare GitHub deployment

This setup deploys only the isolated GEM LAB Worker. It does not publish or change the storefront.

## Prepared configuration
- Wrangler entry point: `gem-lab-worker.js`
- Worker name: `yellow-heart-cbd0blue-whale-gem-lab` (matches the Worker already created in Cloudflare)
- Allowed website origin: `https://yassinabbes27-ux.github.io`
- Runtime model: `gpt-5.5`
- No API key is stored in this repository.

## Connect the existing Worker
1. In Cloudflare, open Workers & Pages and select the existing Worker named `yellow-heart-cbd0blue-whale-gem-lab`.
2. Open Settings → Builds → Connect.
3. Choose GitHub and authorize Cloudflare if asked.
4. Select repository `yassinabbes27-ux/blue-whale-gems`.
5. Select branch `gem-lab-prototype-2026-11-06` — do NOT select `main`.
6. Set the root directory to `/` (repository root).
7. Use deploy command `npx wrangler deploy`. No build command is needed.
8. Save the build settings. Cloudflare Workers Builds will deploy on commits to the selected branch.

## Add the runtime secret after the first successful deployment
In the Worker dashboard, open Settings → Variables and Secrets:
- Add a secret named `OPENAI_API_KEY` containing an API key created in the OpenAI Platform.
- Keep it as a Secret, not a plain text variable.
- Never paste the key into GitHub or this chat.

The non-secret variables `ALLOWED_ORIGIN` and `OPENAI_MODEL` are already defined in `wrangler.jsonc`.

## Important safeguards
- Keep the production branch set to `gem-lab-prototype-2026-11-06`.
- Do not connect this Worker to the repository's `main` branch.
- Do not merge the prototype branch into `main` as part of this setup.
- The storefront files on `main` remain unchanged.
- The GEM LAB frontend still needs its public Worker URL inserted into `window.GEM_LAB_API_BASE` after deployment; that will be done as a separate prototype-branch-only change.
- Configure a Cloudflare rate-limiting rule before making the AI endpoints public. OpenAI API usage can incur separate charges.
