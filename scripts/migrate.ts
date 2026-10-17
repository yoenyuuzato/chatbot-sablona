/**
 * Spustí migrace databáze (složka drizzle/). Idempotentní – hotové migrace přeskočí.
 * Bez DATABASE_URL jen vypíše upozornění (build šablony bez DB pořád funguje).
 */
import { migrate } from "drizzle-orm/neon-http/migrator";
import { loadLocalEnv } from "./env";

export async function runMigrations(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.log("[migrate] DATABASE_URL není nastavená – migrace přeskočeny (profily se čtou z client.config.ts).");
    return false;
  }
  const { getDb } = await import("../lib/db");
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  console.log("[migrate] Databáze je aktuální.");
  return true;
}

if (/migrate\.ts$/.test(process.argv[1] ?? "")) {
  loadLocalEnv();
  runMigrations().catch((e) => {
    console.error("[migrate] Chyba:", e);
    process.exit(1);
  });
}
