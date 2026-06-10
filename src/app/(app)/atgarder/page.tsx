import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { daysUntil, formatDate } from "@/lib/format";
import { ActionsTable, type ActionRow } from "./actions-table";

export const metadata: Metadata = { title: "Åtgärder" };
export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const [actions, projects] = await Promise.all([
    prisma.actionItem.findMany({
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        meeting: { select: { id: true, title: true } },
      },
    }),
    prisma.project.findMany({
      where: { status: { not: "AVSLUTAT" } },
      orderBy: { projectNumber: "asc" },
      select: { id: true, name: true, projectNumber: true },
    }),
  ]);

  const rows: ActionRow[] = actions.map((a) => {
    const days = a.deadline ? daysUntil(a.deadline) : null;
    return {
      id: a.id,
      title: a.title,
      responsible: a.responsible ?? "",
      deadline: a.deadline ? formatDate(a.deadline) : "",
      deadlineTs: a.deadline ? a.deadline.getTime() : null,
      status: a.status,
      overdue: days !== null && days < 0 && a.status !== "KLAR",
      projectId: a.project.id,
      projectLabel: `${a.project.projectNumber} · ${a.project.name}`,
      meetingId: a.meeting?.id ?? null,
      meetingTitle: a.meeting?.title ?? null,
    };
  });

  const open = rows.filter((r) => r.status !== "KLAR").length;
  const overdue = rows.filter((r) => r.overdue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Åtgärder</h1>
        <p className="text-sm text-muted-foreground">
          {open} öppna åtgärdspunkter över alla projekt
          {overdue > 0 ? (
            <span className="text-destructive"> · {overdue} försenade</span>
          ) : null}
        </p>
      </div>

      <ActionsTable
        rows={rows}
        projects={projects.map((p) => ({
          id: p.id,
          label: `${p.projectNumber} · ${p.name}`,
        }))}
      />
    </div>
  );
}
