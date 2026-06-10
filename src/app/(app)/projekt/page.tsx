import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { projectTypeLabels, projectStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { ProjectsTable, type ProjectRow } from "./projects-table";

export const metadata: Metadata = { title: "Projekt" };

// Listan ska alltid spegla databasen, inte byggtillfället
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, invoiceSums] = await Promise.all([
    prisma.project.findMany({ orderBy: { projectNumber: "asc" } }),
    prisma.invoice.groupBy({
      by: ["projectId"],
      where: { status: { in: ["ATTESTERAD", "BETALD"] } },
      _sum: { amount: true },
    }),
  ]);

  const outcomeByProject = new Map(
    invoiceSums.map((s) => [s.projectId, Number(s._sum.amount ?? 0)])
  );

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    projectNumber: p.projectNumber,
    name: p.name,
    client: p.client ?? "",
    type: p.type,
    typeLabel: projectTypeLabels[p.type],
    status: p.status,
    statusLabel: projectStatusLabels[p.status],
    budget: Number(p.budget),
    outcome: outcomeByProject.get(p.id) ?? 0,
    endDate: p.endDate ? formatDate(p.endDate) : "–",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projekt</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} projekt i registret
          </p>
        </div>
        <Button render={<Link href="/projekt/nytt" />}>
          <Plus className="size-4" />
          Nytt projekt
        </Button>
      </div>

      <ProjectsTable rows={rows} />
    </div>
  );
}
