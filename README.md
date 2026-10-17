# Chatbot šablona

Univerzální AI chatbot pro weby zákazníků. Jedna šablona → pro každého zákazníka klon + vlastní konfigurace a znalosti.

**Stack:** Next.js · TypeScript · Tailwind · Vercel AI SDK · Gemini (free tier) nebo Claude – přepíná se `ai.provider` v `client.config.ts`

## Co umí

- Plovoucí chat widget, který se na **jakýkoli web** (Next.js, WordPress, Webnode…) vloží jedním `<script>`
- Odpovídá **jen ze znalostní báze** (`/knowledge/*.md`), nevymýšlí si. Když neví, nabídne kontakt.
- Čeština výchozí, angličtina připravená (přepínač CS/EN v hlavičce, bot odpovídá jazykem uživatele)
- **Hlas CS/EN**: mikrofon (diktování) a čtení odpovědí nahlas **přirozeným neuronovým hlasem (Gemini TTS)**, každý profil může mít vlastní hlas (`voice` v profilu). Při limitu/chybě se automaticky použije hlas prohlížeče. Když se uživatel zeptá hlasem, odpověď se přečte nahlas.
- **Ví, kolik je hodin**: bot dostává aktuální datum a čas (`timezone` v configu), takže umí odpovědět na „máte teď otevřeno?“
- Streaming odpovědí, navrhované otázky, plně responzivní (na mobilu fullscreen)
- Historie drží v rámci záložky (přežije přechod mezi stránkami webu), na server se **nic neukládá**
- Ochrana: povolené domény, rate limit podle IP, limit délky zprávy a historie
- Prompt caching → znalostní báze se neúčtuje celá při každé zprávě
- **Demo režim** bez API klíče (UI jde testovat hned)

## Admin a přidání nového zákazníka

Profily zákazníků (texty, barvy, hlas, domény) a jejich znalosti se spravují v **`/admin`** – bez úprav kódu. Data jsou v Neon Postgres. Když databáze není nastavená nebo profil v ní chybí, použije se záložně `client.config.ts` + `knowledge/<id>/`.

### Jednorázové nastavení (jednou pro celé nasazení)

1. **Databáze:** Vercel → projekt → *Storage* → *Create Database* → **Neon** (free) → připojit k projektu. Tím se nastaví `DATABASE_URL`.
2. **Proměnné prostředí** (Vercel → Settings → Environment Variables), viz `.env.example`:
   - `ADMIN_PASSWORD` – heslo do adminu (dlouhé, náhodné)
   - `KNOWLEDGE_API_SECRET` – klíč pro API znalostí (IG bot), např. `openssl rand -hex 32`
   - `NEXT_PUBLIC_SITE_URL` – produkční adresa bota pro embed kód (např. `https://chatbot-sablona.vercel.app` nebo vlastní doména). Bez ní se použije `https://chatbot-sablona.vercel.app`; nikdy se nepoužije adresa konkrétního deploye.
   - (volitelně) `ADMIN_SESSION_SECRET` – podpis cookie; jinak se použije heslo
3. **Redeploy.** Migrace databáze se spustí samy při buildu (`npm run build` = `db:migrate` + `next build`).
4. **Import současných profilů** (restaurace, tpd) – lokálně s `DATABASE_URL` v `.env.local`:
   ```bash
   npm run import-profiles            # idempotentní, existující přeskočí
   npm run import-profiles -- --force # přepíše DB obsahem z client.config.ts a knowledge/
   ```
   Případně v adminu u profilu tlačítko **Importovat do DB**.

### Nový zákazník krok za krokem

