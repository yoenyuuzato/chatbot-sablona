/**
 * Produkční adresa bota – používá se ve vkládacím kódu (demo i admin).
 * Nastav NEXT_PUBLIC_SITE_URL (např. vlastní doména). Záměrně NE VERCEL_URL – ta patří jen jednomu deployi.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://chatbot-sablona.vercel.app").trim().replace(/\/+$/, "");
