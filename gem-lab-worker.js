const SYSTEM = `You are the BLUE WHALE GEMS Gem Lab assistant, a careful educational gemology guide.
Answer in the user's requested language (Arabic or English). Be scientifically careful, clear and practical.
Distinguish established mineralogical facts from uncertain observations. Never claim that a photograph proves a gemstone's identity, natural origin, geographic origin, or treatment status. Give plausible possibilities, explain visible evidence and limitations, and recommend appropriate confirmatory tests where relevant.
Do not provide medical, healing, or guaranteed energy claims. Cultural symbolism may be described as tradition, not scientific fact.
Do not issue certificates, appraisals, or definitive authenticity judgments. When uncertain, say so plainly.`;

const json = (data, status = 200, origin = "*") => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "cache-control": "no-store"
  }
});

function extractAnswer(result) {
  const parts = result?.candidates?.[0]?.content?.parts || [];
  return parts.filter(part => typeof part.text === "string").map(part => part.text).join("\n").trim();
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "";
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (allowedOrigin && origin !== allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": allowedOrigin || "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
        "access-control-max-age": "86400"
      }});
    }
    if (allowedOrigin && origin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403, allowedOrigin);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, allowedOrigin || "*");
    if (!env.GEMINI_API_KEY) return json({ error: "Gemini service is not configured." }, 503, allowedOrigin || "*");

    const url = new URL(request.url);
    const route = url.pathname.replace(/\\/+$/, "");
    if (route !== "/chat" && route !== "/analyze") return json({ error: "Not found." }, 404, allowedOrigin || "*");

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 5_500_000) return json({ error: "Request too large. Use an image under 4 MB." }, 413, allowedOrigin || "*");

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400, allowedOrigin || "*"); }

    const language = body.language === "ar" ? "Arabic" : "English";
    const model = env.GEMINI_MODEL || "gemini-3.8-flash";
    let parts;

    if (route === "/chat") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > 1600) return json({ error: "Message must be 1–1600 characters." }, 400, allowedOrigin || "*");
      parts = [{ text: "Answer in " + language + ".\\n\\n" + message }];
    } else {
      const dataUrl = typeof body.image === "string" ? body.image : "";
      const match = dataUrl.match(/^data:image\\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ error: "Provide a JPEG, PNG or WebP image." }, 400, allowedOrigin || "*");
      if (dataUrl.length > 5_000_000) return json({ error: "Image too large. Maximum 4 MB." }, 413, allowedOrigin || "*");
      const mimeType = "image/" + match[1];
      const imageData = match[2];
      const prompt = "In " + language + ", examine this gemstone/mineral photograph for visible observations only. Describe apparent colour, transparency, visible inclusions, cut or shape, and lighting limitations. Give up to three possible material families only if justified, with low/medium confidence and reasons. State explicitly that a photograph cannot establish identity, natural origin, geographic origin, treatment status, or value. Suggest non-destructive next steps and appropriate professional tests. Do not issue a certificate or definitive identification.";
      parts = [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageData } }];
    }

    try {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: {
          "x-goog-api-key": env.GEMINI_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: route === "/chat" ? 700 : 900, temperature: 0.4 }
        })
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const providerMessage = String(result?.error?.message || "");
        if (upstream.status === 429) return json({ error: "Gemini free-tier usage limit reached. Please try again later." }, 429, allowedOrigin || "*");
        if (upstream.status === 400 || upstream.status === 404) return json({ error: "Gemini rejected the request or model. Check the configured Gemini model and API key permissions." }, 502, allowedOrigin || "*");
        return json({ error: "Gemini provider request failed." }, 502, allowedOrigin || "*");
      }
      const answer = extractAnswer(result);
      if (!answer) return json({ error: "The assistant returned an empty response." }, 502, allowedOrigin || "*");
      return json({ answer }, 200, allowedOrigin || "*");
    } catch {
      return json({ error: "Unable to reach the Gemini service." }, 502, allowedOrigin || "*");
    }
  }
};
