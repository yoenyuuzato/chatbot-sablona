import { connection } from "next/server";
import { resolveProfile, toPublic } from "@/lib/profiles";

/** Veřejná data profilu pro chat v iframe (/embed). Neznámé ID → výchozí profil, neaktivní → 404. */
export async function GET(_req: Request, ctx: RouteContext<"/api/profiles/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const profile = await resolveProfile(id);
  if (!profile || !profile.active) return Response.json({ error: "profile_inactive" }, { status: 404 });
  return Response.json(toPublic(profile), { headers: { "Cache-Control": "no-store" } });
}
