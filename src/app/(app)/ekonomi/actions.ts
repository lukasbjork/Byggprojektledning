"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AtaStatus, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceStatusLabels, ataStatusLabels } from "@/lib/labels";

export interface FormState {
  error?: string;
}

function revalidateEconomy(projectId: string) {
  revalidatePath("/ekonomi");
  revalidatePath(`/projekt/${projectId}`);
  revalidatePath("/");
}

// ===== Budgetposter =====

const budgetItemSchema = z.object({
  projectId: z.string().min(1),
  account: z.string().trim().min(1, "Ange konto/post."),
  description: z.string().trim().optional(),
  budgeted: z.coerce.number().min(0, "Beloppet kan inte vara negativt."),
});

export async function saveBudgetItem(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const id = formData.get("id");
  const parsed = budgetItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;
  const data = {
    projectId: d.projectId,
    account: d.account,
    description: d.description || null,
    budgeted: d.budgeted,
  };
  if (typeof id === "string" && id.length > 0) {
    await prisma.budgetItem.update({ where: { id }, data });
  } else {
    await prisma.budgetItem.create({ data });
    await prisma.activityLog.create({
      data: { projectId: d.projectId, message: `Budgetposten ”${d.account}” lades till` },
    });
  }
  revalidateEconomy(d.projectId);
  return {};
}

export async function deleteBudgetItem(budgetItemId: string): Promise<void> {
  const item = await prisma.budgetItem.delete({ where: { id: budgetItemId } });
  await prisma.activityLog.create({
    data: { projectId: item.projectId, message: `Budgetposten ”${item.account}” togs bort` },
  });
  revalidateEconomy(item.projectId);
}

// ===== Fakturor =====

const invoiceSchema = z.object({
  projectId: z.string().min(1),
  supplier: z.string().trim().min(1, "Ange leverantör."),
  amount: z.coerce.number().positive("Beloppet måste vara större än 0."),
  invoiceDate: z.string().min(1, "Ange fakturadatum."),
  budgetItemId: z.string().optional(),
  status: z.enum(["ATT_GRANSKA", "ATTESTERAD", "BESTRIDEN", "BETALD"]).default("ATT_GRANSKA"),
  note: z.string().trim().optional(),
});

export async function createInvoice(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;
  await prisma.invoice.create({
    data: {
      projectId: d.projectId,
      supplier: d.supplier,
      amount: d.amount,
      invoiceDate: new Date(d.invoiceDate),
      budgetItemId: d.budgetItemId && d.budgetItemId !== "INGEN" ? d.budgetItemId : null,
      status: d.status,
      note: d.note || null,
    },
  });
  await prisma.activityLog.create({
    data: {
      projectId: d.projectId,
      message: `Faktura från ${d.supplier} (${Math.round(d.amount).toLocaleString("sv-SE")} kr) registrerades`,
    },
  });
  revalidateEconomy(d.projectId);
  return {};
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> {
  const invoice = await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  await prisma.activityLog.create({
    data: {
      projectId: invoice.projectId,
      message: `Faktura från ${invoice.supplier} fick status ${invoiceStatusLabels[status]}`,
    },
  });
  revalidateEconomy(invoice.projectId);
}

/** Kopplar (eller kopplar bort) en faktura till en budgetpost. */
export async function updateInvoiceBudgetItem(
  invoiceId: string,
  budgetItemId: string | null
): Promise<void> {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { budgetItemId },
  });
  revalidateEconomy(invoice.projectId);
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.delete({ where: { id: invoiceId } });
  await prisma.activityLog.create({
    data: {
      projectId: invoice.projectId,
      message: `Faktura från ${invoice.supplier} togs bort`,
    },
  });
  revalidateEconomy(invoice.projectId);
}

// ===== ÄTA =====

const ataSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Ange en rubrik."),
  description: z.string().trim().optional(),
  amount: z.coerce.number().min(0, "Beloppet kan inte vara negativt.").default(0),
  date: z.string().optional(),
  status: z
    .enum(["ANMALD", "PRISSATT", "GODKAND", "AVSLAGEN", "FAKTURERAD"])
    .default("ANMALD"),
  note: z.string().trim().optional(),
});

export async function saveChangeOrder(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const id = formData.get("id");
  const parsed = ataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }
  const d = parsed.data;

  if (typeof id === "string" && id.length > 0) {
    await prisma.changeOrder.update({
      where: { id },
      data: {
        title: d.title,
        description: d.description || null,
        amount: d.amount,
        date: d.date ? new Date(d.date) : undefined,
        status: d.status,
        note: d.note || null,
      },
    });
  } else {
    // Löpnummer per projekt: högsta befintliga + 1
    const last = await prisma.changeOrder.findFirst({
      where: { projectId: d.projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;
    await prisma.changeOrder.create({
      data: {
        projectId: d.projectId,
        number,
        title: d.title,
        description: d.description || null,
        amount: d.amount,
        date: d.date ? new Date(d.date) : new Date(),
        status: d.status,
        note: d.note || null,
      },
    });
    await prisma.activityLog.create({
      data: {
        projectId: d.projectId,
        message: `ÄTA ${number} ”${d.title}” anmäldes`,
      },
    });
  }
  revalidateEconomy(d.projectId);
  return {};
}

export async function updateChangeOrderStatus(
  changeOrderId: string,
  status: AtaStatus
): Promise<void> {
  const ata = await prisma.changeOrder.update({
    where: { id: changeOrderId },
    data: { status },
  });
  await prisma.activityLog.create({
    data: {
      projectId: ata.projectId,
      message: `ÄTA ${ata.number} ”${ata.title}” fick status ${ataStatusLabels[status]}`,
    },
  });
  revalidateEconomy(ata.projectId);
}

export async function deleteChangeOrder(changeOrderId: string): Promise<void> {
  const ata = await prisma.changeOrder.delete({ where: { id: changeOrderId } });
  await prisma.activityLog.create({
    data: { projectId: ata.projectId, message: `ÄTA ${ata.number} ”${ata.title}” togs bort` },
  });
  revalidateEconomy(ata.projectId);
}

// ===== Prognos =====

export async function updateForecastAdjustment(
  projectId: string,
  amount: number
): Promise<void> {
  if (!Number.isFinite(amount)) return;
  await prisma.project.update({
    where: { id: projectId },
    data: { forecastAdjustment: amount },
  });
  await prisma.activityLog.create({
    data: {
      projectId,
      message: `Bedömd återstående kostnad uppdaterades till ${Math.round(amount).toLocaleString("sv-SE")} kr`,
    },
  });
  revalidateEconomy(projectId);
}
