import { sql } from "drizzle-orm";
import { clientConfig } from "@/client.config";
import { getDb, hasDb } from "@/lib/db";
import { stats } from "@/lib/db/schema";

type Delta = Partial<Record<"conversations" | "messages" | "errors" | "busy", number>>;

/** Dnešní datum v časovém pásmu bota (YYYY-MM-DD). */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: clientConfig.timezone }).format(new Date());
}

/** Přičte denní počty. Ukládají se JEN čísla, nikdy obsah zpráv. Chyby jen zaloguje. */
export async function recordStats(profileId: string, delta: Delta): Promise<void> {
  if (!hasDb()) return;
  const v = { conversations: 0, messages: 0, errors: 0, busy: 0, ...delta };
  try {
    await getDb()
      .insert(stats)
      .values({ profileId, day: today(), ...v })
      .onConflictDoUpdate({
        target: [stats.profileId, stats.day],
        set: {
          conversations: sql`${stats.conversations} + ${v.conversations}`,
          messages: sql`${stats.messages} + ${v.messages}`,
          errors: sql`${stats.errors} + ${v.errors}`,
          busy: sql`${stats.busy} + ${v.busy}`,
        },
      });
  } catch (e) {
    console.warn("[stats] nepodařilo se uložit:", (e as Error)?.message);
  }
}
