import { existsSync } from "node:fs";

/** Skripty běží mimo Next.js → .env.local načteme ručně. */
export function loadLocalEnv() {
  for (const f of [".env.local", ".env"]) {
    if (existsSync(f)) process.loadEnvFile(f);
  }
}
