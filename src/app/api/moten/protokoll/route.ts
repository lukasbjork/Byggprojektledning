import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_MODEL, BYGG_SYSTEM_PROMPT, getAnthropicClient, hasAnthropicKey } from "@/lib/ai";
import { meetingTypeLabels } from "@/lib/labels";
import { ATGARDER_MARKER } from "@/lib/protokoll";

export const maxDuration = 120;

function buildPrompt(meeting: {
  title: string;
  type: keyof typeof meetingTypeLabels;
  date: Date;
  participants: string | null;
  projectName: string;
  projectNumber: string;
  rawNotes: string;
}): string {
  const datum = meeting.date.toLocaleDateString("sv-SE");
  return `Nedan följer råa mötesanteckningar (eller ett transkript) från ett möte. Skapa utifrån dem:

1. Ett strukturerat mötesprotokoll i Markdown enligt svensk byggmötesstandard med rubrikerna:
   - Närvarande
   - Föregående protokoll
   - Beslut
   - Informationspunkter
   - Nästa möte
   Börja protokollet med en rubrik på nivå 1 och en kort metarad (projekt, mötestyp, datum). Numrera beslut och informationspunkter (t.ex. 3.1, 3.2). Om information saknas för en rubrik, skriv "Inget att rapportera." — hitta inte på innehåll.

2. En åtgärdslista i JSON. Skriv EFTER protokollet en rad med exakt texten ${ATGARDER_MARKER} och därefter ENDAST en JSON-array (ingen kodblocksmarkering) med objekt:
   {"title": "...", "description": "..." eller null, "responsible": "namn" eller null, "deadline": "ÅÅÅÅ-MM-DD" eller null}
   Ta bara med åtgärder som faktiskt framgår av anteckningarna. Föreslå ansvarig utifrån vem som nämns; föreslå rimlig deadline om en tidpunkt nämns eller kan härledas, annars null. Om inga åtgärder framgår: tom array [].

Mötesuppgifter:
- Projekt: ${meeting.projectName} (${meeting.projectNumber})
- Möte: ${meeting.title} (${meetingTypeLabels[meeting.type]})
- Datum: ${datum}
- Deltagare enligt kallelsen: ${meeting.participants || "ej angivet"}
- Dagens datum: ${new Date().toLocaleDateString("sv-SE")}

Råa anteckningar:
"""
${meeting.rawNotes}
"""`;
}

export async function POST(request: NextRequest) {
  if (!hasAnthropicKey()) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY saknas. Lägg in din API-nyckel i .env (lokalt) och i Netlifys miljövariabler, och försök igen. Dina anteckningar är sparade.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { meetingId?: string } | null;
  if (!body?.meetingId) {
    return NextResponse.json({ error: "meetingId saknas." }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: body.meetingId },
    include: { project: { select: { name: true, projectNumber: true } } },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Mötet hittades inte." }, { status: 404 });
  }
  if (!meeting.rawNotes?.trim()) {
    return NextResponse.json(
      { error: "Klistra in mötesanteckningar innan du genererar protokoll." },
      { status: 400 }
    );
  }

  const client = getAnthropicClient();
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 8000,
    system: BYGG_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildPrompt({
          title: meeting.title,
          type: meeting.type,
          date: meeting.date,
          participants: meeting.participants,
          projectName: meeting.project.name,
          projectNumber: meeting.project.projectNumber,
          rawNotes: meeting.rawNotes,
        }),
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        // Avbryt streamen — klienten visar felmeddelande och behåller texten
        controller.error(e);
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
