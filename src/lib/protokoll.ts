// Delat mellan API-routen (server) och protokoll-arbetsytan (klient).

/** Rad som skiljer protokollet (Markdown) från åtgärdsförslagen (JSON) i AI-svaret. */
export const ATGARDER_MARKER = "===ATGARDER_JSON===";

export interface SuggestedAction {
  title: string;
  description: string | null;
  responsible: string | null;
  /** ÅÅÅÅ-MM-DD eller null */
  deadline: string | null;
}

export interface ParsedProtocol {
  protocol: string;
  actions: SuggestedAction[];
  /** true om åtgärdsdelen inte gick att tolka (protokollet är ändå användbart) */
  actionsParseFailed: boolean;
}

/** Delar upp den streamade AI-texten i protokoll + åtgärdsförslag. */
export function parseProtocolResponse(text: string): ParsedProtocol {
  const idx = text.indexOf(ATGARDER_MARKER);
  if (idx === -1) {
    return { protocol: text.trim(), actions: [], actionsParseFailed: true };
  }
  const protocol = text.slice(0, idx).trim();
  let jsonPart = text.slice(idx + ATGARDER_MARKER.length).trim();
  // Tål att modellen trots instruktionen lindar JSON i ett kodblock
  jsonPart = jsonPart.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const raw = JSON.parse(jsonPart) as unknown;
    if (!Array.isArray(raw)) throw new Error("inte en array");
    const actions: SuggestedAction[] = raw
      .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
      .map((a) => ({
        title: typeof a.title === "string" ? a.title : "",
        description: typeof a.description === "string" ? a.description : null,
        responsible: typeof a.responsible === "string" ? a.responsible : null,
        deadline:
          typeof a.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.deadline)
            ? a.deadline
            : null,
      }))
      .filter((a) => a.title.length > 0);
    return { protocol, actions, actionsParseFailed: false };
  } catch {
    return { protocol, actions: [], actionsParseFailed: true };
  }
}
