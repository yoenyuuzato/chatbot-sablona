import { connection } from "next/server";
import Link from "next/link";
import { count } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { knowledge } from "@/lib/db/schema";
import { listProfiles } from "@/lib/profiles";
import { importConfigProfileAction, toggleProfileAction } from "../../actions";
import { ActiveBadge, DbError, NoDb, PageHeader, SourceBadge, Swatch } from "../ui";

export default async function ProfilesPage() {
  await connection();
  if (!hasDb()) {
    return (
      <>
        <PageHeader title="Profily" />
        <NoDb />
      </>
    );
  }
  let list, counts;
  try {
    const [l, c] = await Promise.all([
      listProfiles({ fresh: true }),
      getDb().select({ profileId: knowledge.profileId, n: count() }).from(knowledge).groupBy(knowledge.profileId),
    ]);
    list = l;
    counts = new Map(c.map((r) => [r.profileId, r.n]));
  } catch (e) {
    return (
      <>
        <PageHeader title="Profily" />
        <DbError error={e} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Profily">
        <Link href="/admin/profiles/new" className="btn">
          Nový profil
        </Link>
      </PageHeader>
      <div className="card overflow-x-auto p-0">
        {list.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">Zatím žádné profily.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Profil</th>
                <th>ID</th>
                <th>Znalosti</th>
                <th>Domény</th>
                <th>Stav</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Swatch profile={p} />
                      <div>
                        <Link href={`/admin/profiles/${p.id}`} className="font-medium hover:underline">
                          {p.companyName}
                        </Link>
                        <div className="text-xs text-neutral-500">{p.companyDescription.slice(0, 80)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">
                    {p.id} <SourceBadge source={p.source} />
                  </td>
                  <td>
                    {p.source === "db" ? (
                      <Link href={`/admin/profiles/${p.id}/knowledge`} className="hover:underline">
                        {counts.get(p.id) ?? 0} bloků
                      </Link>
                    ) : (
                      <span className="text-neutral-500">soubory</span>
                    )}
                  </td>
                  <td className="text-xs text-neutral-600">
                    {p.allowedOrigins.length ? (
                      p.allowedOrigins.map((o) => <div key={o}>{o.replace(/^https?:\/\//, "")}</div>)
                    ) : (
                      <span className="text-amber-700">všude</span>
                    )}
                  </td>
                  <td>
                    {p.source === "db" ? (
                      <form action={toggleProfileAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={String(p.active)} />
                        <button className="btn-secondary" title={p.active ? "Kliknutím deaktivovat" : "Kliknutím aktivovat"}>
                          <ActiveBadge active={p.active} />
                        </button>
                      </form>
                    ) : (
                      <ActiveBadge active />
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {p.source === "db" ? (
                      <Link href={`/admin/profiles/${p.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                        Upravit
                      </Link>
                    ) : (
                      <form action={importConfigProfileAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="btn-secondary">Importovat do DB</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
