# GEM LAB AI — secure connection setup

This backend is prepared as a Cloudflare Worker-compatible service. It is deliberately separate from GitHub Pages because browser code must never contain an OpenAI API key.

## Files
- `gem-lab-worker.js`: server-side proxy for text chat and image examination.
- `gem-lab.html`: contains the public (non-secret) API base setting.
- `gem-lab.js`: sends chat and image requests to the worker.
- `gem-lab.css`: laboratory interface.

## Deployment outline
1. Create a Cloudflare Worker in the user's own Cloudflare account.
2. Paste the complete contents of `gem-lab-worker.js` into the Worker editor and deploy it.
3. In Worker Settings → Variables and Secrets, add:
   - Secret `OPENAI_API_KEY`: create an API key in the OpenAI Platform and store it here. Never send it in chat or commit it to GitHub.
   - Variable `ALLOWED_ORIGIN`: `https://yassinabbes27-ux.github.io`
   - Variable `OPENAI_MODEL`: `gpt-5.5` (change only to a model available to the user's API project).
4. Add a Cloudflare rate-limiting rule for the Worker route before public launch. The Worker also validates methods, origin, request size, payload types and text length, but an edge rate-limit rule is still needed to control abuse and cost.
5. Copy the deployed Worker URL. Configure it as the value of `window.GEM_LAB_API_BASE` in `gem-lab.html` (public endpoint URL only; never a secret).
6. Test chat and image analysis from the deployed GitHub Pages site, then check the Worker logs for errors without logging image payloads.

## Security and usage
- The OpenAI key is read only from the Worker secret `env.OPENAI_API_KEY`.
- The worker has separate `/chat` and `/analyze` POST endpoints.
- Allowed browser origin is restricted by `ALLOWED_ORIGIN`.
- Image input is limited to JPEG, PNG or WebP and 4 MB.
- Chat input is limited to 1,600 characters.
- Model output is educational and explicitly cannot certify identity, natural origin, geographic origin, treatment status or value.
- No image or question is stored by this code.
- OpenAI API usage may incur separate charges according to the API project's billing and model pricing. Set project usage limits/alerts before enabling public access.

## Important current state
The Worker source and frontend hooks are ready in the isolated prototype branch. The Worker is NOT deployed, no API key has been entered, and the public site is NOT connected. The chat and image analysis will remain unavailable until the owner completes the Cloudflare and OpenAI account setup above.
