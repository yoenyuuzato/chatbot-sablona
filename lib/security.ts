import { clientConfig } from "@/client.config";

/** Origin je povolen, pokud je v seznamu profilu, je to localhost nebo vlastní doména bota. */
export function isOriginAllowed(origin: string | null, host: string | null, allowed: string[]): boolean {
  if (!origin) return true; // stejný původ (např. server-to-server bez Origin) – nechá projít, rate limit chrání
  if (allowed.length === 0) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (host && url.host === host) return true; // iframe /embed běží na doméně bota
    if (url.hostname.endsWith(".vercel.app") && host?.endsWith(".vercel.app")) return url.host === host;
  } catch {
    return false;
  }
  return allowed.includes(origin);
}

/**
 * Jednoduchý in-memory rate limit (per IP, okno 60 s).
 * Na Vercelu platí per instance – pro malé weby stačí.
 * Pro silnější ochranu lze později nahradit Upstash Redis.
 */
const hits = new Map<string, number[]>();

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const list = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  if (list.length >= clientConfig.ai.rateLimitPerMinute) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // pojistka proti růstu paměti
  return true;
}

/**
 * Obecný limit pokusů (např. přihlášení do adminu): max `max` za `windowMs` na klíč.
 * Stejně jako rateLimit platí per instance.
 */
const attempts = new Map<string, number[]>();

export function limitAttempts(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (attempts.get(key) ?? []).filter((t) => t > now - windowMs);
  if (list.length >= max) {
    attempts.set(key, list);
    return false;
  }
  list.push(now);
  attempts.set(key, list);
  if (attempts.size > 5000) attempts.clear();
  return true;
}

/** Normalizuje zadanou doménu na origin (https://example.cz). null = neplatná. */
export function normalizeOrigin(input: string): string | null {
  const raw = input.trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.origin;
  } catch {
    return null;
  }
}
