import { connection } from "next/server";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { knowledge } from "@/lib/db/schema";
import { getProfileById } from "@/lib/profiles";
import { deleteProfileAction, importConfigProfileAction, toggleProfileAction } from "../../../actions";
import { ConfirmButton } from "../../confirm-button";
import { ActiveBadge, NoDb, PageHeader, SourceBadge, Swatch } from "../../ui";
import { ProfileForm } from "../profile-form";
import { toFormValues } from "../profile-values";
import { EmbedCode } from "./embed-code";

/** Veřejná adresa bota (pro vkládací kód). */
async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function EditProfilePage({ params, searchParams }: PageProps<"/admin/profiles/[id]">) {
  await connection();
  if (!hasDb()) return <NoDb />;
  const { id } = await params;
  const { created } = await searchParams;
  const profile = await getProfileById(id, { fresh: true });
  if (!profile) notFound();
  const base = await baseUrl();

  if (profile.source === "config") {
    return (
      <>
        <PageHeader title={profile.companyName} />
        <div className="card space-y-3 text-sm">
          <p>
            Profil <code>{profile.id}</code> je zatím jen v <code>client.config.ts</code> a <code>knowledge/{profile.id}/</code>.
            Pro úpravy v adminu ho zkopírujte do databáze (soubory zůstanou jako záloha).
          </p>
          <form action={importConfigProfileAction}>
            <input type="hidden" name="id" value={profile.id} />
            <button className="btn">Importovat do databáze</button>
          </form>
        </div>
      </>
    );
  }

  const [{ n: blocks }] = await getDb().select({ n: count() }).from(knowledge).where(eq(knowledge.profileId, id));

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Swatch profile={profile} />
            {profile.companyName} <ActiveBadge active={profile.active} /> <SourceBadge source={profile.source} />
          </span>
        }
      >
        <Link href={`/admin/profiles/${id}/knowledge`} className="btn">
          Znalosti ({blocks})
        </Link>
        <Link href={`/admin/simulate?profile=${id}`} className="btn-secondary">
          Simulátor
        </Link>
        <a href={`/embed#profile=${id}`} target="_blank" rel="noreferrer" className="btn-secondary">
          Náhled ↗
        </a>
        <form action={toggleProfileAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={String(profile.active)} />
          <button className="btn-secondary">{profile.active ? "Deaktivovat" : "Aktivovat"}</button>
        </form>
        <form action={deleteProfileAction}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton message={`Opravdu smazat profil „${profile.companyName}“ včetně všech znalostí a jejich historie? Nejde vrátit.`}>
            Smazat
          </ConfirmButton>
        </form>
      </PageHeader>

      {created && (
        <div className="card mb-6 border-green-200 bg-green-50 text-sm text-green-900">
          Profil vytvořen. Další krok: přidejte{" "}
          <Link href={`/admin/profiles/${id}/knowledge`} className="font-medium underline">
            znalosti
          </Link>{" "}
          (Markdown nebo „Načíst z webu“), vyzkoušejte v simulátoru a vložte embed kód na web.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProfileForm key={profile.id} initial={toFormValues(profile)} mode="edit" />
        <aside className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">Vložení na web</h2>
            <EmbedCode base={base} id={id} />
          </section>
          <section className="card text-sm">
            <h2 className="mb-2 font-semibold">Náhled</h2>
            <p className="text-neutral-600">
              Chat přes celou obrazovku:{" "}
              <a href={`/embed#profile=${id}`} target="_blank" rel="noreferrer" className="font-mono underline">
                /embed#profile={id}
              </a>
            </p>
            <p className="hint">Neaktivní profil se v náhledu ani na webu nezobrazí – testujte v Simulátoru.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
