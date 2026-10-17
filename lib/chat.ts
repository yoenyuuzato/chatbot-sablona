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
import { getKnowledgeMarkdown, type ChatProfile } from "@/lib/profiles";

export type ChatBody = { messages?: UIMessage[]; locale?: string; profile?: string };

export function json(status: number, error: string) {
  return Response.json({ error }, { status });
}

function textOf(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

/** Validace historie: role, max. počet zpráv, délka poslední zprávy. */
export function validateMessages(body: ChatBody): { messages: UIMessage[] } | { error: Response } {
  const all = Array.isArray(body.messages) ? body.messages : [];
  const messages = all
    .filter((m) => (m.role === "user" || m.role === "assistant") && Array.isArray(m.parts))
    .slice(-clientConfig.ai.maxHistory);
  const last = messages.at(-1);
  if (!last || last.role !== "user") return { error: json(400, "no_user_message") };
  if (textOf(last).length > clientConfig.ai.maxMessageLength) return { error: json(413, "too_long") };
  return { messages };
}

export function pickLocale(value: unknown): Locale {
  return clientConfig.locales.includes(value as Locale) ? (value as Locale) : clientConfig.locales[0];
}

/** Streamovaná odpověď AI (sdílí /api/chat a simulátor v adminu). */
export async function chatResponse(opts: {
  profile: ChatProfile;
  messages: UIMessage[];
  locale: Locale;
  freshKnowledge?: boolean;
  onError?: (kind: "busy" | "error") => void;
}): Promise<Response> {
  // Demo režim bez API klíče – aby šlo UI testovat lokálně
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

  const knowledge = await getKnowledgeMarkdown(opts.profile, { fresh: opts.freshKnowledge });
  const result = streamText({
    model: getModel(),
    system: [
      {
        role: "system",
        content: buildSystemPrompt(opts.profile, knowledge),
        // prompt caching (Claude) – statická část se neúčtuje celá při každé zprávě; Gemini cachuje automaticky
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      { role: "system", content: buildContext(opts.locale) },
    ],
    messages: await convertToModelMessages(opts.messages),
    maxOutputTokens: clientConfig.ai.maxOutputTokens,
    maxRetries: 1, // opakované pokusy by zbytečně vyčerpávaly limity (free tier)
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[chat] AI error:", error);
      const msg = String((error as { message?: string })?.message ?? error);
      const kind = /quota|rate|429|RESOURCE_EXHAUSTED|overloaded|credit/i.test(msg) ? "busy" : "error";
      opts.onError?.(kind);
      return kind;
    },
  });
}
