"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AI_MISSING_KEY_MESSAGE,
  BYGG_SYSTEM_PROMPT,
  generateAIText,
  hasAIKey,
} from "@/lib/ai";
import { documentCategoryLabels } from "@/lib/labels";

export interface FormState {
  error?: string;
}

function revalidateDocs(projectId: string) {
  revalidatePath("/dokument");
  revalidatePath(`/projekt/${projectId}`);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.delete({ where: { id: documentId } });
  await prisma.activityLog.create({
    data: { projectId: doc.projectId, message: `Dokumentet ”${doc.name}” togs bort` },
  });
  revalidateDocs(doc.projectId);
}

// ===== Checklista: obligatoriska handlingar =====

const requiredDocSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "Ange handlingens namn."),
});

export async function createRequiredDocument(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = requiredDocSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  await prisma.requiredDocument.create({
    data: { projectId: parsed.data.projectId, name: parsed.data.name },
  });
  revalidateDocs(parsed.data.projectId);
  return {};
}

export async function toggleRequiredDocument(id: string, fulfilled: boolean): Promise<void> {
  const doc = await prisma.requiredDocument.update({ where: { id }, data: { fulfilled } });
  revalidateDocs(doc.projectId);
}

export async function deleteRequiredDocument(id: string): Promise<void> {
  const doc = await prisma.requiredDocument.delete({ where: { id } });
  revalidateDocs(doc.projectId);
}

// ===== AI: föreslå kategori + sammanfattning =====

export interface CategorizeResult {
  error?: string;
  category?: DocumentCategory;
  summary?: string;
}

const CATEGORIES = Object.keys(documentCategoryLabels) as DocumentCategory[];

/**
 * Skickar inklistrad dokumenttext till AI:n som föreslår kategori och en
 * kort sammanfattning. Resultatet sparas som metadata på dokumentet.
 */
export async function aiCategorizeDocument(
  documentId: string,
  text: string
): Promise<CategorizeResult> {
  if (!hasAIKey()) {
    return { error: AI_MISSING_KEY_MESSAGE };
  }
  if (!text.trim()) {
    return { error: "Klistra in textinnehåll från dokumentet först." };
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { error: "Dokumentet hittades inte." };

  try {
    const answer = await generateAIText({
      system: BYGG_SYSTEM_PROMPT,
      maxTokens: 600,
      messages: [
        {
          role: "user",
          content: `Nedan följer textinnehåll från ett dokument i ett byggprojekt (filnamn: ${doc.name}).

Svara med EXAKT två rader:
KATEGORI: <en av ${CATEGORIES.join(", ")}>
SAMMANFATTNING: <2–3 meningar på svenska som sammanfattar dokumentet>

Dokumenttext:
"""
${text.slice(0, 12_000)}
"""`,
        },
      ],
    });
    const categoryMatch = answer.match(/KATEGORI:\s*([A-ZÅÄÖ_]+)/i);
    const summaryMatch = answer.match(/SAMMANFATTNING:\s*([\s\S]+)/i);
    const category = CATEGORIES.find(
      (c) => c === (categoryMatch?.[1] ?? "").toUpperCase().trim()
    );
    const summary = summaryMatch?.[1]?.trim();

    if (!category && !summary) {
      return { error: "Kunde inte tolka AI-svaret. Försök igen." };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(category ? { category } : {}),
        ...(summary ? { summary } : {}),
      },
    });
    revalidateDocs(doc.projectId);
    return { category, summary };
  } catch (e) {
    return {
      error: e instanceof Error ? `AI-anropet misslyckades: ${e.message}` : "AI-anropet misslyckades.",
    };
  }
}
