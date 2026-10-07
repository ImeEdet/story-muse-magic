import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

const Body = z.object({
  action: z.enum(["detect", "chat"]),
  draftText: z.string().max(50000),
  vibes: z.array(z.string().max(120)).max(60).default([]),
  candidates: z.array(z.string().max(120)).max(80).default([]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(40)
    .default([]),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function* deltas(body: ReadableStream<Uint8Array>) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") yield evt.delta;
      } catch { /* ignore */ }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Please sign in to use the Muse." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to use the Muse." }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, draftText, vibes, candidates, messages } = parsed.data;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    let instructions: string;
    let input: Record<string, unknown>[];
    let extra: Record<string, unknown> = {};

    if (action === "detect") {
      instructions = `You read fiction drafts and identify their tone, genre, aesthetic and scope. Choose 2-6 vibes ONLY from this exact list: ${candidates.join(" | ")}. Also give a one-sentence mood reading of the prose.`;
      input = [{ role: "user", content: `Draft:\n\n${draftText.slice(-8000)}` }];
      extra = {
        text: {
          format: {
            type: "json_schema",
            name: "vibes",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["vibes", "mood"],
              properties: {
                vibes: { type: "array", items: { type: "string" } },
                mood: { type: "string" },
              },
            },
          },
        },
      };
    } else {
      instructions = `You are the Muse inside StorySpark, a warm, literate creative partner for a fiction writer. You can see their current draft. Vibes in play: ${vibes.join(", ") || "none yet"}.
Give concise, specific, evocative help: plot ideas, twists, character/place names, settings, titles, or line-level feedback. Use short markdown lists when offering multiple options (3-5). Match the draft's tone. Never rewrite their whole draft unless asked.

CURRENT DRAFT:
"""
${draftText.slice(-20000) || "(empty page)"}
"""`;
      input = messages.map((m) => ({ role: m.role, content: m.content }));
    }

    const upstream = await fetch(GATEWAY, {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        ...extra,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status;
      const msg =
        status === 429 ? "The Muse is busy. Try again in a moment."
        : status === 402 ? "AI credits have run out for this workspace."
        : `The Muse couldn't respond (${status}).`;
      return json({ error: msg }, status === 429 || status === 402 || status === 403 ? status : 502);
    }

    if (action === "detect") {
      let text = "";
      for await (const d of deltas(upstream.body)) text += d;
      const result = JSON.parse(text);
      const allowed = new Set(candidates);
      return json({ vibes: (result.vibes as string[]).filter((v) => allowed.has(v)), mood: result.mood });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          for await (const d of deltas(upstream.body!)) controller.enqueue(enc.encode(d));
        } catch { /* aborted */ }
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: corsHeaders });
    return json({ error: error instanceof Error ? error.message : "Something went wrong" }, 500);
  }
});
