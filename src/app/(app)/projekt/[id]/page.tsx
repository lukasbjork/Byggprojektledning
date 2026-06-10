import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProjectStatusStamp,
  ProjectNumber,
} from "@/components/status-badges";
import { PhasePlaceholder } from "@/components/phase-placeholder";
import { MilestoneList, type MilestoneRow } from "@/components/projects/milestone-list";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import {
  projectTypeLabels,
  entreprenadformLabels,
  riskLevelLabels,
  riskStatusLabels,
} from "@/lib/labels";
import { formatDate, formatSEK, daysUntil } from "@/lib/format";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { deadline: "asc" } },
      risks: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) notFound();

  const [outcomeAgg, approvedAtaAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { projectId: id, status: { in: ["ATTESTERAD", "BETALD"] } },
      _sum: { amount: true },
    }),
    prisma.changeOrder.aggregate({
      where: { projectId: id, status: { in: ["GODKAND", "FAKTURERAD"] } },
      _sum: { amount: true },
    }),
  ]);

  const budget = Number(project.budget);
  const outcome = Number(outcomeAgg._sum.amount ?? 0);
  const approvedAta = Number(approvedAtaAgg._sum.amount ?? 0);
  const forecast = budget + approvedAta;

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

      <Tabs defaultValue="oversikt">
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
          <PhasePlaceholder phase={2} module="Möteshantering med AI-protokoll" />
        </TabsContent>
        <TabsContent value="atgarder" className="mt-4">
          <PhasePlaceholder phase={2} module="Åtgärdspunkter" />
        </TabsContent>
        <TabsContent value="ekonomi" className="mt-4">
          <PhasePlaceholder phase={3} module="Ekonomiuppföljning" />
        </TabsContent>
        <TabsContent value="ata" className="mt-4">
          <PhasePlaceholder phase={3} module="ÄTA-registret" />
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
