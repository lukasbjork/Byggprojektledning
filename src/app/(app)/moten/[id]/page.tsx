import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtocolWorkbench } from "@/components/meetings/protocol-workbench";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { ActionStatusStamp } from "@/components/status-badges";
import { meetingTypeLabels } from "@/lib/labels";
import { formatDate, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      actionItems: { orderBy: [{ deadline: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!meeting) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/moten"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Alla möten
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">{meeting.title}</h1>
              <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {meetingTypeLabels[meeting.type]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{formatDate(meeting.date)}</span>
              {" · "}
              <Link href={`/projekt/${meeting.project.id}`} className="hover:underline">
                {meeting.project.projectNumber} · {meeting.project.name}
              </Link>
            </p>
            {meeting.participants ? (
              <p className="text-sm text-muted-foreground">
                Deltagare: {meeting.participants}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link href={`/moten/${meeting.id}/redigera`} />}>
              <Pencil className="size-4" />
              Redigera
            </Button>
            <DeleteMeetingButton meetingId={meeting.id} meetingTitle={meeting.title} />
          </div>
        </div>
      </div>

      <ProtocolWorkbench
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        initialRawNotes={meeting.rawNotes ?? ""}
        initialProtocol={meeting.protocol ?? ""}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Åtgärdspunkter från mötet</CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga åtgärdspunkter ännu. Generera protokoll ovan så föreslår AI:n åtgärder,
              eller lägg till manuellt under{" "}
              <Link href="/atgarder" className="underline">
                Åtgärder
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {meeting.actionItems.map((a) => {
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
    </div>
  );
}
