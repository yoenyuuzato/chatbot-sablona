import { clientConfig } from "@/client.config";
import { dictionaries } from "@/locales";

/**
 * Vkládací skript pro web zákazníka:
 * <script src="https://TVUJ-BOT.vercel.app/widget.js" defer></script>
 * Volitelně: data-lang="en", data-position="left"
 */
export function GET() {
  const cfg = {
    primary: clientConfig.theme.primary,
    primaryText: clientConfig.theme.primaryText,
    position: clientConfig.position,
    locales: clientConfig.locales,
    labels: Object.fromEntries(
      clientConfig.locales.map((l) => [l, { open: dictionaries[l].openChat, close: dictionaries[l].closeChat }]),
    ),
  };

  const js = `(function () {
  if (window.__chatbotLoaded) return;
  window.__chatbotLoaded = true;
  var CFG = ${JSON.stringify(cfg)};
  var script = document.currentScript || document.querySelector('script[src*="/widget.js"]');
  var BASE = new URL(script.src).origin;
  var lang = (script.getAttribute("data-lang") || (navigator.language || "").slice(0, 2)).toLowerCase();
  if (CFG.locales.indexOf(lang) === -1) lang = CFG.locales[0];
  var side = script.getAttribute("data-position") || CFG.position;
  var L = CFG.labels[lang];

  var css = ".cbw-btn{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;background:" + CFG.primary + ";color:" + CFG.primaryText + ";box-shadow:0 8px 24px rgba(0,0,0,.22);display:grid;place-items:center;transition:transform .2s ease,box-shadow .2s ease;padding:0}" +
    ".cbw-btn:hover{transform:scale(1.06);box-shadow:0 10px 30px rgba(0,0,0,.28)}" +
    ".cbw-btn svg{width:28px;height:28px;transition:transform .25s ease,opacity .2s}" +
    ".cbw-btn .cbw-x{position:absolute;opacity:0;transform:rotate(-90deg)}" +
    ".cbw-open .cbw-btn .cbw-ic{opacity:0;transform:rotate(90deg)}.cbw-open .cbw-btn .cbw-x{opacity:1;transform:rotate(0)}" +
    ".cbw-panel{position:fixed;bottom:92px;" + side + ":20px;z-index:2147483001;width:380px;height:min(640px,calc(100vh - 116px));border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.22);background:#fff;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .2s ease,transform .2s ease}" +
    ".cbw-open .cbw-panel{opacity:1;transform:none;pointer-events:auto}" +
    ".cbw-panel iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:520px){.cbw-panel{inset:0;width:100%;height:100%;border-radius:0;bottom:0}.cbw-open .cbw-btn{display:none}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.className = "cbw-root";
  root.innerHTML =
    '<div class="cbw-panel" role="dialog" aria-label="Chat"></div>' +
    '<button class="cbw-btn" type="button" aria-label="' + L.open + '" aria-expanded="false">' +
    '<svg class="cbw-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>' +
    '<svg class="cbw-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    "</button>";
  document.body.appendChild(root);

  var panel = root.querySelector(".cbw-panel");
  var btn = root.querySelector(".cbw-btn");
  var loaded = false;

  function setOpen(open) {
    if (open && !loaded) {
      var f = document.createElement("iframe");
      f.src = BASE + "/embed#lang=" + lang;
      f.title = "Chat";
      f.allow = "clipboard-write";
      panel.appendChild(f);
      loaded = true;
    }
    root.classList.toggle("cbw-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? L.close : L.open);
  }

  btn.addEventListener("click", function () { setOpen(!root.classList.contains("cbw-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  window.addEventListener("message", function (e) {
    if (e.origin === BASE && e.data && e.data.type === "chatbot:close") setOpen(false);
  });
  window.ChatbotWidget = { open: function () { setOpen(true); }, close: function () { setOpen(false); } };
})();`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
