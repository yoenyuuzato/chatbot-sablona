import type { Locale } from "@/client.config";

const cs = {
  openChat: "Otevřít chat",
  closeChat: "Zavřít chat",
  online: "Online · odpovídá ihned",
  placeholder: "Napište zprávu…",
  send: "Odeslat",
  typing: "Píše…",
  error: "Něco se pokazilo. Zkuste to prosím znovu.",
  rateLimited: "Posíláte zprávy příliš rychle. Chvilku počkejte.",
  tooLong: "Zpráva je příliš dlouhá.",
  retry: "Zkusit znovu",
  newChat: "Nová konverzace",
  privacy: "Odpovědi generuje AI a mohou obsahovat chyby. Konverzace se neukládají.",
  poweredBy: "AI asistent",
};

const en: typeof cs = {
  openChat: "Open chat",
  closeChat: "Close chat",
  online: "Online · replies instantly",
  placeholder: "Type a message…",
  send: "Send",
  typing: "Typing…",
  error: "Something went wrong. Please try again.",
  rateLimited: "You're sending messages too fast. Please wait a moment.",
  tooLong: "The message is too long.",
  retry: "Try again",
  newChat: "New conversation",
  privacy: "Replies are AI-generated and may contain mistakes. Conversations are not stored.",
  poweredBy: "AI assistant",
};

export const dictionaries: Record<Locale, typeof cs> = { cs, en };
export type Dictionary = typeof cs;
