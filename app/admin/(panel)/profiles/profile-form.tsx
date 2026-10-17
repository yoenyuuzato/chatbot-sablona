"use client";

import { startTransition, useActionState, useState } from "react";
import { createProfileAction, updateProfileAction } from "../../actions";
import { VOICES } from "@/lib/voices";
import type { ProfileFormValues } from "./profile-values";

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

function ColorField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
        />
        <input name={name} value={value} onChange={(e) => onChange(e.target.value)} className="input font-mono" pattern="#[0-9a-fA-F]{6}" required />
      </div>
    </div>
  );
}

export function ProfileForm({ initial, mode }: { initial: ProfileFormValues; mode: "create" | "edit" }) {
  const [state, action, pending] = useActionState(mode === "create" ? createProfileAction : updateProfileAction, undefined);
  const [primary, setPrimary] = useState(initial.primary);
  const [primaryText, setPrimaryText] = useState(initial.primaryText);
  const [radius, setRadius] = useState(initial.radius);
  const [name, setName] = useState(initial.name);
  const [origins, setOrigins] = useState<string[]>(initial.allowedOrigins.length ? initial.allowedOrigins : [""]);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        // bez automatického resetu formuláře (při chybě validace se nic neztratí)
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {/* --- Základ --- */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Základní údaje</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {mode === "create" ? (
            <Field label="ID profilu (slug)" hint={<>Použije se ve vkládacím kódu: data-profile=&quot;…&quot;. Později nejde změnit.</>}>
              <input name="id" className="input font-mono" required pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?" placeholder="kavarna-u-mostu" defaultValue={initial.id} />
            </Field>
          ) : (
            <Field label="ID profilu" hint="Nejde změnit (je ve vkládacím kódu na webu).">
              <input name="id" className="input bg-neutral-100 font-mono" readOnly value={initial.id} />
            </Field>
          )}
          <Field label="Název firmy">
            <input name="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Kavárna U Mostu" />
          </Field>
          <Field label="Jméno asistenta">
            <input name="botName" className="input" defaultValue={initial.botName} />
          </Field>
          <Field label="Tón komunikace" hint="např. přátelský, stručný, vyká zákazníkům">
            <input name="tone" className="input" defaultValue={initial.tone} />
          </Field>
        </div>
        <Field label="Krátký popis firmy" hint="1–2 věty, bot se podle toho představuje.">
          <textarea name="description" className="input" rows={2} defaultValue={initial.description} />
        </Field>
        <Field
          label="Pokyny pro AI (system prompt profilu)"
          hint="Volitelné. Přidá se k základním pravidlům šablony (odpovídat jen ze znalostí, jazyk uživatele, čas Europe/Prague). Např. „Vždy nabídni rezervaci přes web.“"
        >
          <textarea name="systemPrompt" className="input font-mono text-xs" rows={5} defaultValue={initial.systemPrompt} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={initial.active} className="h-4 w-4" />
          Aktivní (neaktivní profil = widget se na webu nezobrazí)
        </label>
      </section>

      {/* --- Texty --- */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Uvítání a navrhované otázky</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Uvítací zpráva – čeština">
            <textarea name="welcome_cs" className="input" rows={3} defaultValue={initial.welcome.cs} />
          </Field>
          <Field label="Uvítací zpráva – angličtina">
            <textarea name="welcome_en" className="input" rows={3} defaultValue={initial.welcome.en} />
          </Field>
          <Field label="Navrhované otázky – čeština" hint="Jedna otázka na řádek, max. 6.">
            <textarea name="suggestions_cs" className="input" rows={4} defaultValue={initial.suggestions.cs.join("\n")} />
          </Field>
          <Field label="Navrhované otázky – angličtina" hint="Jedna otázka na řádek, max. 6.">
            <textarea name="suggestions_en" className="input" rows={4} defaultValue={initial.suggestions.en.join("\n")} />
          </Field>
        </div>
      </section>

      {/* --- Vzhled --- */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Vzhled a hlas</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <ColorField name="primary" label="Hlavní barva" value={primary} onChange={setPrimary} />
          <ColorField name="primaryText" label="Text na hlavní barvě" value={primaryText} onChange={setPrimaryText} />
          <Field label={`Zaoblení: ${radius} px`}>
            <input name="radius" type="range" min={0} max={40} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full md:w-40" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-md bg-neutral-50 p-3">
          <span className="text-xs text-neutral-500">Náhled:</span>
          <span className="grid h-12 w-12 place-items-center rounded-full shadow" style={{ background: primary, color: primaryText }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
            </svg>
          </span>
          <span className="px-3 py-2 text-sm" style={{ background: primary, color: primaryText, borderRadius: radius }}>
            {name || "Název firmy"}
          </span>
          <span className="px-3 py-2 text-sm" style={{ background: primary, color: primaryText, borderRadius: radius, borderBottomRightRadius: 6 }}>
            Zpráva uživatele
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Logo (volitelné)" hint="URL obrázku nebo cesta v /public. Prázdné = první písmeno názvu.">
            <input name="logo" className="input" defaultValue={initial.logo} placeholder="https://…/logo.png" />
          </Field>
          <Field label="Hlas pro čtení nahlas (Gemini TTS)">
            <select name="voice" className="input" defaultValue={initial.voice}>
              <option value="">Výchozí (podle client.config.ts)</option>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* --- Kontakt a domény --- */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Kontakt a domény</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Telefon" hint="Bot ho nabídne, když nezná odpověď.">
            <input name="phone" className="input" defaultValue={initial.contact.phone} placeholder="+420 123 456 789" />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" className="input" defaultValue={initial.contact.email} />
          </Field>
          <Field label="Web">
            <input name="web" type="url" className="input" defaultValue={initial.contact.web} placeholder="https://www.example.cz" />
          </Field>
        </div>
        <div>
          <span className="label">Povolené domény (kde smí widget běžet)</span>
          <div className="space-y-2">
            {origins.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  name="origin"
                  className="input font-mono"
                  value={o}
                  aria-label={`Doména ${i + 1}`}
                  placeholder="https://www.example.cz"
                  onChange={(e) => setOrigins(origins.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label="Odebrat doménu"
                  onClick={() => setOrigins(origins.length > 1 ? origins.filter((_, j) => j !== i) : [""])}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-secondary mt-2" onClick={() => setOrigins([...origins, ""])}>
            + Přidat doménu
          </button>
          <p className="hint">
            Zadejte s www i bez (https://example.cz a https://www.example.cz). Localhost a doména bota jsou povolené vždy.{" "}
            {origins.every((o) => !o.trim()) && (
              <span className="font-medium text-amber-700">Prázdný seznam = widget půjde vložit na jakýkoli web.</span>
            )}
          </p>
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button className="btn" disabled={pending}>
          {pending ? "Ukládám…" : mode === "create" ? "Vytvořit profil" : "Uložit změny"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      </div>
    </form>
  );
}
