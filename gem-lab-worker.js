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
    if (!env.OPENAI_API_KEY) return json({ error: "AI service is not configured." }, 503, allowedOrigin || "*");

    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, "");
    if (route !== "/chat" && route !== "/analyze") return json({ error: "Not found." }, 404, allowedOrigin || "*");

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 5_500_000) return json({ error: "Request too large. Use an image under 4 MB." }, 413, allowedOrigin || "*");

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400, allowedOrigin || "*"); }

    const language = body.language === "ar" ? "Arabic" : "English";
    const model = env.OPENAI_MODEL || "gpt-5.5";
    let input;

    if (route === "/chat") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > 1600) return json({ error: "Message must be 1–1600 characters." }, 400, allowedOrigin || "*");
      input = [{ role: "user", content: [{ type: "input_text", text: "Answer in " + language + ".\n\n" + message }] }];
    } else {
      const dataUrl = typeof body.image === "string" ? body.image : "";
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) return json({ error: "Provide a JPEG, PNG or WebP image." }, 400, allowedOrigin || "*");
      if (dataUrl.length > 5_000_000) return json({ error: "Image too large. Maximum 4 MB." }, 413, allowedOrigin || "*");
      const prompt = "In " + language + ", examine this gemstone/mineral photograph for visible observations only. Describe apparent colour, transparency, visible inclusions, cut or shape, and lighting limitations. Give up to three possible material families only if justified, with low/medium confidence and reasons. State explicitly that a photograph cannot establish identity, natural origin, geographic origin, treatment status, or value. Suggest non-destructive next steps and appropriate professional tests. Do not issue a certificate or definitive identification.";
      input = [{ role: "user", content: [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: dataUrl, detail: "high" }
      ] }];
    }

    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "authorization": "Bearer " + env.OPENAI_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          instructions: SYSTEM,
          input,
          max_output_tokens: route === "/chat" ? 700 : 900
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) {
        return json({ error: upstream.status === 429 ? "AI usage limit reached. Please try later." : "AI provider request failed." }, 502, allowedOrigin || "*");
      }
      const answer = result.output_text || "";
      if (!answer) return json({ error: "The assistant returned an empty response." }, 502, allowedOrigin || "*");
      return json({ answer }, 200, allowedOrigin || "*");
    } catch {
      return json({ error: "Unable to reach the AI service." }, 502, allowedOrigin || "*");
    }
  }
};