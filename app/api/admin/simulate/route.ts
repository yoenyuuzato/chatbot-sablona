import { isAdminRequest } from "@/lib/auth";
import { chatResponse, json, pickLocale, validateMessages, type ChatBody } from "@/lib/chat";
import { getProfileById } from "@/lib/profiles";

export const maxDuration = 30;

/** Testovací chat z adminu: i neaktivní profily, vždy čerstvá data, NEzapočítává se do statistik. */
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return json(401, "unauthorized");
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return json(400, "invalid_json");
  }
  const profile = typeof body.profile === "string" ? await getProfileById(body.profile, { fresh: true }) : null;
  if (!profile) return json(404, "profile_not_found");
  const valid = validateMessages(body);
  if ("error" in valid) return valid.error;
  return chatResponse({ profile, messages: valid.messages, locale: pickLocale(body.locale), freshKnowledge: true });
}
