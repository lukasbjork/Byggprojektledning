import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarkdownView } from "@/components/markdown-view";
import { PrintToolbar } from "./print-toolbar";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Rapport – utskrift" };
export const dynamic = "force-dynamic";

// Ren utskriftsvy för rapporter — Ctrl+P / "Spara som PDF".
export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: { project: { select: { name: true, projectNumber: true } } },
  });
  if (!report) notFound();

  return (
    <main className="mx-auto max-w-3xl px-8 py-10 print:max-w-none print:px-0 print:py-0">
      <PrintToolbar />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-3 font-mono text-xs text-muted-foreground">
        <span>
          {report.project.projectNumber} · {report.project.name}
        </span>
        <span>{formatDate(report.createdAt)}</span>
      </div>
      <MarkdownView markdown={report.content} />
    </main>
  );
}
