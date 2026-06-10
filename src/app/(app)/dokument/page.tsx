import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { documentCategoryLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { DokumentTable, type GlobalDocumentRow } from "./dokument-table";

export const metadata: Metadata = { title: "Dokument" };
export const dynamic = "force-dynamic";

function fileKind(mimeType: string | null): "PDF" | "BILD" | "OVRIGT" {
  if (!mimeType) return "OVRIGT";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "BILD";
  return "OVRIGT";
}

export default async function DocumentsPage() {
  const [documents, projects] = await Promise.all([
    prisma.document.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        summary: true,
        project: { select: { id: true, name: true, projectNumber: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          // OBS: hämta aldrig data-fältet i listor — filinnehållet är tungt
          select: { id: true, version: true, mimeType: true, createdAt: true },
        },
      },
    }),
    prisma.project.findMany({
      orderBy: { projectNumber: "asc" },
      select: { id: true, name: true, projectNumber: true },
    }),
  ]);

  const rows: GlobalDocumentRow[] = documents
    .filter((d) => d.versions.length > 0)
    .map((d) => {
      const latest = d.versions[0];
      return {
        id: d.id,
        name: d.name,
        category: d.category,
        categoryLabel: documentCategoryLabels[d.category],
        summary: d.summary ?? "",
        projectId: d.project.id,
        projectLabel: `${d.project.projectNumber} · ${d.project.name}`,
        latestVersionId: latest.id,
        version: latest.version,
        dateIso: latest.createdAt.toISOString().slice(0, 10),
        dateLabel: formatDate(latest.createdAt),
        fileKind: fileKind(latest.mimeType),
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dokument</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} dokument över alla projekt · ladda upp via respektive projekts
          dokumentflik
        </p>
      </div>
      <DokumentTable
        rows={rows}
        projects={projects.map((p) => ({
          id: p.id,
          label: `${p.projectNumber} · ${p.name}`,
        }))}
      />
    </div>
  );
}
