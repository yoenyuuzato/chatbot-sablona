import type { ChatProfile } from "@/lib/profiles";

export type ProfileFormValues = {
  id: string;
  name: string;
  botName: string;
  description: string;
  tone: string;
  systemPrompt: string;
  welcome: { cs: string; en: string };
  suggestions: { cs: string[]; en: string[] };
  primary: string;
  primaryText: string;
  radius: number;
  logo: string;
  contact: { phone: string; email: string; web: string };
  voice: string;
  allowedOrigins: string[];
  active: boolean;
};

export const EMPTY_PROFILE: ProfileFormValues = {
  id: "",
  name: "",
  botName: "Asistent",
  description: "",
  tone: "přátelský, stručný a ochotný, vyká zákazníkům",
  systemPrompt: "",
  welcome: {
    cs: "Dobrý den! 👋 Jsem virtuální asistent. S čím vám mohu pomoci?",
    en: "Hello! 👋 I'm the virtual assistant. How can I help you?",
  },
  suggestions: { cs: [], en: [] },
  primary: "#1f4d3a",
  primaryText: "#ffffff",
  radius: 18,
  logo: "",
  contact: { phone: "", email: "", web: "" },
  voice: "",
  allowedOrigins: [],
  active: true,
};

export function toFormValues(p: ChatProfile): ProfileFormValues {
  return {
    id: p.id,
    name: p.companyName,
    botName: p.botName,
    description: p.companyDescription,
    tone: p.tone,
    systemPrompt: p.systemPrompt,
    welcome: { cs: p.welcome.cs ?? "", en: p.welcome.en ?? "" },
    suggestions: { cs: p.suggestions.cs ?? [], en: p.suggestions.en ?? [] },
    primary: p.theme.primary,
    primaryText: p.theme.primaryText,
    radius: p.theme.radius,
    logo: p.logo,
    contact: p.contact,
    voice: p.voice ?? "",
    allowedOrigins: p.allowedOrigins,
    active: p.active,
  };
}
