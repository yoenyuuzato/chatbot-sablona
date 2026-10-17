import { connection } from "next/server";
import { listProfiles, toPublic } from "@/lib/profiles";
import { PageHeader } from "../ui";
import { Simulator } from "./simulator";

export const metadata = { title: "Simulátor" };

export default async function SimulatePage({ searchParams }: PageProps<"/admin/simulate">) {
  await connection();
  const { profile } = await searchParams;
  const list = await listProfiles({ fresh: true });
  const options = list.map((p) => ({ ...toPublic(p), active: p.active }));
  const initial = typeof profile === "string" && list.some((p) => p.id === profile) ? profile : (list[0]?.id ?? "");

  return (
    <>
      <PageHeader title="Simulátor" />
      <p className="mb-4 text-sm text-neutral-600">
        Testovací chat s vybraným profilem – vždy s aktuálními znalostmi, funguje i pro neaktivní profily. Nezapočítává se do
        statistik a nic se neukládá.
      </p>
      {options.length ? <Simulator profiles={options} initial={initial} /> : <p className="text-sm text-neutral-500">Žádné profily.</p>}
    </>
  );
}
