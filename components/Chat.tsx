"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { clientConfig, getProfile, resolveProfileId, type Locale, type ProfileId } from "@/client.config";
import { dictionaries } from "@/locales";
import { Markdown } from "./Markdown";
import { useVoice } from "./useVoice";

function detectProfile(): ProfileId {
  try {
    return resolveProfileId(new URLSearchParams(window.location.hash.slice(1)).get("profile"));
  } catch {
    return clientConfig.defaultProfile;
  }
}

const storageKey = (profileId: ProfileId) => `chatbot:messages:${profileId}`;

function detectLocale(): Locale {
  const supported = clientConfig.locales;
  try {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("lang");
    if (fromHash && supported.includes(fromHash as Locale)) return fromHash as Locale;
    const saved = sessionStorage.getItem("chatbot:lang");
    if (saved && supported.includes(saved as Locale)) return saved as Locale;
  } catch {}
  const nav = (navigator.language || "").slice(0, 2) as Locale;
  return supported.includes(nav) ? nav : supported[0];
}

function loadMessages(profileId: ProfileId): UIMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(profileId));
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function Chat({ embedded = false }: { embedded?: boolean }) {
  const [profileId] = useState<ProfileId>(detectProfile);
  const profile = getProfile(profileId);
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const [initialMessages] = useState<UIMessage[]>(() => loadMessages(profileId));
  const t = dictionaries[locale];
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, setMessages, regenerate, clearError } = useChat({ transport, messages: initialMessages });

  // uložení historie v rámci záložky (přežije přechod mezi stránkami webu)
  useEffect(() => {
    if (status === "streaming") return;
    try {
      sessionStorage.setItem(storageKey(profileId), JSON.stringify(messages));
    } catch {}
  }, [messages, status, profileId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const tooLong = input.length > clientConfig.ai.maxMessageLength;

  // ---- hlas ----
  const [readAloud, setReadAloud] = useState(false);
  const readAloudRef = useRef(readAloud);
  useEffect(() => {
    readAloudRef.current = readAloud;
  }, [readAloud]);

  function send(text: string, viaVoice = false) {
      const value = text.trim();
      if (!value || busy || value.length > clientConfig.ai.maxMessageLength) return;
      if (error) clearError();
      if (viaVoice && clientConfig.voice.autoReadVoiceReplies) setReadAloud(true);
      sendMessage({ text: value }, { body: { locale, profile: profileId } });
      setInput("");
      if (!viaVoice) requestAnimationFrame(() => inputRef.current?.focus());
  }

  const voice = useVoice(locale, (text) => send(text, true));
  const voiceEnabled = clientConfig.voice.enabled;

  // po dokončení odpovědi ji případně přečti nahlas
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === "streaming" && status === "ready" && readAloudRef.current) {
      const last = messages.at(-1);
      if (last?.role === "assistant") voice.speak(textOf(last));
    }
    prevStatus.current = status;
  }, [status, messages, voice]);

  function changeLocale(l: Locale) {
    setLocale(l);
    try {
      sessionStorage.setItem("chatbot:lang", l);
    } catch {}
  }

  function reset() {
    voice.stopSpeaking();
    setMessages([]);
    clearError();
    try {
      sessionStorage.removeItem(storageKey(profileId));
    } catch {}
  }

  function close() {
    window.parent?.postMessage({ type: "chatbot:close" }, "*");
  }

  const errorText = error
    ? /rate_limited|429/.test(error.message)
      ? t.rateLimited
      : /too_long|413/.test(error.message)
        ? t.tooLong
        : /busy/.test(error.message)
          ? t.busy
          : t.error
    : null;

  const lastIsUser = messages.at(-1)?.role === "user";
  const style = {
    "--cb-primary": profile.theme.primary,
    "--cb-primary-text": profile.theme.primaryText,
    "--cb-radius": `${profile.theme.radius}px`,
  } as CSSProperties;

  return (
    <div className={`cb ${embedded ? "cb--embedded" : ""}`} style={style} lang={locale}>
      <header className="cb-header">
        <div className="cb-avatar" aria-hidden>
          {profile.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo} alt="" />
          ) : (
            profile.companyName.charAt(0)
          )}
        </div>
        <div className="cb-title">
          <strong>{profile.companyName}</strong>
          <span>
            <i className="cb-dot" /> {t.online}
          </span>
        </div>
        <div className="cb-actions">
          {clientConfig.locales.length > 1 && (
            <button
              type="button"
              className="cb-icon-btn cb-lang"
              onClick={() => {
                const i = clientConfig.locales.indexOf(locale);
                changeLocale(clientConfig.locales[(i + 1) % clientConfig.locales.length]);
              }}
              aria-label="Language"
            >
              {locale.toUpperCase()}
            </button>
          )}
          {voiceEnabled && voice.canSpeak && (
            <button
              type="button"
              className={`cb-icon-btn ${readAloud ? "cb-icon-btn--on" : ""}`}
              onClick={() => {
                if (readAloud) voice.stopSpeaking();
                setReadAloud(!readAloud);
              }}
              aria-pressed={readAloud}
              aria-label={readAloud ? t.readAloudOff : t.readAloudOn}
              title={readAloud ? t.readAloudOff : t.readAloudOn}
            >
              {readAloud ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M19 5a10 10 0 0 1 0 14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                  <path d="m22 9-6 6M16 9l6 6" />
                </svg>
              )}
            </button>
          )}
          {messages.length > 0 && (
            <button type="button" className="cb-icon-btn" onClick={reset} aria-label={t.newChat} title={t.newChat}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
          {embedded && (
            <button type="button" className="cb-icon-btn" onClick={close} aria-label={t.closeChat} title={t.closeChat}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="cb-messages" ref={listRef} aria-live="polite">
        <div className="cb-msg cb-msg--bot">
          <div className="cb-bubble">
            <Markdown text={profile.welcome[locale]} />
          </div>
        </div>

        {messages.length === 0 && (
          <div className="cb-suggestions">
            {profile.suggestions[locale].map((s) => (
              <button key={s} type="button" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => {
          const text = textOf(m);
          if (!text) return null;
          return (
            <div key={m.id} className={`cb-msg ${m.role === "user" ? "cb-msg--user" : "cb-msg--bot"}`}>
              <div className="cb-bubble">{m.role === "user" ? text : <Markdown text={text} />}</div>
              {m.role === "assistant" && voiceEnabled && voice.canSpeak && !(busy && m.id === messages.at(-1)?.id) && (
                <button
                  type="button"
                  className="cb-play"
                  onClick={() => (voice.speaking ? voice.stopSpeaking() : voice.speak(text))}
                  aria-label={voice.speaking ? t.stopReading : t.readThis}
                  title={voice.speaking ? t.stopReading : t.readThis}
                >
                  {voice.speaking ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {(status === "submitted" || (status === "streaming" && lastIsUser)) && (
          <div className="cb-msg cb-msg--bot">
            <div className="cb-bubble cb-typing" aria-label={t.typing}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {errorText && (
          <div className="cb-error" role="alert">
            {errorText}{" "}
            <button type="button" onClick={() => regenerate()}>
              {t.retry}
            </button>
          </div>
        )}
      </div>

      <form
        className="cb-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={voice.listening ? voice.interim : input}
          readOnly={voice.listening}
          maxLength={clientConfig.ai.maxMessageLength + 50}
          placeholder={voice.listening ? t.listening : t.placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          aria-label={t.placeholder}
        />
        {voiceEnabled && voice.canListen && (
          <button
            type="button"
            className={`cb-mic ${voice.listening ? "cb-mic--on" : ""}`}
            onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())}
            disabled={busy}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? t.stopListening : t.speak}
            title={voice.listening ? t.stopListening : t.speak}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <path d="M12 17v4" />
            </svg>
          </button>
        )}
        <button type="submit" disabled={busy || !input.trim() || tooLong || voice.listening} aria-label={t.send}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </form>
      <p className="cb-privacy">{t.privacy}</p>
    </div>
  );
}
