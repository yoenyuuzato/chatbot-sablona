# Chatbot šablona

Univerzální AI chatbot pro weby zákazníků. Jedna šablona → pro každého zákazníka klon + vlastní konfigurace a znalosti.

**Stack:** Next.js · TypeScript · Tailwind · Vercel AI SDK · Claude (`claude-haiku-5-5`)

## Co umí

- Plovoucí chat widget, který se na **jakýkoli web** (Next.js, WordPress, Webnode…) vloží jedním `<script>`
- Odpovídá **jen ze znalostní báze** (`/knowledge/*.md`), nevymýšlí si. Když neví, nabídne kontakt.
- Čeština výchozí, angličtina připravená (přepínač CS/EN v hlavičce, bot odpovídá jazykem uživatele)
- Streaming odpovědí, navrhované otázky, plně responzivní (na mobilu fullscreen)
- Historie drží v rámci záložky (přežije přechod mezi stránkami webu), na server se **nic neukládá**
- Ochrana: povolené domény, rate limit podle IP, limit délky zprávy a historie
- Prompt caching → znalostní báze se neúčtuje celá při každé zprávě
- **Demo režim** bez API klíče (UI jde testovat hned)

## Nový zákazník – checklist

1. [ ] Na GitHubu **Use this template** → nové repo (např. `chatbot-rohozec`)
2. [ ] Naklonovat:
   ```bash
   mkdir -p ~/Weby && cd ~/Weby
   git clone https://github.com/YongChen2/chatbot-NAZEV.git chatbot-NAZEV
   cd chatbot-NAZEV && npm install
   ```
3. [ ] Upravit **`client.config.ts`**: název, popis, barvy, logo, kontakt, uvítání, navrhované otázky, `allowedOrigins` (domény webu zákazníka)
4. [ ] Nahradit soubory v **`/knowledge`** údaji zákazníka (otevírací doba, ceník, menu, FAQ…). Libovolný počet `.md` souborů.
5. [ ] Lokálně otestovat: `cp .env.example .env.local`, doplnit klíč, `npm run dev` → http://localhost:3000
6. [ ] Vercel → Add New Project → import repa → Environment Variables: `ANTHROPIC_API_KEY`
7. [ ] Na web zákazníka vložit před `</body>`:
   ```html
   <script src="https://chatbot-NAZEV.vercel.app/widget.js" defer></script>
   ```
8. [ ] Vyzkoušet na živém webu (desktop + mobil)

## Vložení widgetu – volby

| Atribut / API | Co dělá |
|---|---|
| `data-lang="en"` | vynutí jazyk (jinak podle prohlížeče) |
| `data-position="left"` | bublina vlevo |
| `window.ChatbotWidget.open()` / `.close()` | ovládání z vlastního tlačítka |

V Next.js webu zákazníka:
```tsx
import Script from "next/script";
<Script src="https://chatbot-NAZEV.vercel.app/widget.js" strategy="afterInteractive" />
```

## Struktura

```
client.config.ts      ← JEDINÝ soubor, který se mění per zákazník
knowledge/*.md        ← znalosti zákazníka
locales/index.ts      ← texty UI (cs, en)
app/api/chat/         ← AI endpoint (limity, origin, rate limit)
app/widget.js/        ← vkládací skript (generuje se z configu)
app/embed/            ← samotný chat (běží v iframe)
components/Chat.tsx   ← UI chatu
lib/knowledge.ts      ← system prompt + načtení znalostí
lib/security.ts       ← povolené domény, rate limit
```

## Náklady

- Vercel: Hobby / Pro (podle zákazníka)
- Claude API: platí se za tokeny. Doporučení: **samostatný workspace a klíč pro každého zákazníka** v console.anthropic.com → přehled nákladů per klient, snadné přefakturování, nastavitelný měsíční limit.

## Další kroky (roadmap)

- [ ] Sběr poptávek (jméno, e-mail, telefon → e-mail přes Resend)
- [ ] Trvalý rate limit přes Upstash Redis (pro weby s velkým provozem)
- [ ] RAG pro velké dokumenty (desítky stran)
- [ ] Statistiky nejčastějších dotazů
