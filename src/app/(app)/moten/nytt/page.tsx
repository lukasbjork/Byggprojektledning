import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MeetingForm } from "@/components/meetings/meeting-form";

export const metadata: Metadata = { title: "Nytt möte" };
export const dynamic = "force-dynamic";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ projekt?: string }>;
}) {
  const { projekt } = await searchParams;
  const projects = await prisma.project.findMany({
    where: { status: { not: "AVSLUTAT" } },
    orderBy: { projectNumber: "asc" },
    select: { id: true, name: true, projectNumber: true },
  });

  const options = projects.map((p) => ({
    id: p.id,
    label: `${p.projectNumber} · ${p.name}`,
  }));
  const preselected = options.find((o) => o.id === projekt)?.id ?? options[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nytt möte</h1>
        <p className="text-sm text-muted-foreground">
          Skapa mötet först — klistra sedan in anteckningarna på mötessidan.
        </p>
      </div>
      <MeetingForm
        projects={options}
        initial={{
          projectId: preselected,
          title: "",
          type: "BYGGMOTE",
          date: new Date().toISOString().slice(0, 10),
          participants: "",
        }}
      />
    </div>
  );
}
