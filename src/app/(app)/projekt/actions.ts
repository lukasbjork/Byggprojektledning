"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error?: string;
}

const projectSchema = z.object({
  name: z.string().trim().min(1, "Projektnamn krävs."),
  projectNumber: z.string().trim().min(1, "Projektnummer krävs."),
  type: z.enum(["NYBYGGNAD", "OMBYGGNAD", "ROT", "ANLAGGNING", "FORVALTNING"]),
  entreprenadform: z.enum(["TOTALENTREPRENAD", "UTFORANDEENTREPRENAD", "DELAD"]),
  status: z.enum([
    "PLANERING",
    "UPPHANDLING",
    "PRODUKTION",
    "BESIKTNING",
    "GARANTITID",
    "AVSLUTAT",
  ]),
  budget: z.coerce.number().min(0, "Budget kan inte vara negativ."),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  client: z.string().trim().optional(),
  contractor: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

function toDate(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

export async function saveProject(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const id = formData.get("id");
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;
  const data = {
    name: d.name,
    projectNumber: d.projectNumber,
    type: d.type,
    entreprenadform: d.entreprenadform,
    status: d.status,
    budget: d.budget,
    startDate: toDate(d.startDate),
    endDate: toDate(d.endDate),
    client: d.client || null,
    contractor: d.contractor || null,
    description: d.description || null,
  };

  let projectId: string;
  try {
    if (typeof id === "string" && id.length > 0) {
      await prisma.project.update({ where: { id }, data });
      projectId = id;
      await prisma.activityLog.create({
        data: { projectId, message: `Projekt ”${d.name}” uppdaterades` },
      });
    } else {
      const created = await prisma.project.create({ data });
      projectId = created.id;
      await prisma.activityLog.create({
        data: { projectId, message: `Projekt ”${d.name}” skapades` },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Projektnummer ${d.projectNumber} används redan.` };
    }
    throw e;
  }

  revalidatePath("/");
  revalidatePath("/projekt");
  redirect(`/projekt/${projectId}`);
}

export async function deleteProject(projectId: string): Promise<void> {
  const project = await prisma.project.delete({ where: { id: projectId } });
  // projectId sätts inte: loggen ska överleva att projektet raderas
  await prisma.activityLog.create({
    data: { message: `Projekt ”${project.name}” togs bort` },
  });
  revalidatePath("/");
  revalidatePath("/projekt");
  redirect("/projekt");
}

const milestoneSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Ange en rubrik för milstolpen."),
  deadline: z.string().min(1, "Ange deadline."),
});

export async function createMilestone(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const { projectId, title, deadline } = parsed.data;
  await prisma.milestone.create({
    data: { projectId, title, deadline: new Date(deadline) },
  });
  await prisma.activityLog.create({
    data: { projectId, message: `Milstolpe ”${title}” lades till` },
  });
  revalidatePath(`/projekt/${projectId}`);
  revalidatePath("/");
  return {};
}

export async function updateMilestoneStatus(
  milestoneId: string,
  status: "EJ_PABORJAD" | "PAGAENDE" | "KLAR"
): Promise<void> {
  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status },
  });
  const statusText =
    status === "KLAR" ? "klar" : status === "PAGAENDE" ? "pågående" : "ej påbörjad";
  await prisma.activityLog.create({
    data: {
      projectId: milestone.projectId,
      message: `Milstolpe ”${milestone.title}” markerades som ${statusText}`,
    },
  });
  revalidatePath(`/projekt/${milestone.projectId}`);
  revalidatePath("/");
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const milestone = await prisma.milestone.delete({ where: { id: milestoneId } });
  await prisma.activityLog.create({
    data: {
      projectId: milestone.projectId,
      message: `Milstolpe ”${milestone.title}” togs bort`,
    },
  });
  revalidatePath(`/projekt/${milestone.projectId}`);
  revalidatePath("/");
}
