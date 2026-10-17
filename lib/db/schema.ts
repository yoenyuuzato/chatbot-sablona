import { boolean, date, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export type LocalizedText = { cs: string; en: string };
export type LocalizedList = { cs: string[]; en: string[] };
export type ProfileColors = { primary: string; primaryText: string; radius: number };
export type ProfileContact = { phone: string; email: string; web: string };

/** Profily zákazníků (firma = jeden profil = jeden widget). */
export const profiles = pgTable("profiles", {
  /** slug, používá se v data-profile="…" */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  botName: text("bot_name").notNull().default("Asistent"),
  description: text("description").notNull().default(""),
  tone: text("tone").notNull().default(""),
  /** Doplňující pokyny pro AI (přidají se k základním pravidlům šablony). */
  systemPrompt: text("system_prompt").notNull().default(""),
  welcome: jsonb("welcome").$type<LocalizedText>().notNull(),
  suggestedQuestions: jsonb("suggested_questions").$type<LocalizedList>().notNull(),
  colors: jsonb("colors").$type<ProfileColors>().notNull(),
  contact: jsonb("contact").$type<ProfileContact>().notNull(),
  logo: text("logo").notNull().default(""),
  /** Hlas Gemini TTS; prázdné = výchozí */
  voice: text("voice").notNull().default(""),
  /** Domény, kde smí widget běžet. Prázdné = všude. */
  allowedOrigins: text("allowed_origins").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Znalosti profilu – bloky Markdownu v daném pořadí. */
export const knowledge = pgTable(
  "knowledge",
  {
    id: serial("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade", onUpdate: "cascade" }),
    title: text("title").notNull(),
    contentMd: text("content_md").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("knowledge_profile_idx").on(t.profileId, t.sort)],
);

/** Předchozí verze bloků znalostí (pro „Vrátit verzi“). knowledge_id záměrně bez FK – přežije smazání bloku. */
export const knowledgeHistory = pgTable(
  "knowledge_history",
  {
    id: serial("id").primaryKey(),
    knowledgeId: integer("knowledge_id").notNull(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade", onUpdate: "cascade" }),
    title: text("title").notNull(),
    contentMd: text("content_md").notNull(),
    sort: integer("sort").notNull().default(0),
    /** update | delete | restore – co se s blokem stalo, když se tato verze odložila */
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("knowledge_history_profile_idx").on(t.profileId, t.knowledgeId, t.createdAt)],
);

/** Denní statistiky – jen počty, BEZ obsahu zpráv. profile_id bez FK (počítají se i profily z client.config.ts). */
export const stats = pgTable(
  "stats",
  {
    profileId: text("profile_id").notNull(),
    day: date("day").notNull(),
    conversations: integer("conversations").notNull().default(0),
    messages: integer("messages").notNull().default(0),
    errors: integer("errors").notNull().default(0),
    /** chyby typu „vytížený“ (limit / přetížení AI) */
    busy: integer("busy").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.day] })],
);

export type ProfileRow = typeof profiles.$inferSelect;
export type KnowledgeRow = typeof knowledge.$inferSelect;
export type KnowledgeHistoryRow = typeof knowledgeHistory.$inferSelect;
