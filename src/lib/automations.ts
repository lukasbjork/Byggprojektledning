import "server-only";
import type { AutomationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RuleMeta {
  name: string;
  description: string;
  hasDays: boolean;
  hasPercent: boolean;
  defaultDays?: number;
  defaultPercent?: number;
}

export const ruleMeta: Record<AutomationType, RuleMeta> = {
  DEADLINE_NARMAR_SIG: {
    name: "Deadline närmar sig",
    description: "Notis när en milstolpe eller åtgärdspunkt har deadline inom N dagar.",
    hasDays: true,
    hasPercent: false,
    defaultDays: 7,
  },
  ATGARD_FORSENAD: {
    name: "Åtgärd försenad",
    description: "Åtgärdspunkter som passerat deadline markeras som försenade + notis.",
    hasDays: false,
    hasPercent: false,
  },
  BUDGET_VARNING: {
    name: "Budgetvarning",
    description: "Notis när utfallet på en budgetpost överstiger N % av budgeterat belopp.",
    hasDays: false,
    hasPercent: true,
    defaultPercent: 90,
  },
  ATA_PAMINNELSE: {
    name: "ÄTA-påminnelse",
    description: "Påminnelse när en ÄTA legat i status Anmäld i mer än N dagar.",
    hasDays: true,
    hasPercent: false,
    defaultDays: 14,
  },
  FAKTURA_PAMINNELSE: {
    name: "Fakturapåminnelse",
    description: "Påminnelse när en faktura legat i status Att granska i mer än N dagar.",
    hasDays: true,
    hasPercent: false,
    defaultDays: 7,
  },
  VECKORAPPORT: {
    name: "Veckorapport",
    description:
      "Påminnelse varje fredag om att generera veckorapportutkast för aktiva projekt.",
    hasDays: false,
    hasPercent: false,
  },
};

/** Skapar standardreglerna om de saknas. */
export async function ensureDefaultRules(): Promise<void> {
  const existing = await prisma.automationRule.findMany({ select: { type: true } });
  const existingTypes = new Set(existing.map((r) => r.type));
  const missing = (Object.keys(ruleMeta) as AutomationType[]).filter(
    (t) => !existingTypes.has(t)
  );
  if (missing.length === 0) return;
  await prisma.automationRule.createMany({
    data: missing.map((type) => ({
      type,
      name: ruleMeta[type].name,
      thresholdDays: ruleMeta[type].defaultDays ?? null,
      thresholdPercent: ruleMeta[type].defaultPercent ?? null,
    })),
  });
}

/**
 * Skapar en notis om ingen likadan (titel + länk) skapats de senaste dagarna.
 * Förhindrar att samma varning spammas vid varje körning.
 */
async function notifyOnce(
  ruleId: string,
  title: string,
  message: string | null,
  link: string | null
): Promise<boolean> {
  const since = new Date(Date.now() - 3 * 86_400_000);
  const dup = await prisma.notification.findFirst({
    where: { title, link, createdAt: { gte: since } },
    select: { id: true },
  });
  if (dup) return false;
  await prisma.notification.create({ data: { title, message, link } });
  await prisma.automationLog.create({ data: { ruleId, message: title } });
  return true;
}

export interface AutomationRunResult {
  skipped: boolean;
  created: number;
}

/**
 * Kör regelmotorn. Vid trigger "sidladdning" körs den högst en gång i timmen;
 * "manuell" kör alltid.
 */
export async function runAutomations(
  trigger: "sidladdning" | "manuell"
): Promise<AutomationRunResult> {
  if (trigger === "sidladdning") {
    const lastRun = await prisma.automationRun.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (lastRun && Date.now() - lastRun.createdAt.getTime() < 60 * 60_000) {
      return { skipped: true, created: 0 };
    }
  }
  await ensureDefaultRules();
  await prisma.automationRun.create({ data: { trigger } });

  const rules = await prisma.automationRule.findMany({ where: { active: true } });
  const rule = (type: AutomationType) => rules.find((r) => r.type === type);
  const now = new Date();
  let created = 0;

  // --- Deadline närmar sig ---
  const deadlineRule = rule("DEADLINE_NARMAR_SIG");
  if (deadlineRule) {
    const days = deadlineRule.thresholdDays ?? 7;
    const until = new Date(now.getTime() + days * 86_400_000);
    const [milestones, actions] = await Promise.all([
      prisma.milestone.findMany({
        where: { status: { not: "KLAR" }, deadline: { gte: now, lte: until } },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.actionItem.findMany({
        where: { status: { not: "KLAR" }, deadline: { gte: now, lte: until } },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);
    for (const m of milestones) {
      if (
        await notifyOnce(
          deadlineRule.id,
          `Milstolpen ”${m.title}” har deadline ${m.deadline.toLocaleDateString("sv-SE")}`,
          m.project.name,
          `/projekt/${m.project.id}`
        )
      )
        created++;
    }
    for (const a of actions) {
      if (
        await notifyOnce(
          deadlineRule.id,
          `Åtgärden ”${a.title}” har deadline ${a.deadline!.toLocaleDateString("sv-SE")}`,
          `${a.project.name}${a.responsible ? ` · ${a.responsible}` : ""}`,
          "/atgarder"
        )
      )
        created++;
    }
  }

  // --- Försenade åtgärder ---
  const overdueRule = rule("ATGARD_FORSENAD");
  if (overdueRule) {
    const overdue = await prisma.actionItem.findMany({
      where: { status: { notIn: ["KLAR", "FORSENAD"] }, deadline: { lt: now } },
      include: { project: { select: { id: true, name: true } } },
    });
    for (const a of overdue) {
      await prisma.actionItem.update({ where: { id: a.id }, data: { status: "FORSENAD" } });
      if (
        await notifyOnce(
          overdueRule.id,
          `Åtgärden ”${a.title}” är försenad`,
          `${a.project.name} · deadline var ${a.deadline!.toLocaleDateString("sv-SE")}`,
          "/atgarder"
        )
      )
        created++;
    }
  }

  // --- Budgetvarning ---
  const budgetRule = rule("BUDGET_VARNING");
  if (budgetRule) {
    const percent = budgetRule.thresholdPercent ?? 90;
    const items = await prisma.budgetItem.findMany({
      include: {
        project: { select: { id: true, name: true } },
        invoices: { where: { status: { in: ["ATTESTERAD", "BETALD"] } } },
      },
    });
    for (const item of items) {
      const budgeted = Number(item.budgeted);
      if (budgeted <= 0) continue;
      const outcome = item.invoices.reduce((s, i) => s + Number(i.amount), 0);
      const used = Math.round((outcome / budgeted) * 100);
      if (used >= 100) {
        if (
          await notifyOnce(
            budgetRule.id,
            `Budgetposten ”${item.account}” är överskriden (${used} %)`,
            item.project.name,
            `/projekt/${item.project.id}?flik=ekonomi`
          )
        )
          created++;
      } else if (used >= percent) {
        if (
          await notifyOnce(
            budgetRule.id,
            `Budgetposten ”${item.account}” har nått ${used} % av budget`,
            item.project.name,
            `/projekt/${item.project.id}?flik=ekonomi`
          )
        )
          created++;
      }
    }
  }

  // --- ÄTA-påminnelse ---
  const ataRule = rule("ATA_PAMINNELSE");
  if (ataRule) {
    const days = ataRule.thresholdDays ?? 14;
    const before = new Date(now.getTime() - days * 86_400_000);
    const atas = await prisma.changeOrder.findMany({
      where: { status: "ANMALD", date: { lt: before } },
      include: { project: { select: { id: true, name: true } } },
    });
    for (const a of atas) {
      if (
        await notifyOnce(
          ataRule.id,
          `ÄTA ${a.number} ”${a.title}” har varit anmäld i över ${days} dagar`,
          a.project.name,
          `/projekt/${a.project.id}?flik=ata`
        )
      )
        created++;
    }
  }

  // --- Fakturapåminnelse ---
  const invoiceRule = rule("FAKTURA_PAMINNELSE");
  if (invoiceRule) {
    const days = invoiceRule.thresholdDays ?? 7;
    const before = new Date(now.getTime() - days * 86_400_000);
    const invoices = await prisma.invoice.findMany({
      where: { status: "ATT_GRANSKA", invoiceDate: { lt: before } },
      include: { project: { select: { id: true, name: true } } },
    });
    for (const inv of invoices) {
      if (
        await notifyOnce(
          invoiceRule.id,
          `Fakturan från ${inv.supplier} har väntat på granskning i över ${days} dagar`,
          inv.project.name,
          "/ekonomi"
        )
      )
        created++;
    }
  }

  // --- Veckorapport (påminnelse på fredagar) ---
  const weeklyRule = rule("VECKORAPPORT");
  if (weeklyRule) {
    const day = now.getDay(); // 5 = fredag
    if (day === 5 || day === 6 || day === 0) {
      // Måndag i innevarande vecka
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - ((day + 6) % 7));
      const projects = await prisma.project.findMany({
        where: { status: { not: "AVSLUTAT" } },
        select: { id: true, name: true },
      });
      for (const p of projects) {
        const existing = await prisma.report.findFirst({
          where: {
            projectId: p.id,
            type: "VECKORAPPORT",
            createdAt: { gte: monday },
          },
          select: { id: true },
        });
        if (!existing) {
          if (
            await notifyOnce(
              weeklyRule.id,
              `Dags att generera veckorapport för ${p.name}`,
              null,
              `/rapporter?projekt=${p.id}&typ=VECKORAPPORT`
            )
          )
            created++;
        }
      }
    }
  }

  return { skipped: false, created };
}
