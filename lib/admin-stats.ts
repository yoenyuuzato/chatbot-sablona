import { gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { stats } from "@/lib/db/schema";
import { today } from "@/lib/stats";

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
