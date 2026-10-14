/**
 * ============================================================
 *  KONFIGURACE ZÁKAZNÍKA
 *  Při klonování pro nového zákazníka měň JEN tento soubor
 *  a obsah složky /knowledge/<id-profilu>. Nic dalšího.
 *
 *  PROFILY: jedno nasazení může obsluhovat víc firem (např. demo).
 *  Pro ostrého zákazníka nech jeden profil a smaž ostatní.
 *  Znalosti profilu leží v /knowledge/<id>/*.md
 * ============================================================
 */

export type Locale = "cs" | "en";

export type Profile = {
  /** Název firmy – hlavička chatu, bot se tak představuje */
  companyName: string;
  /** Jméno asistenta */
  botName: string;
  /** Krátký popis firmy pro bota (1–2 věty) */
  companyDescription: string;
  /** Tón komunikace */
  tone: string;
  /** Barvy widgetu */
  theme: {
    primary: string; // hlavní barva (tlačítko, hlavička, bubliny uživatele)
    primaryText: string; // text na hlavní barvě
    radius: number; // zaoblení v px
  };
  /** Logo / avatar v hlavičce (cesta v /public nebo URL). Prázdné = iniciála. */
  logo: string;
  /** Kontakt – bot ho nabídne, když nezná odpověď */
  contact: { phone: string; email: string; web: string };
  /** Navrhované otázky pod uvítací zprávou */
  suggestions: Record<Locale, string[]>;
  /** Uvítací zpráva */
  welcome: Record<Locale, string>;
};

const profiles = {
  restaurace: {
    companyName: "Ukázková Restaurace",
    botName: "Asistent",
    companyDescription: "Česká restaurace s domácí kuchyní a polední nabídkou v centru města.",
    tone: "přátelský, stručný a ochotný, vyká zákazníkům",
    theme: { primary: "#1f4d3a", primaryText: "#ffffff", radius: 18 },
    logo: "",
    contact: {
      phone: "+420 123 456 789",
      email: "info@ukazkova-restaurace.cz",
      web: "https://ukazkova-restaurace.cz",
    },
    suggestions: {
      cs: ["Máte teď otevřeno?", "Co je dnes k obědu?", "Jak si rezervuji stůl?"],
      en: ["Are you open now?", "Can I book a table?", "Do you have vegetarian food?"],
    },
    welcome: {
      cs: "Dobrý den! 👋 Jsem virtuální asistent restaurace. S čím vám mohu pomoci?",
      en: "Hello! 👋 I'm the restaurant's virtual assistant. How can I help you?",
    },
  },

  tpd: {
    companyName: "Top Profit Design",
    botName: "Asistent TPD",
    companyDescription:
      "Prémiové webdesign studio (Praha, klienti z celé ČR): weby na míru, e-shopy, redesign, SEO, branding, správa webu, sociální sítě, reklama, foto/video a tisk.",
    tone: "profesionální, sebevědomý a přátelský, vyká, mluví jako zkušený konzultant, jde rovnou k věci",
    theme: { primary: "#16140f", primaryText: "#e3c37a", radius: 16 },
    logo: "",
    contact: {
      phone: "+420 730 336 337",
      email: "info@topprofitdesign.cz",
      web: "https://topprofitdesign.cz",
    },
    suggestions: {
      cs: ["Kolik stojí nový web?", "Jak rychle web dodáte?", "Chci nezávaznou konzultaci"],
      en: ["How much does a website cost?", "How fast can you deliver?", "I'd like a free consultation"],
    },
    welcome: {
      cs: "Dobrý den! 👋 Jsem asistent Top Profit Design. Poradím s webem, e-shopem, cenou i termíny. Co plánujete?",
      en: "Hello! 👋 I'm the Top Profit Design assistant. I can help with websites, e-shops, pricing and timelines. What are you planning?",
    },
  },
} satisfies Record<string, Profile>;

export type ProfileId = keyof typeof profiles;

export const clientConfig = {
  profiles: profiles as Record<ProfileId, Profile>,

  /** Výchozí profil (když web neurčí jinak přes data-profile) */
  defaultProfile: "restaurace" as ProfileId,

  /** Jazyky. První je výchozí. */
  locales: ["cs", "en"] as Locale[],

  /**
   * Domény, kde smí widget běžet (weby zákazníků – všech profilů).
   * Localhost a vlastní doména botu jsou povoleny vždy.
   * Prázdné pole = povolit vše (jen pro vývoj!).
   */
  allowedOrigins: [
    "https://ukazkova-restaurace.cz",
    "https://www.ukazkova-restaurace.cz",
    "https://topprofitdesign.cz",
    "https://www.topprofitdesign.cz",
  ],

  /** Hlas: mikrofon (diktování) a čtení odpovědí nahlas – zdarma přes prohlížeč */
  voice: {
    enabled: true,
    autoReadVoiceReplies: true, // když se uživatel zeptá hlasem, odpověď se přečte nahlas
  },

  /** Časové pásmo (bot podle něj ví, jestli je teď otevřeno) */
  timezone: "Europe/Prague",

  /** AI model a limity */
  ai: {
    /**
     * Poskytovatel AI:
     *  "gemini"    – Google Gemini, má free tier (klíč: aistudio.google.com/apikey → GOOGLE_GENERATIVE_AI_API_KEY)
     *  "anthropic" – Claude, placené podle spotřeby (console → ANTHROPIC_API_KEY)
     */
    provider: "gemini" as "gemini" | "anthropic",
    models: {
      gemini: "gemini-3.5-flash-lite", // lite = vyšší limity free tieru, rychlejší; chytřejší: "gemini-3.5-flash"
      anthropic: "claude-haiku-5-5",
    },
    maxOutputTokens: 600,
    maxHistory: 20, // max počet zpráv posílaných do AI
    maxMessageLength: 1000, // max znaků jedné zprávy
    rateLimitPerMinute: 15, // max zpráv za minutu z jedné IP
  },

  /** Pozice widgetu na webu */
  position: "right" as "right" | "left",
};

export type ClientConfig = typeof clientConfig;

/** Bezpečně vrátí ID profilu (neznámé → výchozí) */
export function resolveProfileId(id: unknown): ProfileId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(clientConfig.profiles, id)
    ? (id as ProfileId)
    : clientConfig.defaultProfile;
}

export function getProfile(id: unknown): Profile {
  return clientConfig.profiles[resolveProfileId(id)];
}
