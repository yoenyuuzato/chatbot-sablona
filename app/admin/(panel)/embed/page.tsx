import { connection } from "next/server";
import Link from "next/link";
import { listProfiles } from "@/lib/profiles";
import { SITE_URL } from "@/lib/site";
import { EmbedCode } from "../embed-code";
import { ActiveBadge, PageHeader, Swatch } from "../ui";

export const metadata = { title: "Embed kód" };

const pill = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm ${active ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"}`;

export default async function EmbedPage({ searchParams }: PageProps<"/admin/embed">) {
  await connection();
  const { profile } = await searchParams;
  const list = await listProfiles({ fresh: true });
  const current = list.find((p) => p.id === profile) ?? list.find((p) => p.active) ?? list[0];

  return (
    <>
      <PageHeader title="Embed kód" />
      {!current ? (
        <p className="text-sm text-neutral-500">Žádné profily.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {list.map((p) => (
              <Link key={p.id} href={`/admin/embed?profile=${p.id}`} className={pill(p.id === current.id)}>
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.theme.primary }} />
                {p.companyName}
              </Link>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="card">
              <EmbedCode base={SITE_URL} id={current.id} />
            </section>
            <aside className="card space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Swatch profile={current} />
                <span className="font-medium">{current.companyName}</span>
                <ActiveBadge active={current.active} />
              </div>
              <p className="text-neutral-600">
                Doména bota: <code className="break-all">{SITE_URL}</code>
              </p>
              <p className="text-neutral-600">
                Povolené domény:{" "}
                {current.allowedOrigins.length ? current.allowedOrigins.map((o) => o.replace(/^https?:\/\//, "")).join(", ") : "všude"}
              </p>
              {!current.active && <p className="text-amber-700">Profil je neaktivní – widget se na webu nezobrazí.</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={`/embed#profile=${current.id}`} target="_blank" rel="noreferrer" className="btn-secondary">
                  Náhled ↗
                </a>
                <Link href={`/admin/profiles/${current.id}`} className="btn-secondary">
                  Upravit profil
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
