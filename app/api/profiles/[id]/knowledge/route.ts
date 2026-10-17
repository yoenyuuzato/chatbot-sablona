import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { getKnowledgeMarkdown, getProfileById } from "@/lib/profiles";

function authorized(req: Request): boolean {
  const secret = process.env.KNOWLEDGE_API_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!secret || !token) return false;
  // porovnání hashů → stejná délka, konstantní čas
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(token), h(secret));
}

/**
 * Znalosti profilu pro IG bota.
 * GET /api/profiles/<id>/knowledge  (Authorization: Bearer <KNOWLEDGE_API_SECRET>)
 * JSON: { id, name, tone, system_prompt, active, updated_at, knowledge_md }. S ?format=md vrátí vše jako jeden Markdown.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/profiles/[id]/knowledge">) {
  await connection();
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  const { id } = await ctx.params;
  const profile = await getProfileById(id, { fresh: true });
  if (!profile) return Response.json({ error: "not_found" }, { status: 404 });
  const knowledgeMd = await getKnowledgeMarkdown(profile, { fresh: true });

  if (new URL(req.url).searchParams.get("format") === "md") {
    const md = [
      `# ${profile.companyName}`,
      profile.companyDescription,
      profile.tone && `**Tón:** ${profile.tone}`,
      profile.systemPrompt && `## Pokyny\n${profile.systemPrompt}`,
      `## Znalosti\n${knowledgeMd}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" } });
  }

  return Response.json(
    {
      id: profile.id,
      name: profile.companyName,
      description: profile.companyDescription,
      tone: profile.tone,
      system_prompt: profile.systemPrompt,
      active: profile.active,
      knowledge_md: knowledgeMd,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
