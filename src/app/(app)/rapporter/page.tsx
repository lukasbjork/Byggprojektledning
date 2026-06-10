import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { ensureDefaultTemplates } from "./actions";
import { ReportGenerator } from "./report-generator";
import { ReportArchive, type ReportRow } from "./report-archive";
import { TemplatesEditor } from "./templates-editor";

export const metadata: Metadata = { title: "Rapporter" };
export const dynamic = "force-dynamic";

const typeLabels = { VECKORAPPORT: "Veckorapport", MANADSRAPPORT: "Månadsrapport" } as const;
const statusLabels = { UTKAST: "Utkast", SPARAD: "Sparad" } as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ projekt?: string; typ?: string }>;
}) {
  const { projekt, typ } = await searchParams;
  await ensureDefaultTemplates();

  const [projects, reports, templates] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "AVSLUTAT" } },
      orderBy: { projectNumber: "asc" },
      select: { id: true, name: true, projectNumber: true },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true, projectNumber: true } } },
    }),
    prisma.reportTemplate.findMany({ orderBy: { type: "asc" } }),
  ]);

  const reportRows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    title: r.title,
    typeLabel: typeLabels[r.type],
    projectLabel: `${r.project.projectNumber} · ${r.project.name}`,
    statusLabel: statusLabels[r.status],
    date: formatDate(r.createdAt),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Rapporter</h1>
        <p className="text-sm text-muted-foreground">
          AI-sammanställda vecko- och månadsrapporter per projekt
        </p>
      </div>

      <ReportGenerator
        projects={projects.map((p) => ({
          id: p.id,
          label: `${p.projectNumber} · ${p.name}`,
          name: p.name,
        }))}
        defaultProjectId={projekt ?? null}
        defaultType={typ ?? null}
      />

      <div>
        <h2 className="mb-3 text-base font-semibold">Arkiv</h2>
        <ReportArchive rows={reportRows} />
      </div>

      <TemplatesEditor
        templates={templates.map((t) => ({
          id: t.id,
          type: t.type,
          name: t.name,
          content: t.content,
        }))}
      />
    </div>
  );
}
