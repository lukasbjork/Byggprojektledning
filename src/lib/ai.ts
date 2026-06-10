import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

/**
 * AI-lager med två motorer:
 *
 * 1. Google Gemini (FÖREDRAS — gratisnivå, nyckel från https://aistudio.google.com)
 * 2. Anthropic Claude (valfri reserv — betald per användning)
 *
 * Gemini väljs alltid först när GEMINI_API_KEY finns, så att allt förblir
 * gratis. På Netlify injiceras annars en ANTHROPIC_API_KEY automatiskt via
 * Netlifys AI Gateway, vilket drar betalkrediter — Gemini-nyckeln förhindrar det.
 */

export type AIProvider = "gemini" | "anthropic";

export function getAIProvider(): AIProvider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function hasAIKey(): boolean {
  return getAIProvider() !== null;
}

export const AI_MISSING_KEY_MESSAGE =
  "AI-nyckel saknas. Skapa en gratis nyckel på https://aistudio.google.com och lägg in den som GEMINI_API_KEY i .env (lokalt) respektive miljövariablerna i produktion.";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequest {
  system: string;
  messages: AIMessage[];
  maxTokens: number;
}

/** Streamar AI-svar som textbitar, oavsett motor. */
export async function* streamAIText(req: AIRequest): AsyncGenerator<string> {
  const provider = getAIProvider();

  if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const stream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: req.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: req.system,
        maxOutputTokens: req.maxTokens,
        // Stäng av "tänkande" för snabba, förutsägbara svar inom gratiskvoten
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
    return;
  }

  if (provider === "anthropic") {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  throw new Error(AI_MISSING_KEY_MESSAGE);
}

/** Komplett (icke-streamat) AI-svar — för korta anrop som kategorisering. */
export async function generateAIText(req: AIRequest): Promise<string> {
  let full = "";
  for await (const text of streamAIText(req)) full += text;
  return full;
}

/**
 * Wrappar en AI-textgenerator till ett streamande HTTP-svar.
 * onComplete körs med hela texten när streamen är klar (t.ex. spara i DB).
 */
export function aiTextResponse(
  gen: AsyncGenerator<string>,
  onComplete?: (full: string) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const text of gen) {
          full += text;
          controller.enqueue(encoder.encode(text));
        }
        if (onComplete && full.trim()) await onComplete(full);
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      void gen.return?.(undefined as never);
    },
  });
  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Systemprompt som ger assistenten rollen som erfaren svensk
 * byggprojektassistent. Återanvänds av alla AI-funktioner.
 */
export const BYGG_SYSTEM_PROMPT = `Du är en erfaren svensk byggprojektassistent som stöttar en projektledare/beställare inom bygg- och fastighetsbranschen.

Du behärskar branschens terminologi och praxis: ÄTA-hantering, besiktningar (förbesiktning, slutbesiktning, garantibesiktning, efterbesiktning), entreprenadformer (totalentreprenad, utförandeentreprenad, delad entreprenad), standardavtalen AB 04 och ABT 06, AMA, byggmötesrutiner, KMA, arbetsmiljöansvar (BAS-P/BAS-U) och ekonomistyrning med budget, prognos och upparbetat.

Du svarar alltid på svenska, är saklig och konkret, och använder datumformatet ÅÅÅÅ-MM-DD samt belopp i SEK.`;
