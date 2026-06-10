import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetChart, type BudgetChartRow } from "@/components/dashboard/budget-chart";
import { ActionStatusStamp, RiskDot } from "@/components/status-badges";
import { assessProjectRisk } from "@/lib/risk";
import { formatDate, formatRelative, formatSEK, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

// Dashboarden ska alltid visa färskt läge, inte en statiskt genererad sida
export const dynamic = "force-dynamic";

interface Kpi {
  label: string;
  value: number;
  note?: string;
  /** Tailwind-klass för kortets topplinje */
  rule: string;
  href?: string;
}

export default async function DashboardPage() {
  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  const [
    activeProjects,
    openActions,
    overdueActions,
    ataPending,
    invoicesToReview,
    milestonesSoon,
    actionsSoon,
    urgentActions,
    activity,
    invoiceSums,
    ataSums,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "AVSLUTAT" } },
      orderBy: { projectNumber: "asc" },
      include: {
        _count: {
          select: {
            actionItems: {
              where: { status: { not: "KLAR" }, deadline: { lt: now } },
            },
            milestones: {
              where: { status: { not: "KLAR" }, deadline: { lt: now } },
            },
            risks: {
              where: {
                status: "OPPEN",
                OR: [{ probability: "HOG" }, { consequence: "HOG" }],
              },
            },
          },
        },
      },
    }),
    prisma.actionItem.count({ where: { status: { not: "KLAR" } } }),
    prisma.actionItem.count({
      where: { status: { not: "KLAR" }, deadline: { lt: now } },
    }),
    prisma.changeOrder.count({ where: { status: { in: ["ANMALD", "PRISSATT"] } } }),
    prisma.invoice.count({ where: { status: "ATT_GRANSKA" } }),
    prisma.milestone.count({
      where: { status: { not: "KLAR" }, deadline: { gte: now, lte: in7 } },
    }),
    prisma.actionItem.count({
      where: { status: { not: "KLAR" }, deadline: { gte: now, lte: in7 } },
    }),
    prisma.actionItem.findMany({
      where: { status: { not: "KLAR" }, deadline: { not: null } },
      orderBy: { deadline: "asc" },
      take: 8,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { project: { select: { name: true } } },
    }),
    prisma.invoice.groupBy({
      by: ["projectId"],
      where: { status: { in: ["ATTESTERAD", "BETALD"] } },
      _sum: { amount: true },
    }),
    prisma.changeOrder.groupBy({
      by: ["projectId"],
      where: { status: { in: ["GODKAND", "FAKTURERAD"] } },
      _sum: { amount: true },
    }),
  ]);

  const outcomeByProject = new Map(
    invoiceSums.map((s) => [s.projectId, Number(s._sum.amount ?? 0)])
  );
  const ataByProject = new Map(
    ataSums.map((s) => [s.projectId, Number(s._sum.amount ?? 0)])
  );

  const kpis: Kpi[] = [
    { label: "Aktiva projekt", value: activeProjects.length, rule: "bg-ritning", href: "/projekt" },
    { label: "Öppna åtgärder", value: openActions, rule: "bg-ritning" },
    {
      label: "Försenade åtgärder",
      value: overdueActions,
      rule: overdueActions > 0 ? "bg-destructive" : "bg-godkand",
    },
    {
      label: "ÄTA under behandling",
      value: ataPending,
      rule: ataPending > 0 ? "bg-varsel" : "bg-godkand",
    },
    {
      label: "Fakturor att granska",
      value: invoicesToReview,
      rule: invoicesToReview > 0 ? "bg-varsel" : "bg-godkand",
    },
    {
      label: "Deadlines inom 7 dagar",
      value: milestonesSoon + actionsSoon,
      note: `${milestonesSoon} milstolpar · ${actionsSoon} åtgärder`,
      rule: milestonesSoon + actionsSoon > 0 ? "bg-varsel" : "bg-godkand",
    },
  ];

  const chartData: BudgetChartRow[] = activeProjects.map((p) => ({
    name: p.projectNumber,
    budget: Number(p.budget),
    utfall: outcomeByProject.get(p.id) ?? 0,
  }));

  const totalForecast = activeProjects.reduce(
    (sum, p) =>
      sum + Number(p.budget) + (ataByProject.get(p.id) ?? 0) + Number(p.forecastAdjustment),
    0
  );

  const riskRows = activeProjects.map((p) => {
    const budget = Number(p.budget);
    const outcome = outcomeByProject.get(p.id) ?? 0;
    const risk = assessProjectRisk({
      overdueActions: p._count.actionItems,
      overdueMilestones: p._count.milestones,
      budgetUsedRatio: budget > 0 ? outcome / budget : null,
      openHighRisks: p._count.risks,
    });
    return { id: p.id, name: p.name, projectNumber: p.projectNumber, ...risk };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Läget just nu i {activeProjects.length} aktiva projekt
        </p>
      </div>

      {/* KPI-rad: mätsticke-kort med tunn färgad topplinje */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const inner = (
            <>
              <span className={cn("absolute inset-x-0 top-0 h-0.5", kpi.rule)} />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold">{kpi.value}</p>
              {kpi.note ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{kpi.note}</p>
              ) : null}
            </>
          );
          const className =
            "relative overflow-hidden rounded-lg border bg-card p-4 block";
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href} className={cn(className, "transition-colors hover:bg-accent/40")}>
              {inner}
            </Link>
          ) : (
            <div key={kpi.label} className={className}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-baseline justify-between">
            <CardTitle className="text-base">Budget mot utfall per projekt</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total prognos:{" "}
              <span className="font-mono text-foreground">{formatSEK(totalForecast)}</span>
            </p>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Inga aktiva projekt att visa.
              </p>
            ) : (
              <BudgetChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riskläge per projekt</CardTitle>
          </CardHeader>
          <CardContent>
            {riskRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga aktiva projekt.</p>
            ) : (
              <ul className="divide-y">
                {riskRows.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <Link href={`/projekt/${r.id}`} className="group flex items-start gap-2.5">
                      <RiskDot color={r.color} className="mt-1.5" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:underline">
                          {r.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.reasons.join(" · ")}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mest brådskande just nu</CardTitle>
          </CardHeader>
          <CardContent>
            {urgentActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga öppna åtgärdspunkter med deadline.
              </p>
            ) : (
              <ul className="divide-y">
                {urgentActions.map((a) => {
                  const days = a.deadline ? daysUntil(a.deadline) : null;
                  const overdue = days !== null && days < 0;
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <Link href={`/projekt/${a.project.id}`} className="hover:underline">
                            {a.project.name}
                          </Link>
                          {a.responsible ? ` · ${a.responsible}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-xs",
                          overdue ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {a.deadline ? formatDate(a.deadline) : "–"}
                      </span>
                      <ActionStatusStamp status={overdue ? "FORSENAD" : a.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Senaste händelser</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen aktivitet ännu.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((log) => (
                  <li key={log.id} className="text-sm">
                    <p className="leading-snug">{log.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {log.project ? `${log.project.name} · ` : ""}
                      {formatRelative(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
