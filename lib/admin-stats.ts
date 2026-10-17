import { gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { stats } from "@/lib/db/schema";
import { dayHour, today } from "@/lib/stats";

export type Totals = { conversations: number; messages: number; errors: number; busy: number };

/** Datum (YYYY-MM-DD) před `days` dny podle pásma bota. */
export function daysAgo(days: number): string {
  const d = new Date(`${today()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Součty za posledních `days` dní (včetně dneška) – celkem a po profilech. */
export async function statsSince(days: number): Promise<{ total: Totals; byProfile: Map<string, Totals> }> {
  const rows = await getDb()
    .select({
      profileId: stats.profileId,
      conversations: sql<number>`sum(${stats.conversations})::int`,
      messages: sql<number>`sum(${stats.messages})::int`,
      errors: sql<number>`sum(${stats.errors})::int`,
      busy: sql<number>`sum(${stats.busy})::int`,
    })
    .from(stats)
    .where(gte(stats.day, daysAgo(days - 1)))
    .groupBy(stats.profileId);
  const total: Totals = { conversations: 0, messages: 0, errors: 0, busy: 0 };
  const byProfile = new Map<string, Totals>();
  for (const r of rows) {
    const t = { conversations: r.conversations ?? 0, messages: r.messages ?? 0, errors: r.errors ?? 0, busy: r.busy ?? 0 };
    byProfile.set(r.profileId, t);
    for (const k of Object.keys(total) as (keyof Totals)[]) total[k] += t[k];
  }
  return { total, byProfile };
}

/** Zprávy za posledních 24 h (po hodinách, podle pásma bota) a zprávy celkem. */
export async function messageCounts(): Promise<{ last24h: number; total: number }> {
  const db = getDb();
  const since = dayHour(new Date(Date.now() - 23 * 3600_000)); // aktuální hodina + 23 předchozích
  const [[recent], [all]] = await Promise.all([
    db
      .select({ n: sql<number>`coalesce(sum(${stats.messages}), 0)::int` })
      .from(stats)
      .where(sql`(${stats.day}, ${stats.hour}) >= (${since.day}::date, ${since.hour})`),
    db.select({ n: sql<number>`coalesce(sum(${stats.messages}), 0)::int` }).from(stats),
  ]);
  return { last24h: recent?.n ?? 0, total: all?.n ?? 0 };
}
