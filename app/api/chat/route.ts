import { after } from "next/server";
import { chatResponse, json, pickLocale, validateMessages, type ChatBody } from "@/lib/chat";
import { resolveProfile } from "@/lib/profiles";
import { isOriginAllowed, rateLimit } from "@/lib/security";
import { recordStats } from "@/lib/stats";

export const maxDuration = 30;

export async function POST(req: Request) {
  // 1) Rate limit podle IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip)) return json(429, "rate_limited");

  // 2) Vstup a profil (DB, záložně client.config.ts)
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return json(400, "invalid_json");
  }
  const profile = await resolveProfile(body.profile);
  if (!profile || !profile.active) return json(404, "profile_inactive");

  // 3) Původ požadavku – domény profilu
  if (!isOriginAllowed(req.headers.get("origin"), req.headers.get("host"), profile.allowedOrigins)) {
    return json(403, "origin_not_allowed");
  }

  // 4) Validace zpráv
  const valid = validateMessages(body);
  if ("error" in valid) return valid.error;

  // 5) Statistiky – jen počty, bez obsahu
  const userMessages = valid.messages.filter((m) => m.role === "user").length;
  after(() => recordStats(profile.id, { messages: 1, conversations: userMessages === 1 ? 1 : 0 }));

  // 6) AI odpověď
  return chatResponse({
    profile,
    messages: valid.messages,
    locale: pickLocale(body.locale),
    onError: (kind) => void recordStats(profile.id, kind === "busy" ? { busy: 1 } : { errors: 1 }),
  });
}
