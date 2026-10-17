"use client";

import { useEffect, useState } from "react";
import { clientConfig } from "@/client.config";
import type { PublicProfile } from "@/lib/profiles";
import { SITE_URL } from "@/lib/site";

type WidgetApi = { open: () => void; destroy: () => void };
declare global {
  interface Window {
    ChatbotWidget?: WidgetApi;
  }
}

function initialProfile(): string {
  if (typeof window === "undefined") return clientConfig.defaultProfile;
  try {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("profile");
    if (fromHash) return fromHash;
  } catch {}
  return clientConfig.defaultProfile;
}

/** Vloží widget.js s daným profilem (a odstraní předchozí instanci). */
function mountWidget(profileId: string, open: boolean) {
  window.ChatbotWidget?.destroy();
  document.querySelectorAll("script[data-cb-demo]").forEach((s) => s.remove());
  const s = document.createElement("script");
  s.src = `/widget.js?p=${profileId}`;
  s.dataset.profile = profileId;
  s.dataset.cbDemo = "1";
  if (open) s.onload = () => window.ChatbotWidget?.open();
  document.body.appendChild(s);
}

export function Demo() {
  const [list, setList] = useState<PublicProfile[] | null>(null);
  const [wanted, setProfileId] = useState<string>(initialProfile);
  const [switched, setSwitched] = useState(false);

  // aktivní profily z DB (záložně client.config.ts)
  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json() as Promise<PublicProfile[]>)
      .then(setList)
      .catch(() => setList([]));
  }, []);

  const profile = list?.find((p) => p.id === wanted) ?? list?.find((p) => p.id === clientConfig.defaultProfile) ?? list?.[0];
  const profileId = profile?.id;

  useEffect(() => {
    if (!profileId) return;
    mountWidget(profileId, switched);
    try {
      history.replaceState(null, "", `#profile=${profileId}`);
    } catch {}
  }, [profileId, switched]);

  useEffect(() => () => window.ChatbotWidget?.destroy(), []);

  if (!list) return <div style={{ minHeight: "100dvh" }} />;
  if (!profile) return <main className="mx-auto max-w-2xl px-4 py-16 text-[var(--muted)]">Žádný aktivní profil.</main>;

  const snippet = `<script src="${SITE_URL}/widget.js" data-profile="${profile.id}" defer></script>`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium tracking-wide text-[var(--muted)] uppercase">Demo profil</span>
        <div role="tablist" aria-label="Profil chatbota" className="flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
          {list.map((p) => {
            const id = p.id;
            const active = id === profileId;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSwitched(true);
                  setProfileId(id);
                }}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={active ? { background: p.theme.primary, color: p.theme.primaryText } : { color: "#3a3936" }}
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: active ? p.theme.primaryText : p.theme.primary }}
                />
                {p.companyName}
              </button>
            );
          })}
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{profile.companyName}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--muted)]">{profile.companyDescription}</p>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
        Klikni na bublinu vpravo dole a zeptej se. Bot odpovídá jen ze znalostí profilu (správa v{" "}
        <a href="/admin" className="underline">/admin</a>), umí česky i anglicky a má mikrofon i čtení nahlas.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {profile.suggestions.cs.map((q) => (
          <span key={q} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-[#3a3936]">
            „{q}“
          </span>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Vložení na web</h2>
        <p className="mt-2 text-[var(--muted)]">Jeden řádek před koncem <code>&lt;/body&gt;</code>:</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#1b1b1a] p-4 text-sm text-[#f6f5f2]">
          <code>{snippet}</code>
        </pre>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[15px] text-[var(--muted)]">
          <li>
            <code>data-profile</code> – který profil (firma) se načte
          </li>
          <li>
            <code>data-lang=&quot;en&quot;</code> – vynutí jazyk
          </li>
          <li>
            <code>data-position=&quot;left&quot;</code> – bublina vlevo
          </li>
          <li>
            <code>window.ChatbotWidget.open()</code> – otevření chatu z vlastního tlačítka
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Nový zákazník – checklist</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px] text-[var(--muted)]">
          <li>
            <code>/admin</code> → Profily → Nový profil (název, barvy, kontakt, domény)
          </li>
          <li>Znalosti: vložit Markdown nebo „Načíst z webu“</li>
          <li>Vyzkoušet v Simulátoru</li>
          <li>„Kopírovat embed kód“ a vložit na web zákazníka</li>
        </ol>
      </section>
    </main>
  );
}
