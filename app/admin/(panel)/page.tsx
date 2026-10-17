import { connection } from "next/server";
import Link from "next/link";
import { statsSince, type Totals } from "@/lib/admin-stats";
import { hasDb } from "@/lib/db";
import { listProfiles } from "@/lib/profiles";
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
    const [list, s7, s30] = await Promise.all([listProfiles({ fresh: true }), statsSince(7), statsSince(30)]);
    data = { list, s7, s30 };
  } catch (e) {
    return (
      <>
        <PageHeader title="Přehled" />
        <DbError error={e} />
      </>
    );
  }
  const { list, s7, s30 } = data;
  const active = list.filter((p) => p.active).length;

  const tiles = [
    { label: "Profily", value: fmt(list.length), sub: `${active} aktivních`, href: "/admin/profiles" },
    { label: "Konverzace", value: fmt(s7.total.conversations), sub: `7 dní · 30 dní: ${fmt(s30.total.conversations)}` },
    { label: "Zprávy", value: fmt(s7.total.messages), sub: `7 dní · 30 dní: ${fmt(s30.total.messages)}` },
    {
      label: "„Vytížený“",
      value: fmt(s7.total.busy),
      sub: `7 dní · 30 dní: ${fmt(s30.total.busy)} · jiné chyby ${fmt(s30.total.errors)}`,
      warn: s7.total.busy > 0,
    },
  ];

  const empty: Totals = { conversations: 0, messages: 0, errors: 0, busy: 0 };

  return (
    <>
      <PageHeader title="Přehled">
        <Link href="/admin/profiles/new" className="btn">
          Nový profil
        </Link>
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <div className="text-sm text-neutral-500">{t.label}</div>
              <div className={`mt-1 text-2xl font-semibold ${t.warn ? "text-amber-700" : ""}`}>{t.value}</div>
              <div className="hint">{t.sub}</div>
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
      <p className="hint mt-2">
        Počítají se jen čísla (konverzace = první zpráva v chatu). Obsah konverzací se nikde neukládá. Simulátor se do statistik
        nepočítá.
      </p>
    </>
  );
}
