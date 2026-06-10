import "server-only";
import { prisma } from "@/lib/prisma";
import {
  projectStatusLabels,
  projectTypeLabels,
  entreprenadformLabels,
  milestoneStatusLabels,
  actionStatusLabels,
  ataStatusLabels,
  riskLevelLabels,
} from "@/lib/labels";

function sek(n: number): string {
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

function date(d: Date | null): string {
  return d ? d.toLocaleDateString("sv-SE") : "–";
}

/**
 * Bygger en kompakt textsammanfattning av ett projekt (status, ekonomi,
 * milstolpar, öppna åtgärder, ÄTA och risker) som skickas med som kontext
 * i AI-anrop. Används av assistenten och rapportgeneratorn.
 */
export async function buildProjectContext(projectId: string): Promise<string | null> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { orderBy: { deadline: "asc" } },
      actionItems: { where: { status: { not: "KLAR" } }, orderBy: { deadline: "asc" } },
      changeOrders: { orderBy: { number: "asc" } },
      risks: { where: { status: "OPPEN" } },
      invoices: { where: { status: { in: ["ATTESTERAD", "BETALD"] } } },
    },
  });
  if (!p) return null;

  const budget = Number(p.budget);
  const outcome = p.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const approvedAta = p.changeOrders
    .filter((a) => a.status === "GODKAND" || a.status === "FAKTURERAD")
    .reduce((s, a) => s + Number(a.amount), 0);
  const forecast = budget + approvedAta + Number(p.forecastAdjustment);

  const lines: string[] = [
    `PROJEKT: ${p.name} (${p.projectNumber})`,
    `Status: ${projectStatusLabels[p.status]} · Typ: ${projectTypeLabels[p.type]} · Entreprenadform: ${entreprenadformLabels[p.entreprenadform]}`,
    `Beställare: ${p.client ?? "–"} · Entreprenör: ${p.contractor ?? "–"} · Tidplan: ${date(p.startDate)} till ${date(p.endDate)}`,
    `Ekonomi: budget ${sek(budget)} · utfall ${sek(outcome)} · godkända ÄTA ${sek(approvedAta)} · slutkostnadsprognos ${sek(forecast)}`,
  ];
  if (p.description) lines.push(`Beskrivning: ${p.description}`);

  if (p.milestones.length > 0) {
    lines.push("Milstolpar:");
    for (const m of p.milestones) {
      lines.push(`- ${m.title}: ${milestoneStatusLabels[m.status]}, deadline ${date(m.deadline)}`);
    }
  }

  if (p.actionItems.length > 0) {
    lines.push(`Öppna åtgärdspunkter (${p.actionItems.length}):`);
    for (const a of p.actionItems.slice(0, 15)) {
      const overdue = a.deadline && a.deadline < new Date() ? " (FÖRSENAD)" : "";
      lines.push(
        `- ${a.title} — ansvarig ${a.responsible ?? "ej utsedd"}, deadline ${date(a.deadline)}, status ${actionStatusLabels[a.status]}${overdue}`
      );
    }
  }

  if (p.changeOrders.length > 0) {
    lines.push("ÄTA:");
    for (const a of p.changeOrders) {
      lines.push(
        `- ÄTA ${a.number} ${a.title}: ${ataStatusLabels[a.status]}, ${sek(Number(a.amount))}`
      );
    }
  }

  if (p.risks.length > 0) {
    lines.push("Öppna risker:");
    for (const r of p.risks) {
      lines.push(
        `- ${r.title} (sannolikhet ${riskLevelLabels[r.probability]}, konsekvens ${riskLevelLabels[r.consequence]})${r.action ? ` — hantering: ${r.action}` : ""}`
      );
    }
  }

  return lines.join("\n");
}

/** Kort sammanfattning av alla aktiva projekt — för frågor utan valt projekt. */
export async function buildPortfolioContext(): Promise<string> {
  const projects = await prisma.project.findMany({
    where: { status: { not: "AVSLUTAT" } },
    orderBy: { projectNumber: "asc" },
    select: { id: true },
  });
  const parts: string[] = [];
  for (const p of projects) {
    const ctx = await buildProjectContext(p.id);
    if (ctx) parts.push(ctx);
  }
  return parts.join("\n\n---\n\n");
}
