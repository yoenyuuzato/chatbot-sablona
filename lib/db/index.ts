import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

/** Je nastavená databáze? Bez ní běží šablona jen z client.config.ts + knowledge/. */
export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Líná inicializace – build nepotřebuje DATABASE_URL. */
export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Chybí DATABASE_URL");
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export { schema };