1. Otevřít `https://TVUJ-BOT.vercel.app/admin` a přihlásit se heslem.
2. **Profily → Nový profil:** ID (slug, např. `kavarna-u-mostu` – je ve vkládacím kódu, později nejde změnit), název, popis, tón, případně *Pokyny pro AI*, uvítání a navrhované otázky (cs/en), barvy, hlas, kontakt.
3. **Povolené domény:** web zákazníka s `https://` i s `www` (např. `https://kavarna.cz`, `https://www.kavarna.cz`). Prázdný seznam = widget půjde vložit kamkoli.
4. **Znalosti:** bloky Markdownu (otevírací doba, menu, ceník, FAQ…). Rychlý start: **Načíst z webu** → zadat URL → stáhne až 10 podstránek ze stejné domény → projít náhled, smazat zbytečnosti → *Potvrdit a uložit*. Bloky jde přeřadit, upravit, smazat; každá změna jde do historie a jde **vrátit**.
5. **Simulátor:** vyzkoušet otázky zákazníků (funguje i pro neaktivní profil, nepočítá se do statistik).
6. **Kopírovat embed kód** (záložka *Embed kód* nebo stránka profilu) a vložit na web zákazníka před `</body>` – návod pro HTML/WordPress i Next.js je přímo u kódu. Náhled chatu: `/embed#profile=ID`.
7. Hotovo. Změny v adminu se na webech projeví do 1 minuty (cache 60 s). **Deaktivace** profilu = widget se na webu nezobrazí (vkládací skript je v CDN cache max. 1 h).

### Přehled a statistiky

Na úvodní stránce adminu: počet profilů, aktivních profilů, zprávy za 24 h a celkem, pod tím tabulka za 30 dní po profilech (konverzace, zprávy, „vytížený“ chyby). Ukládají se **jen hodinové počty**, nikdy obsah konverzací.

### API znalostí pro IG bota

```bash
curl -H "Authorization: Bearer $KNOWLEDGE_API_SECRET" https://TVUJ-BOT.vercel.app/api/profiles/tpd/knowledge
# JSON: { id, name, description, tone, system_prompt, active, knowledge_md }
# ?format=md → vše jako jeden Markdown
```
Bez správného klíče vrací `401`.

## Profily (víc firem v jednom nasazení)

Primárně se profily spravují v `/admin` (viz výše). `client.config.ts` slouží jako výchozí/záložní konfigurace: je v něm objekt `profiles` (teď `restaurace` a `tpd`). Každý profil má vlastní název, barvy, kontakt, uvítání a znalosti v `knowledge/<id>/`. Na webu se vybírá přes `data-profile="tpd"`. Na demo stránce se mezi profily přepíná nahoře.

Pro ostrého zákazníka: nech jeden profil a nastav ho jako `defaultProfile`.

## Samostatné nasazení pro zákazníka (klon šablony)

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
client.config.ts      ← výchozí/záložní profily + globální nastavení (AI, hlas, limity)
knowledge/<profil>/   ← záložní znalosti profilů mimo DB (*.md)
locales/index.ts      ← texty UI (cs, en)
app/admin/            ← administrace (profily, znalosti, simulátor, přehled)
app/api/chat/         ← AI endpoint (limity, origin, rate limit, statistiky)
app/api/profiles/     ← veřejná data profilu pro widget + API znalostí pro IG bota
app/widget.js/        ← vkládací skript (profily z DB)
app/embed/            ← samotný chat (běží v iframe)
components/Chat.tsx   ← UI chatu
lib/profiles.ts       ← načítání profilů: DB (cache 60 s) → client.config.ts
lib/knowledge.ts      ← system prompt + načtení znalostí ze souborů
lib/db/schema.ts      ← tabulky (profiles, knowledge, knowledge_history, stats); migrace v drizzle/
lib/security.ts       ← povolené domény, rate limit
proxy.ts              ← přihlášení do adminu, CSP frame-ancestors pro /embed
```

## Testovací web

Kořenová stránka (`/`) přesměruje do administrace (`/admin`, přihlášení heslem). Veřejné demo s přepínačem profilů a widgetem je na **`/demo`** – tam se dá vše vyzkoušet ještě před vložením na web zákazníka. Samotný chat přes celou obrazovku je na `/embed`.

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
- [ ] Statistiky nejčastějších dotazů (anonymně, bez obsahu konverzací)
