"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq, max } from "drizzle-orm";
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken } from "@/lib/auth";
import { crawlSite, normalizeStartUrl, type CrawlPage } from "@/lib/crawl";
import { getDb } from "@/lib/db";
import { knowledge, knowledgeHistory, profiles } from "@/lib/db/schema";
import { importConfigProfile } from "@/lib/import";
import { invalidateProfiles } from "@/lib/profiles";
import { limitAttempts, normalizeOrigin } from "@/lib/security";
import { VOICE_IDS } from "@/lib/voices";

export type FormState = { error?: string; ok?: string } | undefined;

async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifySessionToken(jar.get(SESSION_COOKIE)?.value))) redirect("/admin/login");
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (fd: FormData, k: string) =>
  str(fd, k)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const MAX_TITLE = 200;
const MAX_CONTENT = 100_000;

/** Po každé změně: zahodit cache profilů (chat, widget) a obnovit stránky adminu. */
function changed(profileId?: string) {
  invalidateProfiles();
  revalidatePath("/admin", "layout");
  if (profileId) revalidatePath(`/admin/profiles/${profileId}`, "layout");
}

// --- Přihlášení ---------------------------------------------------------------

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60_000;

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "Na serveru není nastaveno ADMIN_PASSWORD." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limitAttempts(`login:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
    return { error: "Příliš mnoho pokusů. Zkuste to znovu za 15 minut." };
  }
  if (!(await checkPassword(str(fd, "password")))) return { error: "Nesprávné heslo." };

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// --- Profily ------------------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function parseProfile(fd: FormData) {
  const origins: string[] = [];
  for (const raw of fd.getAll("origin").map((v) => String(v).trim()).filter(Boolean)) {
    const o = normalizeOrigin(raw);
    if (!o) return { error: `Neplatná doména: ${raw}` };
    if (!origins.includes(o)) origins.push(o);
  }
  const radius = Number(str(fd, "radius") || 18);
  const voice = str(fd, "voice");
  const data = {
    name: str(fd, "name"),
    botName: str(fd, "botName") || "Asistent",
    description: str(fd, "description"),
    tone: str(fd, "tone"),
    systemPrompt: str(fd, "systemPrompt"),
    welcome: { cs: str(fd, "welcome_cs"), en: str(fd, "welcome_en") },
    suggestedQuestions: { cs: lines(fd, "suggestions_cs"), en: lines(fd, "suggestions_en") },
    colors: { primary: str(fd, "primary"), primaryText: str(fd, "primaryText"), radius },
    contact: { phone: str(fd, "phone"), email: str(fd, "email"), web: str(fd, "web") },
    logo: str(fd, "logo"),
    voice,
    allowedOrigins: origins,
    active: fd.get("active") === "on",
  };

  if (!data.name) return { error: "Vyplňte název firmy." };
  if (!HEX.test(data.colors.primary) || !HEX.test(data.colors.primaryText)) return { error: "Barvy musí být ve tvaru #rrggbb." };
  if (!Number.isInteger(radius) || radius < 0 || radius > 40) return { error: "Zaoblení musí být celé číslo 0–40." };
  if (voice && !VOICE_IDS.has(voice)) return { error: "Neznámý hlas." };
  if (data.contact.web && !/^https?:\/\//.test(data.contact.web)) return { error: "Web musí začínat http(s)://" };
  if (data.logo && !/^(https?:\/\/|\/)/.test(data.logo)) return { error: "Logo: URL (https://…) nebo cesta v /public (/logo.png)." };
  if (data.suggestedQuestions.cs.length > 6 || data.suggestedQuestions.en.length > 6) return { error: "Max. 6 navrhovaných otázek na jazyk." };
  if (data.systemPrompt.length > 20_000) return { error: "Pokyny pro AI jsou příliš dlouhé (max. 20 000 znaků)." };
  return { data };
}

export async function createProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id").toLowerCase();
  if (!SLUG_RE.test(id)) return { error: "ID: malá písmena bez diakritiky, číslice a pomlčky (např. kavarna-u-mostu)." };
  const parsed = parseProfile(fd);
  if ("error" in parsed) return { error: parsed.error };

  const inserted = await getDb()
    .insert(profiles)
    .values({ id, ...parsed.data })
    .onConflictDoNothing()
    .returning({ id: profiles.id });
  if (!inserted.length) return { error: `Profil s ID „${id}“ už existuje.` };
  changed(id);
  redirect(`/admin/profiles/${id}?created=1`);
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = parseProfile(fd);
  if ("error" in parsed) return { error: parsed.error };
  const res = await getDb()
    .update(profiles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profiles.id, id))
    .returning({ id: profiles.id });
  if (!res.length) return { error: "Profil nenalezen." };
  changed(id);
  return { ok: "Uloženo. Na webech se změna projeví do 1 minuty." };
}

export async function toggleProfileAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const active = fd.get("active") === "true";
  await getDb().update(profiles).set({ active: !active, updatedAt: new Date() }).where(eq(profiles.id, id));
  changed(id);
}

export async function deleteProfileAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  // znalosti i historie se smažou kaskádou; statistiky zůstanou
  await getDb().delete(profiles).where(eq(profiles.id, id));
  changed();
  redirect("/admin/profiles");
}

/** Profil, který je zatím jen v client.config.ts → zkopírovat do DB (včetně knowledge/<id>/). */
export async function importConfigProfileAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await importConfigProfile(id);
  changed(id);
  redirect(`/admin/profiles/${id}`);
}

// --- Znalosti -----------------------------------------------------------------

function parseBlock(fd: FormData) {
  const title = str(fd, "title");
  const contentMd = String(fd.get("contentMd") ?? "").trim();
  if (!title) return { error: "Vyplňte název bloku." };
  if (title.length > MAX_TITLE) return { error: `Název je příliš dlouhý (max. ${MAX_TITLE} znaků).` };
  if (!contentMd) return { error: "Obsah je prázdný." };
  if (contentMd.length > MAX_CONTENT) return { error: `Obsah je příliš dlouhý (max. ${MAX_CONTENT.toLocaleString("cs-CZ")} znaků).` };
  return { title, contentMd };
}

async function insertBlock(profileId: string, title: string, contentMd: string) {
  const db = getDb();
  const [{ top }] = await db.select({ top: max(knowledge.sort) }).from(knowledge).where(eq(knowledge.profileId, profileId));
  await db.insert(knowledge).values({ profileId, title, contentMd, sort: (top ?? 0) + 10 });
}

export async function addBlockAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const profileId = str(fd, "profileId");
  const parsed = parseBlock(fd);
  if ("error" in parsed) return { error: parsed.error };
  await insertBlock(profileId, parsed.title, parsed.contentMd);
  changed(profileId);
  return { ok: `Blok „${parsed.title}“ přidán.` };
}

export async function updateBlockAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const parsed = parseBlock(fd);
  if ("error" in parsed) return { error: parsed.error };
  const db = getDb();
  const [cur] = await db.select().from(knowledge).where(eq(knowledge.id, id)).limit(1);
  if (!cur) return { error: "Blok nenalezen (možná byl smazán)." };
  if (cur.title === parsed.title && cur.contentMd === parsed.contentMd) return { ok: "Beze změny." };
  await db.batch([
    db.insert(knowledgeHistory).values({
      knowledgeId: cur.id,
      profileId: cur.profileId,
      title: cur.title,
      contentMd: cur.contentMd,
      sort: cur.sort,
      action: "update",
    }),
    db.update(knowledge).set({ ...parsed, updatedAt: new Date() }).where(eq(knowledge.id, id)),
  ]);
  changed(cur.profileId);
  return { ok: "Uloženo. Předchozí verze je v historii." };
}

export async function deleteBlockAction(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const db = getDb();
  const [cur] = await db.select().from(knowledge).where(eq(knowledge.id, id)).limit(1);
  if (!cur) return;
  await db.batch([
    db.insert(knowledgeHistory).values({
      knowledgeId: cur.id,
      profileId: cur.profileId,
      title: cur.title,
      contentMd: cur.contentMd,
      sort: cur.sort,
      action: "delete",
    }),
    db.delete(knowledge).where(eq(knowledge.id, id)),
  ]);
  changed(cur.profileId);
}

/** Posune blok nahoru/dolů (přečísluje pořadí celého profilu po 10). */
export async function moveBlockAction(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const db = getDb();
  const [cur] = await db.select({ profileId: knowledge.profileId }).from(knowledge).where(eq(knowledge.id, id)).limit(1);
  if (!cur) return;
  const all = await db
    .select({ id: knowledge.id })
    .from(knowledge)
    .where(eq(knowledge.profileId, cur.profileId))
    .orderBy(asc(knowledge.sort), asc(knowledge.id));
  const i = all.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  const [first, ...rest] = all.map((b, n) => db.update(knowledge).set({ sort: (n + 1) * 10 }).where(eq(knowledge.id, b.id)));
  await db.batch([first, ...rest]);
  changed(cur.profileId);
}

/** Vrátí blok na verzi z historie (současný stav se předtím uloží do historie). Smazaný blok obnoví. */
export async function restoreVersionAction(fd: FormData) {
  await requireAdmin();
  const historyId = Number(str(fd, "historyId"));
  const db = getDb();
  const [h] = await db.select().from(knowledgeHistory).where(eq(knowledgeHistory.id, historyId)).limit(1);
  if (!h) return;
  const [cur] = await db.select().from(knowledge).where(eq(knowledge.id, h.knowledgeId)).limit(1);
  if (cur) {
    await db.batch([
      db.insert(knowledgeHistory).values({
        knowledgeId: cur.id,
        profileId: cur.profileId,
        title: cur.title,
        contentMd: cur.contentMd,
        sort: cur.sort,
        action: "restore",
      }),
      db.update(knowledge).set({ title: h.title, contentMd: h.contentMd, updatedAt: new Date() }).where(eq(knowledge.id, cur.id)),
    ]);
  } else {
    // smazaný blok – vrátíme ho se stejným ID, ať na něj dál navazuje historie
    await db
      .insert(knowledge)
      .values({ id: h.knowledgeId, profileId: h.profileId, title: h.title, contentMd: h.contentMd, sort: h.sort });
  }
  changed(h.profileId);
}

// --- Načíst z webu --------------------------------------------------------------

export type ScrapeState =
  | { error?: string; preview?: { url: string; title: string; text: string; pages: CrawlPage[]; notes: string[] } }
  | undefined;

/** Stáhne až 10 stránek ze stejné domény a vrátí náhled (nic neukládá). */
export async function scrapeAction(_: ScrapeState, fd: FormData): Promise<ScrapeState> {
  await requireAdmin();
  let url: URL;
  try {
    url = normalizeStartUrl(str(fd, "url"));
    if (!url.hostname.includes(".")) throw new Error();
  } catch {
    return { error: "Zadejte platnou URL, např. https://www.example.cz" };
  }
  try {
    const res = await crawlSite(url.toString());
    const robots = res.skipped.filter((s) => s.reason.includes("robots")).length;
    const notes = [
      res.source === "sitemap" ? "stránky ze sitemap.xml" : "stránky z odkazů na úvodní stránce",
      res.truncated ? "zkráceno na limit znaků" : "",
      res.skipped.length ? `přeskočeno ${res.skipped.length}${robots ? ` (robots.txt: ${robots})` : ""}` : "",
    ].filter(Boolean);
    return {
      preview: { url: url.toString(), title: `Web ${url.hostname.replace(/^www\./, "")}`, text: res.text, pages: res.pages, notes },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Uloží (případně upravený) náhled z webu jako nový blok znalostí. */
export async function saveScrapedAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const profileId = str(fd, "profileId");
  const parsed = parseBlock(fd);
  if ("error" in parsed) return { error: parsed.error };
  const [p] = await getDb().select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!p) return { error: "Profil nenalezen." };
  await insertBlock(profileId, parsed.title, parsed.contentMd);
  changed(profileId);
  return { ok: `Uloženo jako blok „${parsed.title}“.` };
}
