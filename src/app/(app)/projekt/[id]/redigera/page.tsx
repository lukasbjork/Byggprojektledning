import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";

export const metadata: Metadata = { title: "Redigera projekt" };

function toInputDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const initial: ProjectFormValues = {
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    type: project.type,
    entreprenadform: project.entreprenadform,
    status: project.status,
    budget: Number(project.budget),
    startDate: toInputDate(project.startDate),
    endDate: toInputDate(project.endDate),
    client: project.client ?? "",
    contractor: project.contractor ?? "",
    description: project.description ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Redigera projekt</h1>
        <p className="font-mono text-sm text-muted-foreground">{project.projectNumber}</p>
      </div>
      <ProjectForm initial={initial} />
    </div>
  );
}
