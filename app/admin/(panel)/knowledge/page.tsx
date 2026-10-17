import { connection } from "next/server";
import Link from "next/link";
import { count, max } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { knowledge } from "@/lib/db/schema";
import { listProfiles } from "@/lib/profiles";
import { ActiveBadge, DbError, formatDate, NoDb, PageHeader, SourceBadge, Swatch } from "../ui";

export const metadata = { title: "Znalosti" };

export default async function KnowledgeIndex() {
  await connection();
  if (!hasDb()) return <NoDb />;
  let list, rows;
  try {
    [list, rows] = await Promise.all([
      listProfiles({ fresh: true }),
      getDb()
        .select({ profileId: knowledge.profileId, n: count(), last: max(knowledge.updatedAt) })
        .from(knowledge)
        .groupBy(knowledge.profileId),
    ]);
  } catch (e) {
    return <DbError error={e} />;
  }
  const info = new Map(rows.map((r) => [r.profileId, r]));

  return (
    <>
      <PageHeader title="Znalosti" />
      <p className="mb-4 text-sm text-neutral-600">Vyberte profil. Znalosti jsou bloky Markdownu, ze kterých bot odpovídá.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const r = info.get(p.id);
          return (
            <Link
              key={p.id}
              href={p.source === "db" ? `/admin/profiles/${p.id}/knowledge` : `/admin/profiles/${p.id}`}
              className="card flex items-start gap-3 hover:border-neutral-400"
            >
              <Swatch profile={p} />
              <div className="min-w-0">
                <div className="font-medium">{p.companyName}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                  <ActiveBadge active={p.active} />
                  <SourceBadge source={p.source} />
                  {p.source === "db" && (
                    <span>
                      {r?.n ?? 0} bloků{r?.last ? ` · upraveno ${formatDate(r.last)}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
