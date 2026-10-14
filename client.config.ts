/**
 * ============================================================
 *  KONFIGURACE ZÁKAZNÍKA
 *  Při klonování pro nového zákazníka měň JEN tento soubor
 *  a obsah složky /knowledge. Nic dalšího.
 * ============================================================
 */

export type Locale = "cs" | "en";

export const clientConfig = {
  /** Název firmy – zobrazí se v hlavičce chatu a bot se tak představuje */
  companyName: "Ukázková Restaurace",

  /** Jméno asistenta */
  botName: "Asistent",

  /** Krátký popis firmy pro bota (1–2 věty) */
  companyDescription:
    "Česká restaurace s domácí kuchyní a polední nabídkou v centru města.",

  /** Tón komunikace */
  tone: "přátelský, stručný a ochotný, vyká zákazníkům",

  /** Jazyky. První je výchozí. Pro angličtinu přidej "en". */
  locales: ["cs", "en"] as Locale[],

  /** Barvy widgetu */
  theme: {
    primary: "#1f4d3a", // hlavní barva (tlačítko, hlavička, bubliny uživatele)
    primaryText: "#ffffff", // text na hlavní barvě
    radius: 18, // zaoblení v px
  },

  /** Logo / avatar v hlavičce (cesta v /public nebo URL). Prázdné = iniciála. */
  logo: "",

  /** Kontakt – bot ho nabídne, když nezná odpověď */
  contact: {
    phone: "+420 123 456 789",
    email: "info@ukazkova-restaurace.cz",
    web: "https://ukazkova-restaurace.cz",
  },

  /** Navrhované otázky pod uvítací zprávou */
  suggestions: {
    cs: ["Jakou máte otevírací dobu?", "Co je dnes k obědu?", "Jak si rezervuji stůl?"],
    en: ["What are your opening hours?", "Can I book a table?", "Do you have vegetarian food?"],
  } as Record<Locale, string[]>,

  /** Uvítací zpráva */
  welcome: {
    cs: "Dobrý den! 👋 Jsem virtuální asistent. S čím vám mohu pomoci?",
    en: "Hello! 👋 I'm a virtual assistant. How can I help you?",
  } as Record<Locale, string>,

  /**
   * Domény, kde smí widget běžet (web zákazníka).
   * Localhost a vlastní doména botu jsou povoleny vždy.
   * Prázdné pole = povolit vše (jen pro vývoj!).
   */
  allowedOrigins: ["https://ukazkova-restaurace.cz", "https://www.ukazkova-restaurace.cz"],

  /** AI model a limity */
  ai: {
    model: "claude-haiku-5-5",
    maxOutputTokens: 600,
    maxHistory: 20, // max počet zpráv posílaných do AI
    maxMessageLength: 1000, // max znaků jedné zprávy
    rateLimitPerMinute: 15, // max zpráv za minutu z jedné IP
  },

  /** Pozice widgetu na webu */
  position: "right" as "right" | "left",
};

export type ClientConfig = typeof clientConfig;
