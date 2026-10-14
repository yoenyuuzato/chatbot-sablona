import type { Locale } from "@/client.config";

const cs = {
  openChat: "Otevřít chat",
  closeChat: "Zavřít chat",
  online: "Online",
  placeholder: "Napište zprávu…",
  send: "Odeslat",
  typing: "Píše…",
  error: "Něco se pokazilo. Zkuste to prosím znovu.",
  rateLimited: "Posíláte zprávy příliš rychle. Chvilku počkejte.",
  tooLong: "Zpráva je příliš dlouhá.",
  busy: "Asistent je teď vytížený. Zkuste to prosím za chvilku.",
  retry: "Zkusit znovu",
  newChat: "Nová konverzace",
  privacy: "Odpovědi generuje AI a mohou obsahovat chyby. Konverzace se neukládají.",
  poweredBy: "AI asistent",
  speak: "Mluvit (mikrofon)",
  stopListening: "Ukončit nahrávání",
  listening: "Poslouchám… mluvte",
  readAloudOn: "Číst odpovědi nahlas",
  readAloudOff: "Nečíst odpovědi nahlas",
  readThis: "Přečíst nahlas",
  stopReading: "Zastavit čtení",
};

const en: typeof cs = {
  openChat: "Open chat",
  closeChat: "Close chat",
  online: "Online",
  placeholder: "Type a message…",
  send: "Send",
  typing: "Typing…",
  error: "Something went wrong. Please try again.",
  rateLimited: "You're sending messages too fast. Please wait a moment.",
  tooLong: "The message is too long.",
  busy: "The assistant is busy right now. Please try again in a moment.",
  retry: "Try again",
  newChat: "New conversation",
  privacy: "Replies are AI-generated and may contain mistakes. Conversations are not stored.",
  poweredBy: "AI assistant",
  speak: "Speak (microphone)",
  stopListening: "Stop recording",
  listening: "Listening… go ahead",
  readAloudOn: "Read replies aloud",
  readAloudOff: "Stop reading replies aloud",
  readThis: "Read aloud",
  stopReading: "Stop reading",
};

export const dictionaries: Record<Locale, typeof cs> = { cs, en };
export type Dictionary = typeof cs;
