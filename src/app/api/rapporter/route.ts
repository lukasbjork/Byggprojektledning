import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AI_MISSING_KEY_MESSAGE,
  BYGG_SYSTEM_PROMPT,
  aiTextResponse,
  hasAIKey,
  streamAIText,
} from "@/lib/ai";
import { buildProjectContext } from "@/lib/project-context";

export const maxDuration = 120;

/** Streamar ett AI-genererat rapportutkast (vecko- eller månadsrapport). */
export async function POST(request: NextRequest) {
  if (!hasAIKey()) {
    return NextResponse.json({ error: AI_MISSING_KEY_MESSAGE }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
    type?: "VECKORAPPORT" | "MANADSRAPPORT";
  } | null;
  if (!body?.projectId || !body.type) {
    return NextResponse.json({ error: "Projekt och rapporttyp krävs." }, { status: 400 });
  }

  const [context, template] = await Promise.all([
    buildProjectContext(body.projectId),
    prisma.reportTemplate.findFirst({ where: { type: body.type } }),
  ]);
  if (!context) {
    return NextResponse.json({ error: "Projektet hittades inte." }, { status: 404 });
  }

  // Periodspecifik data: avslutade åtgärder och nya ÄTA under perioden
  const days = body.type === "VECKORAPPORT" ? 7 : 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const [completedActions, newAtas] = await Promise.all([
    prisma.actionItem.findMany({
      where: { projectId: body.projectId, status: "KLAR", completedAt: { gte: since } },
      select: { title: true, responsible: true },
    }),
    prisma.changeOrder.findMany({
      where: { projectId: body.projectId, createdAt: { gte: since } },
      select: { number: true, title: true, status: true, amount: true },
    }),
  ]);

  const periodLines: string[] = [
    `PERIOD: senaste ${days} dagarna (rapportdatum ${new Date().toLocaleDateString("sv-SE")})`,
  ];
  if (completedActions.length > 0) {
    periodLines.push("Avslutade åtgärder under perioden:");
    for (const a of completedActions) {
      periodLines.push(`- ${a.title}${a.responsible ? ` (${a.responsible})` : ""}`);
    }
  } else {
    periodLines.push("Inga åtgärder avslutades under perioden.");
  }
  if (newAtas.length > 0) {
    periodLines.push("Nya ÄTA under perioden:");
    for (const a of newAtas) {
      periodLines.push(
        `- ÄTA ${a.number} ${a.title} (${a.status}, ${Math.round(Number(a.amount)).toLocaleString("sv-SE")} kr)`
      );
    }
  } else {
    periodLines.push("Inga nya ÄTA under perioden.");
  }

  const typeLabel = body.type === "VECKORAPPORT" ? "veckorapport" : "månadsrapport";
  const prompt = `Skriv en ${typeLabel} i Markdown utifrån projektdatan nedan.

Följ rubrikstrukturen och tonen i mallen nedan. Ersätt platshållare som [Projektnamn] med riktiga värden. Hitta inte på information som inte framgår av datan — skriv "Inget att rapportera" där underlag saknas. Svara ENDAST med rapporten, ingen inledning.

MALL:
"""
${template?.content ?? "# Rapport\n\nFri struktur."}
"""

${periodLines.join("\n")}

${context}`;

  const gen = streamAIText({
    system: BYGG_SYSTEM_PROMPT,
    maxTokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });

  return aiTextResponse(gen);
}
