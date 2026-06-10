"use server";

import { revalidatePath } from "next/cache";
import type { ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_TEMPLATES: Record<ReportType, { name: string; content: string }> = {
  VECKORAPPORT: {
    name: "Veckorapport",
    content: `# Veckorapport – [Projektnamn] v.[vecka]

## Sammanfattning av läget
## Framdrift och milstolpar
## Ekonomi (budget / utfall / prognos)
## Åtgärder – avslutade och öppna
## Nya ÄTA
## Risker och avvikelser
## Fokus kommande vecka

Ton: saklig och kortfattad, riktad till projektorganisationen. Punktlistor hellre än långa stycken.`,
  },
  MANADSRAPPORT: {
    name: "Månadsrapport",
    content: `# Månadsrapport – [Projektnamn] [månad år]

## Sammanfattning för ledning och beställare
## Övergripande status och framdrift
## Ekonomi (budget / utfall / prognos)
## Väsentliga ÄTA och beslut
## Risker
## Plan för kommande månad

Ton: sammanfattande och professionell, riktad till ledning/beställare. Lyft det väsentliga, undvik detaljer.`,
  },
};

export async function ensureDefaultTemplates(): Promise<void> {
  const existing = await prisma.reportTemplate.findMany({ select: { type: true } });
  const have = new Set(existing.map((t) => t.type));
  for (const type of Object.keys(DEFAULT_TEMPLATES) as ReportType[]) {
    if (!have.has(type)) {
      await prisma.reportTemplate.create({
        data: { type, name: DEFAULT_TEMPLATES[type].name, content: DEFAULT_TEMPLATES[type].content },
      });
    }
  }
}

export async function saveTemplate(templateId: string, content: string): Promise<void> {
  await prisma.reportTemplate.update({ where: { id: templateId }, data: { content } });
  revalidatePath("/rapporter");
}

export interface SaveReportInput {
  id?: string;
  projectId: string;
  type: ReportType;
  title: string;
  content: string;
}

/** Sparar en rapport (nytt utkast → sparad, eller uppdatering av befintlig). */
export async function saveReport(input: SaveReportInput): Promise<string> {
  let id: string;
  if (input.id) {
    const report = await prisma.report.update({
      where: { id: input.id },
      data: { title: input.title, content: input.content, status: "SPARAD" },
    });
    id = report.id;
  } else {
    const report = await prisma.report.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        title: input.title,
        content: input.content,
        status: "SPARAD",
        periodEnd: new Date(),
      },
    });
    id = report.id;
    await prisma.activityLog.create({
      data: { projectId: input.projectId, message: `Rapporten ”${input.title}” sparades` },
    });
  }
  revalidatePath("/rapporter");
  return id;
}

export async function deleteReport(reportId: string): Promise<void> {
  const report = await prisma.report.delete({ where: { id: reportId } });
  await prisma.activityLog.create({
    data: { projectId: report.projectId, message: `Rapporten ”${report.title}” togs bort` },
  });
  revalidatePath("/rapporter");
}
