import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProjectStatusStamp,
  ProjectNumber,
  ActionStatusStamp,
} from "@/components/status-badges";
import { PhasePlaceholder } from "@/components/phase-placeholder";
import { MilestoneList, type MilestoneRow } from "@/components/projects/milestone-list";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { BudgetItemsCard, type BudgetItemRow } from "@/components/ekonomi/budget-items-card";
import { InvoicesCard, type InvoiceRow } from "@/components/ekonomi/invoices-card";
import { AtaCard, type AtaRow } from "@/components/ekonomi/ata-card";
import { ForecastCard } from "@/components/ekonomi/forecast-card";
import { CostChart, type CostPoint } from "@/components/ekonomi/cost-chart";
import {
  projectTypeLabels,
  entreprenadformLabels,
  riskLevelLabels,
  riskStatusLabels,
  meetingTypeLabels,
} from "@/lib/labels";
import { formatDate, formatSEK, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flik?: string }>;
}) {
  const { id } = await params;
  const { flik } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { deadline: "asc" } },
      risks: { orderBy: { createdAt: "asc" } },
      meetings: { orderBy: { date: "desc" } },
      actionItems: { orderBy: [{ deadline: "asc" }, { createdAt: "desc" }] },
      budgetItems: { orderBy: { account: "asc" } },
      invoices: { orderBy: { invoiceDate: "desc" } },
      changeOrders: { orderBy: { number: "asc" } },
    },
  });
  if (!project) notFound();

  // Utfall per budgetpost (attesterade + betalda fakturor)
  const outcomeInvoices = project.invoices.filter(
    (inv) => inv.status === "ATTESTERAD" || inv.status === "BETALD"
  );
  const outcomeByBudgetItem = new Map<string, number>();
  for (const inv of outcomeInvoices) {
    if (inv.budgetItemId) {
      outcomeByBudgetItem.set(
        inv.budgetItemId,
        (outcomeByBudgetItem.get(inv.budgetItemId) ?? 0) + Number(inv.amount)
      );
    }
  }

  const budget = Number(project.budget);
  const adjustment = Number(project.forecastAdjustment);
  const outcome = outcomeInvoices.reduce((s, inv) => s + Number(inv.amount), 0);
  const approvedAta = project.changeOrders
    .filter((a) => a.status === "GODKAND" || a.status === "FAKTURERAD")
    .reduce((s, a) => s + Number(a.amount), 0);
  const forecast = budget + approvedAta + adjustment;

  // Kostnadsutveckling: ackumulerat utfall per månad
  const costPoints: CostPoint[] = [];
  {
    const sorted = [...outcomeInvoices].sort(
      (a, b) => a.invoiceDate.getTime() - b.invoiceDate.getTime()
    );
    let acc = 0;
    for (const inv of sorted) {
      const label = inv.invoiceDate.toLocaleDateString("sv-SE", {
        month: "short",
        year: "2-digit",
      });
      acc += Number(inv.amount);
      const last = costPoints[costPoints.length - 1];
      if (last && last.month === label) last.utfall = acc;
      else costPoints.push({ month: label, utfall: acc });
    }
  }

  const budgetItemRows: BudgetItemRow[] = project.budgetItems.map((b) => ({
    id: b.id,
    account: b.account,
    description: b.description ?? "",
    budgeted: Number(b.budgeted),
    outcome: outcomeByBudgetItem.get(b.id) ?? 0,
  }));

  const invoiceRows: InvoiceRow[] = project.invoices.map((inv) => ({
    id: inv.id,
    supplier: inv.supplier,
    amount: Number(inv.amount),
    date: formatDate(inv.invoiceDate),
    status: inv.status,
    budgetItemId: inv.budgetItemId,
    note: inv.note ?? "",
  }));

  const ataRows: AtaRow[] = project.changeOrders.map((a) => ({
    id: a.id,
    number: a.number,
    title: a.title,
    description: a.description ?? "",
    date: formatDate(a.date),
    amount: Number(a.amount),
    status: a.status,
    note: a.note ?? "",
  }));

  const budgetItemOptions = project.budgetItems.map((b) => ({
    id: b.id,
    label: b.account,
  }));

  const milestoneRows: MilestoneRow[] = project.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    deadline: formatDate(m.deadline),
    daysUntil: daysUntil(m.deadline),
    status: m.status,
  }));

  const meta: Array<[string, string]> = [
    ["Typ", projectTypeLabels[project.type]],
    ["Entreprenadform", entreprenadformLabels[project.entreprenadform]],
    ["Beställare", project.client ?? "–"],
    ["Entreprenör", project.contractor ?? "–"],
    ["Startdatum", formatDate(project.startDate)],
    ["Slutdatum", formatDate(project.endDate)],
  ];

  const ekonomi: Array<[string, number]> = [
    ["Budget", budget],
    ["Utfall", outcome],
    ["Godkända ÄTA", approvedAta],
    ["Prognos", forecast],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projekt"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Alla projekt
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              <ProjectStatusStamp status={project.status} />
            </div>
            <ProjectNumber value={project.projectNumber} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href={`/projekt/${project.id}/redigera`} />}
            >
              <Pencil className="size-4" />
              Redigera
            </Button>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        </div>
      </div>

      <Tabs defaultValue={flik ?? "oversikt"}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="oversikt">Översikt</TabsTrigger>
          <TabsTrigger value="moten">Möten</TabsTrigger>
          <TabsTrigger value="atgarder">Åtgärder</TabsTrigger>
          <TabsTrigger value="ekonomi">Ekonomi</TabsTrigger>
          <TabsTrigger value="ata">ÄTA</TabsTrigger>
          <TabsTrigger value="dokument">Dokument</TabsTrigger>
          <TabsTrigger value="risker">Risker</TabsTrigger>
          <TabsTrigger value="rapporter">Rapporter</TabsTrigger>
        </TabsList>

        <TabsContent value="oversikt" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Projektuppgifter</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                  {meta.map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-sm">{value}</dd>
                    </div>
                  ))}
                </dl>
                {project.description ? (
                  <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ekonomi i korthet</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {ekonomi.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="font-mono text-sm">{formatSEK(value)}</dd>
                    </div>
                  ))}
                </dl>
                {budget > 0 && outcome > budget ? (
                  <p className="mt-3 border-t pt-3 text-xs text-destructive">
                    Utfallet överstiger budget.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Milstolpar</CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneList projectId={project.id} milestones={milestoneRows} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risker</CardTitle>
              </CardHeader>
              <CardContent>
                {project.risks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Inga risker registrerade. Riskhantering byggs ut i fas 6.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {project.risks.map((risk) => (
                      <li key={risk.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{risk.title}</p>
                          <span className="shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {riskStatusLabels[risk.status]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Sannolikhet: {riskLevelLabels[risk.probability]} · Konsekvens:{" "}
                          {riskLevelLabels[risk.consequence]}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="moten" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Möten i projektet</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                render={<Link href={`/moten/nytt?projekt=${project.id}`} />}
              >
                <Plus className="size-4" />
                Nytt möte
              </Button>
            </CardHeader>
            <CardContent>
              {project.meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga möten ännu.</p>
              ) : (
                <ul className="divide-y">
                  {project.meetings.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/moten/${m.id}`}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {m.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {meetingTypeLabels[m.type]}
                          {m.protocol ? " · protokoll klart" : " · protokoll saknas"}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatDate(m.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="atgarder" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Åtgärdspunkter i projektet</CardTitle>
              <Button variant="secondary" size="sm" render={<Link href="/atgarder" />}>
                Alla åtgärder
              </Button>
            </CardHeader>
            <CardContent>
              {project.actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga åtgärdspunkter ännu.</p>
              ) : (
                <ul className="divide-y">
                  {project.actionItems.map((a) => {
                    const days = a.deadline ? daysUntil(a.deadline) : null;
                    const overdue = days !== null && days < 0 && a.status !== "KLAR";
                    return (
                      <li key={a.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.responsible ?? "Ingen ansvarig"}
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
        </TabsContent>
        <TabsContent value="ekonomi" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ForecastCard
              projectId={project.id}
              budget={budget}
              approvedAta={approvedAta}
              adjustment={adjustment}
              outcome={outcome}
            />
            <CostChart data={costPoints} budget={budget} />
          </div>
          <BudgetItemsCard projectId={project.id} items={budgetItemRows} />
          <InvoicesCard
            projectId={project.id}
            invoices={invoiceRows}
            budgetItems={budgetItemOptions}
          />
        </TabsContent>
        <TabsContent value="ata" className="mt-4">
          <AtaCard projectId={project.id} atas={ataRows} originalBudget={budget} />
        </TabsContent>
        <TabsContent value="dokument" className="mt-4">
          <PhasePlaceholder phase={4} module="Dokumenthantering" />
        </TabsContent>
        <TabsContent value="risker" className="mt-4">
          <PhasePlaceholder phase={6} module="Fördjupad riskhantering" />
        </TabsContent>
        <TabsContent value="rapporter" className="mt-4">
          <PhasePlaceholder phase={6} module="Rapportgeneratorn" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
