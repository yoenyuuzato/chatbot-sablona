"use client";

import { useEffect, useState } from "react";
import { clientConfig, resolveProfileId, type ProfileId } from "@/client.config";

type WidgetApi = { open: () => void; destroy: () => void };
declare global {
  interface Window {
    ChatbotWidget?: WidgetApi;
  }
}

const ids = Object.keys(clientConfig.profiles) as ProfileId[];

function initialProfile(): ProfileId {
  if (typeof window === "undefined") return clientConfig.defaultProfile;
  try {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("profile");
    if (fromHash) return resolveProfileId(fromHash);
  } catch {}
  return clientConfig.defaultProfile;
}

/** Vloží widget.js s daným profilem (a odstraní předchozí instanci). */
function mountWidget(profileId: ProfileId, open: boolean) {
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
  const [profileId, setProfileId] = useState<ProfileId>(initialProfile);
  const profile = clientConfig.profiles[profileId];
  const [switched, setSwitched] = useState(false);

  useEffect(() => {
    mountWidget(profileId, switched);
    try {
      history.replaceState(null, "", `#profile=${profileId}`);
    } catch {}
  }, [profileId, switched]);

  useEffect(() => () => window.ChatbotWidget?.destroy(), []);

  const snippet = `<script src="https://chatbot-sablona.vercel.app/widget.js" data-profile="${profileId}" defer></script>`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium tracking-wide text-[var(--muted)] uppercase">Demo profil</span>
        <div role="tablist" aria-label="Profil chatbota" className="flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
          {ids.map((id) => {
            const p = clientConfig.profiles[id];
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
        Klikni na bublinu vpravo dole a zeptej se. Bot odpovídá jen z podkladů ve složce{" "}
        <code>/knowledge/{profileId}</code>, umí česky i anglicky a má mikrofon i čtení nahlas.
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
          <li>„Use this template“ na GitHubu → nové repo</li>
          <li>
            V <code>client.config.ts</code> přidat/upravit profil (název, barvy, kontakt, domény)
          </li>
          <li>
            Podklady do <code>/knowledge/&lt;id-profilu&gt;</code>
          </li>
          <li>Import na Vercel + API klíč</li>
          <li>Vložit skript na web zákazníka</li>
        </ol>
      </section>
    </main>
  );
}
