import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "../actions";
import { ActiveNavLink, NavLink } from "./nav-link";

const nav = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/profiles", label: "Profily" },
  { href: "/admin/knowledge", label: "Znalosti" },
  { href: "/admin/embed", label: "Embed kód" },
  { href: "/admin/simulate", label: "Simulátor" },
];

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-semibold">
            Chatbot
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            <Suspense fallback={nav.map((n) => <NavLink key={n.href} href={n.href} label={n.label} />)}>
              {nav.map((n) => (
                <ActiveNavLink key={n.href} href={n.href} label={n.label} />
              ))}
            </Suspense>
            <form action={logoutAction}>
              <button className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100">Odhlásit</button>
            </form>
          </nav>
          {!process.env.DATABASE_URL && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Bez databáze</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Suspense fallback={<p className="text-sm text-neutral-400">Načítám…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
