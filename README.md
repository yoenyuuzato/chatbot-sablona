# Chatbot šablona

Univerzální AI chatbot pro weby zákazníků. Jedna šablona → pro každého zákazníka klon + vlastní konfigurace a znalosti.

**Stack:** Next.js · TypeScript · Tailwind · Vercel AI SDK · Gemini (free tier) nebo Claude – přepíná se `ai.provider` v `client.config.ts`

## Co umí

- Plovoucí chat widget, který se na **jakýkoli web** (Next.js, WordPress, Webnode…) vloží jedním `<script>`
- Odpovídá **jen ze znalostní báze** (`/knowledge/*.md`), nevymýšlí si. Když neví, nabídne kontakt.
- Čeština výchozí, angličtina připravená (přepínač CS/EN v hlavičce, bot odpovídá jazykem uživatele)
- **Hlas CS/EN**: mikrofon (diktování) a čtení odpovědí nahlas, zdarma přes prohlížeč (Chrome, Edge, Safari). Když se uživatel zeptá hlasem, odpověď se přečte nahlas.
- **Ví, kolik je hodin**: bot dostává aktuální datum a čas (`timezone` v configu), takže umí odpovědět na „máte teď otevřeno?“
- Streaming odpovědí, navrhované otázky, plně responzivní (na mobilu fullscreen)
- Historie drží v rámci záložky (přežije přechod mezi stránkami webu), na server se **nic neukládá**
- Ochrana: povolené domény, rate limit podle IP, limit délky zprávy a historie
- Prompt caching → znalostní báze se neúčtuje celá při každé zprávě
- **Demo režim** bez API klíče (UI jde testovat hned)

## Profily (víc firem v jednom nasazení)

V `client.config.ts` je objekt `profiles` (teď `restaurace` a `tpd`). Každý profil má vlastní název, barvy, kontakt, uvítání a znalosti v `knowledge/<id>/`. Na webu se vybírá přes `data-profile="tpd"`. Na demo stránce se mezi profily přepíná nahoře.

Pro ostrého zákazníka: nech jeden profil a nastav ho jako `defaultProfile`.

## Nový zákazník – checklist

1. [ ] Na GitHubu **Use this template** → nové repo (např. `chatbot-rohozec`)
2. [ ] Naklonovat:
   ```bash
   mkdir -p ~/Weby && cd ~/Weby
   git clone https://github.com/YongChen2/chatbot-NAZEV.git chatbot-NAZEV
   cd chatbot-NAZEV && npm install
   ```
3. [ ] V **`client.config.ts`** upravit/přidat profil: název, popis, barvy, logo, kontakt, uvítání, navrhované otázky; `allowedOrigins` (domény webu zákazníka)
4. [ ] Podklady zákazníka do **`/knowledge/<id-profilu>`** (otevírací doba, ceník, menu, FAQ…). Libovolný počet `.md` souborů.
5. [ ] Lokálně otestovat: `cp .env.example .env.local`, doplnit klíč, `npm run dev` → http://localhost:3000
6. [ ] Vercel → Add New Project → import repa → Environment Variables: `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini) nebo `ANTHROPIC_API_KEY` (Claude)
7. [ ] Na web zákazníka vložit před `</body>`:
   ```html
   <script src="https://chatbot-NAZEV.vercel.app/widget.js" data-profile="ID" defer></script>
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
knowledge/<profil>/   ← znalosti každého profilu (*.md)
locales/index.ts      ← texty UI (cs, en)
app/api/chat/         ← AI endpoint (limity, origin, rate limit)
app/widget.js/        ← vkládací skript (generuje se z configu)
app/embed/            ← samotný chat (běží v iframe)
components/Chat.tsx   ← UI chatu
lib/knowledge.ts      ← system prompt + načtení znalostí
lib/security.ts       ← povolené domény, rate limit
```

## Testovací web

Kořenová stránka nasazeného bota (`https://chatbot-NAZEV.vercel.app/`) je demo s widgetem, kde se dá vše vyzkoušet ještě před vložením na web zákazníka. Samotný chat přes celou obrazovku je na `/embed`.

## Automatický push (Mac)

`~/Weby/chatbot-autopush.command`: dvojklik spustí Terminál, který každých 10 s pushne nové commity na GitHub. Vercel pak sám nasadí.

## Náklady

- Vercel: Hobby / Pro (podle zákazníka)
- Gemini: free tier na testy a malé weby (limity požadavků; data z free tieru může Google použít ke zlepšení produktů – pro ostrý provoz u zákazníka doporučeno placené API).
- Claude API: platí se za tokeny. Doporučení: **samostatný workspace a klíč pro každého zákazníka** v console.anthropic.com → přehled nákladů per klient, snadné přefakturování, nastavitelný měsíční limit.

## Další kroky (roadmap)

- [ ] Sběr poptávek (jméno, e-mail, telefon → e-mail přes Resend)
- [ ] Trvalý rate limit přes Upstash Redis (pro weby s velkým provozem)
- [ ] RAG pro velké dokumenty (desítky stran)
- [ ] Statistiky nejčastějších dotazů
