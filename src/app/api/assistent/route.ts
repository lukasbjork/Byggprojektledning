import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_MODEL, BYGG_SYSTEM_PROMPT, getAnthropicClient, hasAnthropicKey } from "@/lib/ai";
import { buildProjectContext, buildPortfolioContext } from "@/lib/project-context";

export const maxDuration = 120;

/**
 * Chatt-endpoint: sparar användarens meddelande, skickar historiken +
 * projektkontext till Claude och streamar svaret. Assistentens svar sparas
 * i databasen när streamen är klar.
 */
export async function POST(request: NextRequest) {
  if (!hasAnthropicKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY saknas. Lägg in din API-nyckel och försök igen." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    conversationId?: string;
    content?: string;
  } | null;
  if (!body?.conversationId || !body.content?.trim()) {
    return NextResponse.json({ error: "Meddelande saknas." }, { status: 400 });
  }
  const content = body.content.trim();

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: body.conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Konversationen hittades inte." }, { status: 404 });
  }

  // Spara användarens meddelande direkt — det får aldrig gå förlorat
  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "USER", content },
  });
  if (conversation.messages.length === 0) {
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { title: content.slice(0, 60) },
    });
  }

  // Projektkontext: valt projekt, annars hela portföljen i kort form
  const context = conversation.projectId
    ? await buildProjectContext(conversation.projectId)
    : await buildPortfolioContext();

  const system = `${BYGG_SYSTEM_PROMPT}

Du har tillgång till aktuell projektdata nedan (hämtad ${new Date().toLocaleDateString("sv-SE")}). Utgå från den när du svarar, och säg ifrån om något du tillfrågas om inte framgår av datan.

${context || "Ingen projektdata tillgänglig."}`;

  const history = [
    ...conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  const client = getAnthropicClient();
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 4000,
    system,
    messages: history,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Spara assistentens svar när streamen är klar
        if (full.trim()) {
          await prisma.chatMessage.create({
            data: { conversationId: conversation.id, role: "ASSISTANT", content: full },
          });
          await prisma.chatConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });
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
