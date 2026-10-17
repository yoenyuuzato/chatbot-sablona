import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { clientConfig, type Locale } from "@/client.config";
import { resolveProfile } from "@/lib/profiles";
import { isOriginAllowed, rateLimit } from "@/lib/security";

export const maxDuration = 30;

/**
 * Přirozený (neuronový) hlas přes Gemini TTS.
 * Když selže (limit free tieru, chybí klíč…), vrátí 503 a widget použije hlas prohlížeče.
 */
export async function POST(req: Request) {
  const tts = clientConfig.voice.tts;
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (tts.engine !== "gemini" || !key) return Response.json({ error: "tts_disabled" }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`tts:${ip}`)) return Response.json({ error: "rate_limited" }, { status: 429 });

  let body: { text?: string; locale?: string; profile?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const profile = await resolveProfile(body.profile);
  if (!profile || !profile.active) return Response.json({ error: "profile_inactive" }, { status: 404 });
  if (!isOriginAllowed(req.headers.get("origin"), req.headers.get("host"), profile.allowedOrigins)) {
    return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  }
  const text = (body.text ?? "").trim().slice(0, tts.maxChars);
  if (!text) return Response.json({ error: "empty" }, { status: 400 });

  const locale: Locale = clientConfig.locales.includes(body.locale as Locale) ? (body.locale as Locale) : clientConfig.locales[0];
  const google = createGoogleGenerativeAI({ apiKey: key });

  // zkus modely postupně (různé mají různé limity free tieru)
  for (const modelId of tts.models) {
    try {
      const { audio } = await generateSpeech({
        model: google.speech(modelId),
        text,
        voice: profile.voice ?? tts.defaultVoice,
        language: locale,
        instructions: tts.style[locale],
        maxRetries: 0,
      });
      return new Response(Buffer.from(audio.uint8Array), {
        headers: {
          "Content-Type": audio.mediaType || "audio/wav",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.warn(`[tts] ${modelId} selhal:`, String((error as Error)?.message ?? error).slice(0, 300));
    }
  }
  return Response.json({ error: "tts_failed" }, { status: 503 });
}
