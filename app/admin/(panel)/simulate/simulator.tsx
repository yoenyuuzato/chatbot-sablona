"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { clientConfig, type Locale } from "@/client.config";
import type { PublicProfile } from "@/lib/profiles";
import { Markdown } from "@/components/Markdown";

type Option = PublicProfile & { active: boolean };

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function Simulator({ profiles, initial }: { profiles: Option[]; initial: string }) {
  const [profileId, setProfileId] = useState(initial);
  const [locale, setLocale] = useState<Locale>(clientConfig.locales[0]);
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="card space-y-4">
        <label className="block">
          <span className="label">Profil</span>
          <select className="input" value={profile.id} onChange={(e) => setProfileId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName}
                {p.active ? "" : " (neaktivní)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Jazyk rozhraní</span>
          <select className="input" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            {clientConfig.locales.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Změna profilu nebo jazyka začne novou konverzaci.</p>
      </div>
      <SimChat key={`${profile.id}:${locale}`} profile={profile} locale={locale} />
    </div>
  );
}

function SimChat({ profile, locale }: { profile: Option; locale: Locale }) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/admin/simulate" }), []);
  const { messages, sendMessage, status, error, setMessages, clearError } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    if (error) clearError();
    sendMessage({ text: value }, { body: { profile: profile.id, locale } });
    setInput("");
  }

  const { primary, primaryText, radius } = profile.theme;

  return (
    <div className="card flex h-[70vh] min-h-[420px] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: primary, color: primaryText }}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 font-bold">{profile.companyName.charAt(0)}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{profile.companyName}</div>
          <div className="text-xs opacity-80">Simulátor{profile.active ? "" : " · profil je neaktivní"}</div>
        </div>
        {messages.length > 0 && (
          <button type="button" className="rounded px-2 py-1 text-sm hover:bg-white/15" onClick={() => setMessages([])}>
            Nová konverzace
          </button>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-[15px] leading-relaxed">
        <div className="sim-bot max-w-[85%] bg-neutral-100 px-3.5 py-2.5" style={{ borderRadius: radius }}>
          <Markdown text={profile.welcome[locale] ?? ""} />
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {(profile.suggestions[locale] ?? []).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border px-3 py-1.5 text-sm"
                style={{ borderColor: primary, color: primary }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => {
          const text = textOf(m);
          if (!text) return null;
          return m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] px-3.5 py-2.5 whitespace-pre-wrap" style={{ background: primary, color: primaryText, borderRadius: radius }}>
                {text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="sim-bot max-w-[85%] bg-neutral-100 px-3.5 py-2.5" style={{ borderRadius: radius }}>
              <Markdown text={text} />
            </div>
          );
        })}
        {status === "submitted" && <div className="text-sm text-neutral-400">Píše…</div>}
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Chyba: {/busy/.test(error.message) ? "AI je vytížená (limit / přetížení)." : error.message || "něco se pokazilo"}
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-neutral-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={clientConfig.ai.maxMessageLength}
          placeholder="Napište testovací dotaz…"
          aria-label="Zpráva"
          autoFocus
        />
        <button className="btn" disabled={busy || !input.trim()}>
          Odeslat
        </button>
      </form>
    </div>
  );
}
