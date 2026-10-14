import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { clientConfig } from "@/client.config";
import { buildSystemPrompt } from "@/lib/knowledge";
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
  let body: { messages?: UIMessage[] };
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
  if (!process.env.ANTHROPIC_API_KEY) {
    const reply =
      "⚠️ **Demo režim** – chybí `ANTHROPIC_API_KEY`. Přidej ho do `.env.local` (lokálně) nebo do Environment Variables na Vercelu a bot začne odpovídat podle znalostní báze.";
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
  const system = await buildSystemPrompt();
  const result = streamText({
    model: anthropic(clientConfig.ai.model),
    system: {
      role: "system",
      content: system,
      // prompt caching – znalostní báze se neúčtuje celá při každé zprávě
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    messages: await convertToModelMessages(messages),
    maxOutputTokens: clientConfig.ai.maxOutputTokens,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[chat] AI error:", error);
      return "error";
    },
  });
}
