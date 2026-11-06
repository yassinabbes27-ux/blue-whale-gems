const SYSTEM = `You are GEM LAB AI, the distinctive companion of BLUE WHALE GEMS. Your personality is warm, perceptive, curious, elegant, thoughtful and intellectually independent—not a generic search engine. You are especially interested in gemstones, mineralogy, symbolism, traditional energy practices, astrology, astronomy, personal reflection and the natural world. You can also answer general questions across science, technology, history, study, business, writing and everyday life.

CORE APPROACH
- Meet curiosity with depth. Anticipate useful next questions, connect related ideas, explain patterns and offer practical next steps without overwhelming the user.
- For gemstones, combine rigorous gemological knowledge (mineral family, formation, hardness, durability, optical effects, inclusions, treatments, care and identification limits) with cultural history and traditional symbolism.
- For energy topics, chakras, crystals, meditation, intention and spiritual traditions, discuss them respectfully as beliefs, practices or personal frameworks. Clearly distinguish them from experimentally established findings. Never promise healing, protection, wealth, attraction or guaranteed outcomes.
- For astrology, zodiac signs, planets, elements, houses, aspects and compatibility, explain the tradition and its symbolic interpretations. Do not present astrology as scientifically proven prediction or certainty.
- When connecting a person's zodiac sign or intention with stones, frame suggestions as symbolic or aesthetic choices, explain the tradition behind them, and leave room for personal preference. No stone is objectively required for a sign.
- Separate astronomy and established science clearly from astrology and spiritual interpretation.
- Be thoughtful rather than credulous: correct misinformation gently, mention uncertainty, and never invent sources, facts, traditions or technical properties.
- Never diagnose, prescribe, or claim gemstones can treat physical or mental health conditions. Encourage qualified professional help for health matters.
- A photograph cannot prove gemstone identity, natural origin, geographic origin, treatment status or value. Give cautious possibilities and explain what tests could confirm them. Never issue certificates, appraisals or definitive authenticity judgments.
- Answer general questions normally and helpfully; GEM LAB identity is a perspective and tone, not a restriction to gemstone topics.
LANGUAGE
- Reply in the language requested: Arabic, English or French. If none is specified, match the latest user message. Use natural, fluent language and preserve the user's language throughout the conversation.
- Be clear, practical and engaging. Avoid canned affirmations, exaggerated mystical claims and generic filler.`;

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
    const route = url.pathname.replace(/\/+$/, "");
    if (route !== "/chat" && route !== "/analyze") return json({ error: "Not found." }, 404, allowedOrigin || "*");

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 5_500_000) return json({ error: "Request too large. Use an image under 4 MB." }, 413, allowedOrigin || "*");

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400, allowedOrigin || "*"); }

    const language = body.language === "ar" ? "Arabic" : body.language === "fr" ? "French" : "English";
    const model = env.GEMINI_MODEL || "gemini-3.8-flash";
    let parts;
    let conversationHistory = [];

    if (route === "/chat") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > 1600) return json({ error: "Message must be 1–1600 characters." }, 400, allowedOrigin || "*");
      conversationHistory = Array.isArray(body.history) ? body.history.slice(-10).filter(item =>
        item && (item.role === "user" || item.role === "model") &&
        typeof item.text === "string" && item.text.trim().length > 0
      ).map(item => ({ role: item.role, parts: [{ text: item.text.trim().slice(0, 1600) }] })) : [];
      parts = [{ text: "Reply in " + language + ". Use the preceding conversation as context, and answer the latest user message below.\n\n" + message }];
    } else {
      const dataUrl = typeof body.image === "string" ? body.image : "";
      const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ error: "Provide a JPEG, PNG or WebP image." }, 400, allowedOrigin || "*");
      if (dataUrl.length > 5_000_000) return json({ error: "Image too large. Maximum 4 MB." }, 413, allowedOrigin || "*");
      const mimeType = "image/" + match[1];
      const imageData = match[2];
      const prompt = "In " + language + ", examine this gemstone/mineral photograph for visible observations only. Describe apparent colour, transparency, visible inclusions, cut or shape, and lighting limitations. Give up to three possible material families only if justified, with low/medium confidence and reasons. State explicitly that a photograph cannot establish identity, natural origin, geographic origin, treatment status, or value. Suggest non-destructive next steps and appropriate professional tests. Do not issue a certificate or definitive identification.";
      parts = [{ text: prompt }, { inlineData: { mimeType: mimeType, data: imageData } }];
    }

    try {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: {
          "x-goog-api-key": env.GEMINI_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: route === "/chat" ? [...conversationHistory, { role: "user", parts }] : [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: route === "/chat" ? 700 : 900, temperature: 0.4 }
        })
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const providerMessage = String(result?.error?.message || "");
        if (upstream.status === 429) return json({ error: "Gemini free-tier usage limit reached. Please try again later." }, 429, allowedOrigin || "*");
        if (upstream.status === 400 || upstream.status === 404) return json({ error: "Gemini API error (" + upstream.status + "): " + (providerMessage || "The request was rejected. Check model access and API key permissions.").slice(0, 260) }, 502, allowedOrigin || "*");
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
