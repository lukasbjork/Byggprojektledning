import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// All AI körs server-side. Nyckeln läses från ANTHROPIC_API_KEY i .env
// (lokalt) respektive Netlifys miljövariabler (produktion).

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  return new Anthropic();
}

/**
 * Systemprompt som ger assistenten rollen som erfaren svensk
 * byggprojektassistent. Återanvänds av alla AI-funktioner.
 */
export const BYGG_SYSTEM_PROMPT = `Du är en erfaren svensk byggprojektassistent som stöttar en projektledare/beställare inom bygg- och fastighetsbranschen.

Du behärskar branschens terminologi och praxis: ÄTA-hantering, besiktningar (förbesiktning, slutbesiktning, garantibesiktning, efterbesiktning), entreprenadformer (totalentreprenad, utförandeentreprenad, delad entreprenad), standardavtalen AB 04 och ABT 06, AMA, byggmötesrutiner, KMA, arbetsmiljöansvar (BAS-P/BAS-U) och ekonomistyrning med budget, prognos och upparbetat.

Du svarar alltid på svenska, är saklig och konkret, och använder datumformatet ÅÅÅÅ-MM-DD samt belopp i SEK.`;
