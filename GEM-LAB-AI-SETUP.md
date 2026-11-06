# GEM LAB AI — secure Gemini connection

The GEM LAB backend runs as a Cloudflare Worker. The Gemini API key must remain server-side and must never appear in browser code or GitHub.

## Files
- `gem-lab-worker.js`: server-side proxy for text chat and image examination.
- `gem-lab.html`: public Worker URL setting only.
- `gem-lab.js`: sends chat and image requests to the Worker.
- `gem-lab.css`: laboratory interface.

## Cloudflare settings
In Worker Settings → Variables and Secrets:
- Secret: `GEMINI_API_KEY` — create it in Google AI Studio and store it only in Cloudflare.
- Variable: `ALLOWED_ORIGIN` = `https://yassinabbes27-ux.github.io`
- Variable: `GEMINI_MODEL` = `gemini-3.8-flash`

The Worker uses the Gemini `generateContent` REST endpoint for both text and image requests. The model name can be changed through the `GEMINI_MODEL` runtime variable if the account does not have access to the default model.

## Routes and limits
- `POST /chat`: text questions, maximum 1,600 characters.
- `POST /analyze`: JPEG, PNG or WebP data URL, maximum 4 MB.
- Browser origin is restricted through `ALLOWED_ORIGIN`.
- No image or question is intentionally stored by this Worker code.
- Responses are educational and cannot certify identity, natural origin, geographic origin, treatment status or value.

## Before public launch
Configure Cloudflare rate limiting for this Worker. CORS is not an abuse-prevention mechanism. Gemini free-tier quotas are limited and can change; check Google AI Studio usage. Google may use content from the free tier to improve its products, so do not submit private or sensitive images or information.

## Current integration
The Worker reads only `env.GEMINI_API_KEY`. Never paste the key into source files, GitHub, or chat.
