import { asc, eq } from "drizzle-orm";
import { clientConfig, type Locale, type Profile } from "@/client.config";
import { getDb, hasDb } from "@/lib/db";
import { knowledge, profiles, type ProfileRow } from "@/lib/db/schema";
import { loadKnowledgeFiles } from "@/lib/knowledge";

/** Profil tak, jak ho používá chat – stejný tvar z DB i z client.config.ts. */
export type ChatProfile = Profile & {
  id: string;
  /** Doplňující pokyny pro AI (jen profily z DB) */
  systemPrompt: string;
  /** Domény, kde smí widget běžet. Prázdné = všude. */
  allowedOrigins: string[];
  active: boolean;
  source: "db" | "config";
};

/** Co smí vidět prohlížeč (widget, demo). */
export type PublicProfile = Pick<
  ChatProfile,
  "id" | "companyName" | "botName" | "companyDescription" | "theme" | "logo" | "suggestions" | "welcome"
>;

export function toPublic(p: ChatProfile): PublicProfile {
  const { id, companyName, botName, companyDescription, theme, logo, suggestions, welcome } = p;
  return { id, companyName, botName, companyDescription, theme, logo, suggestions, welcome };
}

const TTL_MS = 60_000;
const cache = new Map<string, { value: unknown; expires: number }>();

async function cached<T>(key: string, load: () => Promise<T>, fresh = false): Promise<T> {
  const hit = cache.get(key);
  if (!fresh && hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

/** Po uložení v adminu – ať se změna projeví hned (aspoň na této instanci, jinde do 60 s). */
export function invalidateProfiles() {
  cache.clear();
}

const isConfigId = (id: string) => Object.prototype.hasOwnProperty.call(clientConfig.profiles, id);

function fromConfig(id: string): ChatProfile | null {
  if (!isConfigId(id)) return null;
  const p = clientConfig.profiles[id as keyof typeof clientConfig.profiles];
  return { ...p, id, systemPrompt: "", allowedOrigins: clientConfig.allowedOrigins, active: true, source: "config" };
}

function pickLocales<T>(value: Partial<Record<Locale, T>> | null | undefined, empty: T): Record<Locale, T> {
  return Object.fromEntries(clientConfig.locales.map((l) => [l, value?.[l] ?? empty])) as Record<Locale, T>;
}

export function fromRow(row: ProfileRow): ChatProfile {
  return {
    id: row.id,
    companyName: row.name,
    botName: row.botName,
    companyDescription: row.description,
    tone: row.tone,
    systemPrompt: row.systemPrompt,
    theme: {
      primary: row.colors?.primary || "#1f4d3a",
      primaryText: row.colors?.primaryText || "#ffffff",
      radius: Number(row.colors?.radius ?? 18),
    },
    logo: row.logo,
    contact: { phone: row.contact?.phone ?? "", email: row.contact?.email ?? "", web: row.contact?.web ?? "" },
    suggestions: pickLocales(row.suggestedQuestions, [] as string[]),
    welcome: pickLocales(row.welcome, ""),
    voice: row.voice || undefined,
    allowedOrigins: row.allowedOrigins,
    active: row.active,
    source: "db",
  };
}

/** Řádek z DB; `undefined` = DB není k dispozici (chybí URL nebo chyba) → fallback na config. */
async function dbProfile(id: string): Promise<ProfileRow | null | undefined> {
  if (!hasDb()) return undefined;
  try {
    const [row] = await getDb().select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return row ?? null;
  } catch (e) {
    console.warn("[profiles] DB nedostupná, používám client.config.ts:", (e as Error)?.message);
    return undefined;
  }
}

/** Profil přesně podle ID (i neaktivní). DB → client.config.ts → null. */
export async function getProfileById(id: string, opts: { fresh?: boolean } = {}): Promise<ChatProfile | null> {
  return cached(
    `p:${id}`,
    async () => {
      const row = await dbProfile(id);
      return row ? fromRow(row) : fromConfig(id);
    },
    opts.fresh,
  );
}

/** Jako dřív resolveProfileId: neznámé ID → výchozí profil. Vrací i neaktivní (volající rozhodne). */
export async function resolveProfile(id: unknown): Promise<ChatProfile | null> {
  if (typeof id === "string" && /^[a-z0-9-]{1,64}$/.test(id)) {
    const p = await getProfileById(id);
    if (p) return p;
  }
  return getProfileById(clientConfig.defaultProfile);
}

/** Všechny profily: z DB + z configu ty, které v DB nejsou. */
export async function listProfiles(opts: { fresh?: boolean } = {}): Promise<ChatProfile[]> {
  return cached("list", async () => {
    let rows: ProfileRow[] | undefined;
    if (hasDb()) {
      try {
        rows = await getDb().select().from(profiles).orderBy(asc(profiles.name));
      } catch (e) {
        console.warn("[profiles] DB nedostupná, používám client.config.ts:", (e as Error)?.message);
      }
    }
    const fromDb = (rows ?? []).map(fromRow);
    const ids = new Set(fromDb.map((p) => p.id));
    const fromCfg = Object.keys(clientConfig.profiles)
      .filter((id) => !ids.has(id))
      .map((id) => fromConfig(id)!);
    return [...fromDb, ...fromCfg];
  }, opts.fresh);
}

/** Znalosti profilu jako jeden Markdown (bloky v pořadí). */
export async function getKnowledgeMarkdown(profile: ChatProfile, opts: { fresh?: boolean } = {}): Promise<string> {
  if (profile.source === "config") return loadKnowledgeFiles(profile.id);
  return cached(
    `k:${profile.id}`,
    async () => {
      try {
        const blocks = await getDb()
          .select({ title: knowledge.title, contentMd: knowledge.contentMd })
          .from(knowledge)
          .where(eq(knowledge.profileId, profile.id))
          .orderBy(asc(knowledge.sort), asc(knowledge.id));
        return blocks.map((b) => `<!-- ${b.title.replace(/--/g, "–")} -->\n${b.contentMd.trim()}`).join("\n\n");
      } catch (e) {
        console.warn("[profiles] znalosti z DB nejdou načíst, zkouším knowledge/:", (e as Error)?.message);
        return loadKnowledgeFiles(profile.id);
      }
    },
    opts.fresh,
  );
}

/** Domény pro CSP frame-ancestors /embed (sjednocení aktivních profilů). null = povolit všude. */
export async function embedOrigins(): Promise<string[] | null> {
  const active = (await listProfiles()).filter((p) => p.active);
  if (active.some((p) => p.allowedOrigins.length === 0)) return null;
  return [...new Set(active.flatMap((p) => p.allowedOrigins))];
}
