"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RiskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error?: string;
}

const riskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Ange en rubrik."),
  probability: z.enum(["LAG", "MEDEL", "HOG"]).default("MEDEL"),
  consequence: z.enum(["LAG", "MEDEL", "HOG"]).default("MEDEL"),
  action: z.string().trim().optional(),
});

export async function saveRisk(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = riskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;
  await prisma.risk.create({
    data: {
      projectId: d.projectId,
      title: d.title,
      probability: d.probability,
      consequence: d.consequence,
      action: d.action || null,
    },
  });
  await prisma.activityLog.create({
    data: { projectId: d.projectId, message: `Risken ”${d.title}” registrerades` },
  });
  revalidatePath(`/projekt/${d.projectId}`);
  revalidatePath("/");
  return {};
}

export async function updateRiskStatus(riskId: string, status: RiskStatus): Promise<void> {
  const risk = await prisma.risk.update({ where: { id: riskId }, data: { status } });
  revalidatePath(`/projekt/${risk.projectId}`);
  revalidatePath("/");
}

export async function deleteRisk(riskId: string): Promise<void> {
  const risk = await prisma.risk.delete({ where: { id: riskId } });
  await prisma.activityLog.create({
    data: { projectId: risk.projectId, message: `Risken ”${risk.title}” togs bort` },
  });
  revalidatePath(`/projekt/${risk.projectId}`);
  revalidatePath("/");
}
