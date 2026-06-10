import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MeetingForm } from "@/components/meetings/meeting-form";

export const metadata: Metadata = { title: "Redigera möte" };

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [meeting, projects] = await Promise.all([
    prisma.meeting.findUnique({ where: { id } }),
    prisma.project.findMany({
      orderBy: { projectNumber: "asc" },
      select: { id: true, name: true, projectNumber: true },
    }),
  ]);
  if (!meeting) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Redigera möte</h1>
        <p className="text-sm text-muted-foreground">{meeting.title}</p>
      </div>
      <MeetingForm
        projects={projects.map((p) => ({
          id: p.id,
          label: `${p.projectNumber} · ${p.name}`,
        }))}
        initial={{
          id: meeting.id,
          projectId: meeting.projectId,
          title: meeting.title,
          type: meeting.type,
          date: meeting.date.toISOString().slice(0, 10),
          participants: meeting.participants ?? "",
        }}
      />
    </div>
  );
}
