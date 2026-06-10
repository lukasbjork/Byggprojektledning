import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_MODEL, BYGG_SYSTEM_PROMPT, getAnthropicClient, hasAnthropicKey } from "@/lib/ai";
import { buildProjectContext } from "@/lib/project-context";

export const maxDuration = 120;

/** Streamar ett AI-genererat rapportutkast (vecko- eller månadsrapport). */
export async function POST(request: NextRequest) {
  if (!hasAnthropicKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY saknas. Lägg in din API-nyckel och försök igen." },
      { status: 503 }
    );
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

  const client = getAnthropicClient();
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 6000,
    system: BYGG_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
