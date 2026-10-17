import { connection } from "next/server";
import Link from "next/link";
import { messageCounts, statsSince, type Totals } from "@/lib/admin-stats";
import { hasDb } from "@/lib/db";
import { listProfiles } from "@/lib/profiles";
import { SITE_URL } from "@/lib/site";
import { ActiveBadge, DbError, fmt, NoDb, PageHeader, Swatch } from "./ui";

export default async function Dashboard() {
  await connection();
  if (!hasDb()) {
    return (
      <>
        <PageHeader title="Přehled" />
        <NoDb />
      </>
    );
  }

  let data;
  try {
    const [list, s30, msgs] = await Promise.all([listProfiles({ fresh: true }), statsSince(30), messageCounts()]);
    data = { list, s30, msgs };
  } catch (e) {
    return (
      <>
        <PageHeader title="Přehled" />
        <DbError error={e} />
      </>
    );
  }
  const { list, s30, msgs } = data;

  const tiles = [
    { label: "Profily", value: list.length, href: "/admin/profiles" },
    { label: "Aktivní profily", value: list.filter((p) => p.active).length, href: "/admin/profiles" },
    { label: "Zprávy za 24 h", value: msgs.last24h },
    { label: "Zprávy celkem", value: msgs.total },
  ];

  const empty: Totals = { conversations: 0, messages: 0, errors: 0, busy: 0 };

  return (
    <>
      <PageHeader title="Přehled" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <div className="text-sm text-neutral-500">{t.label}</div>
              <div className="mt-1 text-2xl font-semibold">{fmt(t.value)}</div>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="card hover:border-neutral-400">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="card">
              {body}
            </div>
          );
        })}
      </div>
      <div className="card mt-6 space-y-2 text-sm text-neutral-600">
        <p>
          Widget se vkládá jedním řádkem z domény <code className="font-mono">{SITE_URL}</code> – kód pro každý profil najdete v
          záložce{" "}
          <Link href="/admin/embed" className="underline">
            Embed kód
          </Link>
          . Odpovědi otestujete v{" "}
          <Link href="/admin/simulate" className="underline">
            simulátoru
          </Link>
          , veřejné demo s přepínačem profilů je na{" "}
          <a href="/demo" target="_blank" rel="noreferrer" className="underline">
            /demo
          </a>
          .
        </p>
        <p>
          Statistiky obsahují jen počty zpráv a konverzací, obsah konverzací se nikde neukládá. Simulátor se nezapočítává.
        </p>
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold">Za posledních 30 dní podle profilu</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Profil</th>
              <th>Stav</th>
              <th className="text-right">Konverzace</th>
              <th className="text-right">Zprávy</th>
              <th className="text-right">Vytížený</th>
              <th className="text-right">Chyby</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const t = s30.byProfile.get(p.id) ?? empty;
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/profiles/${p.id}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                      <Swatch profile={p} />
                      {p.companyName}
                    </Link>
                  </td>
                  <td>
                    <ActiveBadge active={p.active} />
                  </td>
                  <td className="text-right tabular-nums">{fmt(t.conversations)}</td>
                  <td className="text-right tabular-nums">{fmt(t.messages)}</td>
                  <td className={`text-right tabular-nums ${t.busy ? "text-amber-700" : ""}`}>{fmt(t.busy)}</td>
                  <td className={`text-right tabular-nums ${t.errors ? "text-red-700" : ""}`}>{fmt(t.errors)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint mt-2">Konverzace = první zpráva v chatu. „Vytížený“ = limit nebo přetížení AI.</p>
    </>
  );
}
