"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SuggestedAction } from "@/lib/protokoll";

export interface FormState {
  error?: string;
}

const meetingSchema = z.object({
  projectId: z.string().min(1, "Välj projekt."),
  title: z.string().trim().min(1, "Ange mötestitel."),
  type: z.enum(["BYGGMOTE", "PROJEKTERINGSMOTE", "EKONOMIMOTE", "STARTMOTE"]),
  date: z.string().min(1, "Ange datum."),
  participants: z.string().trim().optional(),
});

export async function saveMeeting(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const id = formData.get("id");
  const parsed = meetingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;
  const data = {
    projectId: d.projectId,
    title: d.title,
    type: d.type,
    date: new Date(d.date),
    participants: d.participants || null,
  };

  let meetingId: string;
  if (typeof id === "string" && id.length > 0) {
    await prisma.meeting.update({ where: { id }, data });
    meetingId = id;
    await prisma.activityLog.create({
      data: { projectId: d.projectId, message: `Mötet ”${d.title}” uppdaterades` },
    });
  } else {
    const created = await prisma.meeting.create({ data });
    meetingId = created.id;
    await prisma.activityLog.create({
      data: { projectId: d.projectId, message: `Mötet ”${d.title}” skapades` },
    });
  }

  revalidatePath("/moten");
  revalidatePath(`/projekt/${d.projectId}`);
  redirect(`/moten/${meetingId}`);
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  const meeting = await prisma.meeting.delete({ where: { id: meetingId } });
  await prisma.activityLog.create({
    data: { projectId: meeting.projectId, message: `Mötet ”${meeting.title}” togs bort` },
  });
  revalidatePath("/moten");
  revalidatePath(`/projekt/${meeting.projectId}`);
  redirect("/moten");
}

/**
 * Sparar råanteckningarna separat — anropas alltid INNAN AI-genereringen
 * så att inklistrad text aldrig går förlorad även om AI-anropet fallerar.
 */
export async function saveRawNotes(meetingId: string, rawNotes: string): Promise<void> {
  await prisma.meeting.update({ where: { id: meetingId }, data: { rawNotes } });
}

export async function saveProtocol(meetingId: string, protocol: string): Promise<void> {
  const meeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: { protocol },
  });
  await prisma.activityLog.create({
    data: {
      projectId: meeting.projectId,
      message: `Protokoll sparades för ”${meeting.title}”`,
    },
  });
  revalidatePath(`/moten/${meetingId}`);
  revalidatePath("/moten");
}

/** Sparar de åtgärdsförslag användaren godkänt som ActionItems. */
export async function approveActionItems(
  meetingId: string,
  items: SuggestedAction[]
): Promise<{ created: number }> {
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  const valid = items.filter((i) => i.title.trim().length > 0);
  if (valid.length === 0) return { created: 0 };

  await prisma.actionItem.createMany({
    data: valid.map((i) => ({
      projectId: meeting.projectId,
      meetingId,
      title: i.title.trim(),
      description: i.description?.trim() || null,
      responsible: i.responsible?.trim() || null,
      deadline: i.deadline ? new Date(i.deadline) : null,
    })),
  });
  await prisma.activityLog.create({
    data: {
      projectId: meeting.projectId,
      message: `${valid.length} åtgärdspunkter godkändes från ”${meeting.title}”`,
    },
  });

  revalidatePath(`/moten/${meetingId}`);
  revalidatePath("/atgarder");
  revalidatePath(`/projekt/${meeting.projectId}`);
  revalidatePath("/");
  return { created: valid.length };
}
