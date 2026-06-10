import type { Metadata } from "next";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata: Metadata = { title: "Nytt projekt" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nytt projekt</h1>
        <p className="text-sm text-muted-foreground">
          Registrera ett nytt projekt i kontrollcentret.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}
