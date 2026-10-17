"use client";

import { useState } from "react";

function CopyBlock({ label, code, primary = false }: { label: string; code: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <button
          type="button"
          className={primary ? "btn py-1.5" : "btn-secondary"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt("Zkopírujte kód:", code);
            }
          }}
        >
          {copied ? "Zkopírováno ✓" : primary ? "Kopírovat embed kód" : "Kopírovat"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs leading-relaxed text-neutral-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function EmbedCode({ base, id }: { base: string; id: string }) {
  const html = `<script src="${base}/widget.js" data-profile="${id}" defer></script>`;
  const next = `import Script from "next/script";

// app/layout.tsx – uvnitř <body>, za {children}
<Script src="${base}/widget.js" data-profile="${id}" strategy="afterInteractive" />`;

  return (
    <div className="space-y-5">
      <CopyBlock label="HTML / WordPress / Webnode / Shoptet" code={html} primary />
      <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-600">
        <li>
          <strong>Obyčejné HTML:</strong> vložit řádek před <code>&lt;/body&gt;</code> na všech stránkách (nebo do společné patičky).
        </li>
        <li>
          <strong>WordPress:</strong> plugin <em>WPCode</em> (nebo „Insert Headers and Footers“) → Code Snippets → Header &amp;
          Footer → vložit do <em>Footer</em> → uložit. Alternativně v šabloně do <code>footer.php</code> před{" "}
          <code>&lt;/body&gt;</code>.
        </li>
        <li>
          <strong>Webnode / Shoptet / Wix:</strong> nastavení webu → vlastní kód / HTML do patičky.
        </li>
        <li>
          Doménu webu přidat do <em>Povolených domén</em> v profilu (s www i bez), jinak se chat v iframe nenačte.
        </li>
      </ol>
      <CopyBlock label="Next.js (next/script)" code={next} />
      <p className="text-sm text-neutral-600">
        Volitelné atributy: <code>data-lang=&quot;en&quot;</code> (vynutí jazyk), <code>data-position=&quot;left&quot;</code>{" "}
        (bublina vlevo). Z vlastního tlačítka: <code>window.ChatbotWidget.open()</code>.
      </p>
    </div>
  );
}
