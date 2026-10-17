import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { knowledge, knowledgeHistory, type KnowledgeHistoryRow } from "@/lib/db/schema";
import { getProfileById } from "@/lib/profiles";
import { deleteBlockAction, moveBlockAction, restoreVersionAction } from "../../../../actions";
import { ConfirmButton } from "../../../confirm-button";
import { DbError, fmt, formatDate, NoDb, PageHeader, Swatch } from "../../../ui";
import { AddBlockForm, EditBlockForm, ImportFromWeb } from "./forms";

// „Načíst z webu“ stahuje až 10 stránek – server action potřebuje víc času.
export const maxDuration = 60;

const ACTION_LABEL: Record<string, string> = {
  update: "před úpravou",
  delete: "před smazáním",
  restore: "před vrácením verze",
};

function HistoryList({ items }: { items: KnowledgeHistoryRow[] }) {
  return (
    <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
      {items.map((h) => (
        <li key={h.id} className="p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-medium">{h.title}</span>{" "}
              <span className="text-xs text-neutral-500">
                {formatDate(h.createdAt)} · {ACTION_LABEL[h.action] ?? h.action} · {fmt(h.contentMd.length)} znaků
              </span>
            </div>
            <form action={restoreVersionAction}>
              <input type="hidden" name="historyId" value={h.id} />
              <ConfirmButton message="Vrátit blok na tuto verzi? Současný stav se uloží do historie." className="btn-secondary">
                Vrátit verzi
              </ConfirmButton>
            </form>
          </div>
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-neutral-500">Zobrazit obsah</summary>
            <pre className="mt-2 max-h-64 overflow-y-auto rounded bg-neutral-50 p-2 font-mono text-xs whitespace-pre-wrap">
              {h.contentMd}
            </pre>
          </details>
        </li>
      ))}
    </ul>
  );
}

export default async function KnowledgePage({ params }: PageProps<"/admin/profiles/[id]/knowledge">) {
  await connection();
  if (!hasDb()) return <NoDb />;
  const { id } = await params;
  const profile = await getProfileById(id, { fresh: true });
  if (!profile) notFound();
  if (profile.source === "config") {
    return (
      <>
        <PageHeader title={`Znalosti – ${profile.companyName}`} />
        <div className="card text-sm">
          Znalosti tohoto profilu jsou zatím v souborech <code>knowledge/{id}/</code>. Nejdřív{" "}
          <Link href={`/admin/profiles/${id}`} className="underline">
            importujte profil do databáze
          </Link>
          .
        </div>
      </>
    );
  }

  let blocks, history;
  try {
    const db = getDb();
    [blocks, history] = await Promise.all([
      db.select().from(knowledge).where(eq(knowledge.profileId, id)).orderBy(asc(knowledge.sort), asc(knowledge.id)),
      db.select().from(knowledgeHistory).where(eq(knowledgeHistory.profileId, id)).orderBy(desc(knowledgeHistory.createdAt)).limit(300),
    ]);
  } catch (e) {
    return <DbError error={e} />;
  }

  const byBlock = new Map<number, KnowledgeHistoryRow[]>();
  for (const h of history) byBlock.set(h.knowledgeId, [...(byBlock.get(h.knowledgeId) ?? []), h]);
  const liveIds = new Set(blocks.map((b) => b.id));
  // smazané bloky: poslední verze každého ID, které už neexistuje
  const deleted = [...byBlock.entries()].filter(([kid]) => !liveIds.has(kid)).map(([, items]) => items[0]);
  const totalChars = blocks.reduce((n, b) => n + b.contentMd.length, 0);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Swatch profile={profile} /> Znalosti – {profile.companyName}
          </span>
        }
      >
        <Link href={`/admin/profiles/${id}`} className="btn-secondary">
          Nastavení profilu
        </Link>
        <Link href={`/admin/simulate?profile=${id}`} className="btn-secondary">
          Vyzkoušet v simulátoru
        </Link>
      </PageHeader>

      <p className="mb-4 text-sm text-neutral-600">
        Bot odpovídá <strong>jen</strong> z těchto bloků (v tomto pořadí). Celkem {blocks.length} bloků, {fmt(totalChars)} znaků
        {totalChars > 60_000 && <span className="text-amber-700"> – hodně textu, odpovědi budou pomalejší a dražší</span>}.
      </p>

      <div className="space-y-3">
        {blocks.length === 0 && <div className="card text-sm text-neutral-500">Zatím žádné znalosti. Přidejte blok níže nebo načtěte web.</div>}
        {blocks.map((b, i) => {
          const versions = byBlock.get(b.id) ?? [];
          return (
            <details key={b.id} className="card group p-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-6 text-xs text-neutral-400 tabular-nums">{i + 1}.</span>
                <span className="min-w-0 flex-1 font-medium">{b.title}</span>
                <span className="text-xs text-neutral-500">
                  {fmt(b.contentMd.length)} znaků · {formatDate(b.updatedAt)}
                  {versions.length > 0 && ` · ${versions.length} ${versions.length === 1 ? "verze" : versions.length < 5 ? "verze" : "verzí"} v historii`}
                </span>
                <span className="text-neutral-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="space-y-4 border-t border-neutral-100 p-4">
                <div className="flex flex-wrap gap-2">
                  <form action={moveBlockAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button className="btn-secondary" disabled={i === 0} aria-label="Posunout nahoru">
                      ↑ Nahoru
                    </button>
                  </form>
                  <form action={moveBlockAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button className="btn-secondary" disabled={i === blocks.length - 1} aria-label="Posunout dolů">
                      ↓ Dolů
                    </button>
                  </form>
                  <form action={deleteBlockAction} className="ml-auto">
                    <input type="hidden" name="id" value={b.id} />
                    <ConfirmButton message={`Smazat blok „${b.title}“? Půjde obnovit z historie.`}>Smazat</ConfirmButton>
                  </form>
                </div>
                <EditBlockForm key={b.updatedAt.toISOString()} id={b.id} title={b.title} content={b.contentMd} />
                {versions.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Historie verzí</h3>
                    <HistoryList items={versions} />
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Přidat blok</h2>
          <AddBlockForm profileId={id} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Načíst z webu</h2>
          <ImportFromWeb profileId={id} defaultUrl={profile.contact.web} />
        </section>
      </div>

      {deleted.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">Smazané bloky</h2>
          <HistoryList items={deleted} />
        </section>
      )}
    </>
  );
}
