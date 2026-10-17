import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { clientConfig } from "@/client.config";
import { getDb } from "@/lib/db";
import { knowledge, profiles } from "@/lib/db/schema";

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Naimportuje jeden profil z client.config.ts + knowledge/<id>/*.md do DB.
 * Idempotentní: existující profil a bloky (podle názvu souboru) přeskočí, s `force` je přepíše.
 */
export async function importConfigProfile(id: string, opts: { force?: boolean; log?: (line: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  if (!Object.prototype.hasOwnProperty.call(clientConfig.profiles, id)) throw new Error(`Profil ${id} není v client.config.ts`);
  const p = clientConfig.profiles[id as keyof typeof clientConfig.profiles];
  const db = getDb();

  // domény v configu jsou společné – profilu přiřadíme ty, které odpovídají jeho webu
  const host = hostOf(p.contact.web);
  const own = clientConfig.allowedOrigins.filter((o) => host && hostOf(o) === host);
  const values = {
    id,
    name: p.companyName,
    botName: p.botName,
    description: p.companyDescription,
    tone: p.tone,
    systemPrompt: "",
    welcome: p.welcome,
    suggestedQuestions: p.suggestions,
    colors: { ...p.theme },
    contact: { ...p.contact },
    logo: p.logo,
    voice: p.voice ?? "",
    allowedOrigins: own.length ? own : clientConfig.allowedOrigins,
    active: true,
  };
  const inserted = await db.insert(profiles).values(values).onConflictDoNothing().returning({ id: profiles.id });
  if (inserted.length) log(`+ profil ${id}`);
  else if (opts.force) {
    await db.update(profiles).set({ ...values, updatedAt: new Date() }).where(eq(profiles.id, id));
    log(`↻ profil ${id} (přepsán)`);
  } else log(`= profil ${id} už existuje`);

  const dir = path.join(process.cwd(), "knowledge", id);
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  } catch {}
  for (const [i, f] of files.entries()) {
    const title = f.replace(/\.md$/, "");
    const contentMd = (await readFile(path.join(dir, f), "utf8")).trim();
    const [existing] = await db
      .select({ id: knowledge.id })
      .from(knowledge)
      .where(and(eq(knowledge.profileId, id), eq(knowledge.title, title)))
      .limit(1);
    if (!existing) {
      await db.insert(knowledge).values({ profileId: id, title, contentMd, sort: (i + 1) * 10 });
      log(`  + znalost ${title}`);
    } else if (opts.force) {
      await db
        .update(knowledge)
        .set({ contentMd, sort: (i + 1) * 10, updatedAt: sql`now()` })
        .where(eq(knowledge.id, existing.id));
      log(`  ↻ znalost ${title}`);
    } else log(`  = znalost ${title} už existuje`);
  }
}
