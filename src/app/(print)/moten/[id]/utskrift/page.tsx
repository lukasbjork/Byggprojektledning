import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarkdownView } from "@/components/markdown-view";
import { PrintToolbar } from "./print-toolbar";
import { meetingTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Protokoll – utskrift" };
export const dynamic = "force-dynamic";

// Ren utskriftsvy utan sidomeny — Ctrl+P / "Spara som PDF" ger en snygg PDF.
export default async function ProtocolPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { project: { select: { name: true, projectNumber: true } } },
  });
  if (!meeting || !meeting.protocol) notFound();

  return (
    <main className="mx-auto max-w-3xl px-8 py-10 print:max-w-none print:px-0 print:py-0">
      <PrintToolbar />
      {/* Ritningshuvud-lik metarad överst */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-3 font-mono text-xs text-muted-foreground">
        <span>
          {meeting.project.projectNumber} · {meeting.project.name}
        </span>
        <span>
          {meetingTypeLabels[meeting.type]} · {formatDate(meeting.date)}
        </span>
      </div>
      <MarkdownView markdown={meeting.protocol} />
    </main>
  );
}
