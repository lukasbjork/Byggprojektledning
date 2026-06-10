"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error?: string;
}

function revalidateActionViews(projectId: string) {
  revalidatePath("/atgarder");
  revalidatePath(`/projekt/${projectId}`);
  revalidatePath("/");
}

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus
): Promise<void> {
  const action = await prisma.actionItem.update({
    where: { id: actionId },
    data: { status, completedAt: status === "KLAR" ? new Date() : null },
  });
  if (status === "KLAR") {
    await prisma.activityLog.create({
      data: {
        projectId: action.projectId,
        message: `Åtgärden ”${action.title}” markerades som klar`,
      },
    });
  }
  revalidateActionViews(action.projectId);
}

export async function deleteActionItem(actionId: string): Promise<void> {
  const action = await prisma.actionItem.delete({ where: { id: actionId } });
  await prisma.activityLog.create({
    data: { projectId: action.projectId, message: `Åtgärden ”${action.title}” togs bort` },
  });
  revalidateActionViews(action.projectId);
}

const actionSchema = z.object({
  projectId: z.string().min(1, "Välj projekt."),
  title: z.string().trim().min(1, "Ange en rubrik."),
  responsible: z.string().trim().optional(),
  deadline: z.string().optional(),
});

export async function createActionItem(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = actionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;
  await prisma.actionItem.create({
    data: {
      projectId: d.projectId,
      title: d.title,
      responsible: d.responsible || null,
      deadline: d.deadline ? new Date(d.deadline) : null,
    },
  });
  await prisma.activityLog.create({
    data: { projectId: d.projectId, message: `Åtgärden ”${d.title}” lades till` },
  });
  revalidateActionViews(d.projectId);
  return {};
}
