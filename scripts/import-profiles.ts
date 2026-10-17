/**
 * Naimportuje profily z client.config.ts a znalosti z knowledge/<id>/*.md do databáze.
 * Idempotentní: existující profily a bloky (stejný název) přeskočí.
 *   npm run import-profiles            – jen doplní, co v DB chybí
 *   npm run import-profiles -- --force – přepíše profily i bloky obsahem ze souborů
 */
import { loadLocalEnv } from "./env";
import { runMigrations } from "./migrate";

async function main() {
  loadLocalEnv();
  if (!(await runMigrations())) {
    console.error("Nastav DATABASE_URL (v .env.local) a spusť znovu.");
    process.exit(1);
  }
  const { clientConfig } = await import("../client.config");
  const { importConfigProfile } = await import("../lib/import");
  const force = process.argv.includes("--force");
  for (const id of Object.keys(clientConfig.profiles)) {
    await importConfigProfile(id, { force, log: console.log });
  }
  console.log("Hotovo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
