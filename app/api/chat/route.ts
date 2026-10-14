import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { clientConfig, type Locale } from "@/client.config";
import { buildContext, buildSystemPrompt } from "@/lib/knowledge";
import { envKeyName, getModel, hasApiKey } from "@/lib/model";
import { isOriginAllowed, rateLimit } from "@/lib/security";

export const maxDuration = 30;


function json(status: number, error: string) {
  return Response.json({ error }, { status });
}

function textOf(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export async function POST(req: Request) {
  // 1) Původ požadavku
  if (!isOriginAllowed(req.headers.get("origin"), req.headers.get("host"))) {
    return json(403, "origin_not_allowed");
  }

  // 2) Rate limit podle IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip)) return json(429, "rate_limited");

  // 3) Validace vstupu
  let body: { messages?: UIMessage[]; locale?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, "invalid_json");
  }
  const all = Array.isArray(body.messages) ? body.messages : [];
  const messages = all
    .filter((m) => (m.role === "user" || m.role === "assistant") && Array.isArray(m.parts))
    .slice(-clientConfig.ai.maxHistory);
  const last = messages.at(-1);
  if (!last || last.role !== "user") return json(400, "no_user_message");
  if (textOf(last).length > clientConfig.ai.maxMessageLength) return json(413, "too_long");

  // 4) Demo režim bez API klíče – aby šlo UI testovat lokálně
  if (!hasApiKey()) {
    const reply =
      `⚠️ **Demo režim** – chybí \`${envKeyName()}\`. Přidej ho do \`.env.local\` (lokálně) nebo do Environment Variables na Vercelu a bot začne odpovídat podle znalostní báze.`;
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "text-start", id: "demo" });
        for (const word of reply.split(/(\s+)/)) {
          writer.write({ type: "text-delta", id: "demo", delta: word });
          await new Promise((r) => setTimeout(r, 15));
        }
        writer.write({ type: "text-end", id: "demo" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  // 5) AI odpověď
  const locale: Locale = clientConfig.locales.includes(body.locale as Locale)
    ? (body.locale as Locale)
    : clientConfig.locales[0];
  const system = await buildSystemPrompt();
  const result = streamText({
    model: getModel(),
    system: [
      {
        role: "system",
        content: system,
        // prompt caching (Claude) – statická část se neúčtuje celá při každé zprávě; Gemini cachuje automaticky
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      { role: "system", content: buildContext(locale) },
    ],
    messages: await convertToModelMessages(messages),
    maxOutputTokens: clientConfig.ai.maxOutputTokens,
    maxRetries: 1, // opakované pokusy by zbytečně vyčerpávaly limity (free tier)
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[chat] AI error:", error);
      const msg = String((error as { message?: string })?.message ?? error);
      return /quota|rate|429|RESOURCE_EXHAUSTED|overloaded|credit/i.test(msg) ? "busy" : "error";
    },
  });
}
