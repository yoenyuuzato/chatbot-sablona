import type { ChatProfile } from "@/lib/profiles";

export function PageHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Prague" }).format(new Date(d));
}

export const fmt = (n: number) => n.toLocaleString("cs-CZ");

export function DbError({ error }: { error?: unknown }) {
  return (
    <div className="card border-red-200 bg-red-50 text-sm text-red-800">
      <p className="font-medium">Nepodařilo se načíst data z databáze.</p>
      {error !== undefined && (
        <p className="mt-1 font-mono text-xs break-all">{error instanceof Error ? error.message : String(error)}</p>
      )}
      <p className="mt-2">
        Zkontrolujte <code>DATABASE_URL</code> a spusťte migrace (<code>npm run db:migrate</code>), případně import
        profilů (<code>npm run import-profiles</code>).
      </p>
    </div>
  );
}

export function NoDb() {
  return (
    <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
      <p className="font-medium">Databáze není nastavená.</p>
      <p className="mt-1">
        Bez <code>DATABASE_URL</code> se profily čtou jen z <code>client.config.ts</code> a <code>knowledge/</code> a v adminu je
        nejde upravovat. Přidejte Neon Postgres (Vercel → Storage / Marketplace → Neon) a spusťte{" "}
        <code>npm run import-profiles</code>.
      </p>
    </div>
  );
}

export function Swatch({ profile }: { profile: Pick<ChatProfile, "theme" | "companyName"> }) {
  return (
    <span
      aria-hidden
      className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
      style={{ background: profile.theme.primary, color: profile.theme.primaryText }}
    >
      {profile.companyName.charAt(0)}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">aktivní</span>
  ) : (
    <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">neaktivní</span>
  );
}

export function SourceBadge({ source }: { source: ChatProfile["source"] }) {
  return source === "config" ? (
    <span
      className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
      title="Profil je zatím jen v client.config.ts – pro úpravy ho importujte do databáze."
    >
      client.config.ts
    </span>
  ) : null;
}
