import { connection } from "next/server";
import { listProfiles, toPublic } from "@/lib/profiles";

/** Veřejný seznam aktivních profilů (demo stránka). */
export async function GET() {
  await connection();
  const list = (await listProfiles()).filter((p) => p.active).map(toPublic);
  return Response.json(list, { headers: { "Cache-Control": "no-store" } });
}
