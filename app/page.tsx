import Script from "next/script";
import { clientConfig } from "@/client.config";

/** Demo stránka: ukázka widgetu + návod na vložení. Zákazník ji neuvidí, slouží tobě. */
export default function Home() {
  const snippet = `<script src="https://VAS-BOT.vercel.app/widget.js" defer></script>`;
  return (
    <main className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: clientConfig.theme.primary }}>
        Demo AI asistenta
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{clientConfig.companyName}</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-[var(--muted)]">
        Takhle bude chatbot vypadat na webu zákazníka. Klikni na bublinu vpravo dole a zeptej se třeba na otevírací
        dobu nebo menu. Odpovědi se berou jen ze složky <code>/knowledge</code>.
      </p>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Vložení na web zákazníka</h2>
        <p className="mt-2 text-[var(--muted)]">Jeden řádek před koncem <code>&lt;/body&gt;</code>:</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#1b1b1a] p-4 text-sm text-[#f6f5f2]">
          <code>{snippet}</code>
        </pre>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[15px] text-[var(--muted)]">
          <li>
            <code>data-lang=&quot;en&quot;</code> – vynutí jazyk
          </li>
          <li>
            <code>data-position=&quot;left&quot;</code> – bublina vlevo
          </li>
          <li>
            <code>window.ChatbotWidget.open()</code> – otevření chatu z vlastního tlačítka
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Nový zákazník – checklist</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px] text-[var(--muted)]">
          <li>„Use this template“ na GitHubu → nové repo</li>
          <li>
            Upravit <code>client.config.ts</code> (název, barvy, kontakt, domény)
          </li>
          <li>
            Nahradit soubory v <code>/knowledge</code> údaji zákazníka
          </li>
          <li>
            Import na Vercel + nastavit <code>ANTHROPIC_API_KEY</code>
          </li>
          <li>Vložit skript na web zákazníka</li>
        </ol>
      </section>

      <Script src="/widget.js" strategy="afterInteractive" />
    </main>
  );
}
