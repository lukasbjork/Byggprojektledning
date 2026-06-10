"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { MilestoneStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";
import {
  createMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  type FormState,
} from "@/app/(app)/projekt/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { milestoneStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface MilestoneRow {
  id: string;
  title: string;
  deadline: string; // formaterat ÅÅÅÅ-MM-DD
  daysUntil: number;
  status: MilestoneStatus;
}

function DeadlineNote({ days, done }: { days: number; done: boolean }) {
  if (done) return null;
  if (days < 0) {
    return (
      <span className="font-mono text-xs text-destructive">
        {Math.abs(days)} {Math.abs(days) === 1 ? "dag" : "dagar"} försenad
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="font-mono text-xs text-varsel">
        {days === 0 ? "idag" : `om ${days} ${days === 1 ? "dag" : "dagar"}`}
      </span>
    );
  }
  return null;
}

export function MilestoneList({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: MilestoneRow[];
}) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    createMilestone,
    undefined
  );

  // Töm formuläret när en milstolpe sparats utan fel
  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga milstolpar ännu.</p>
      ) : (
        <ul className="divide-y">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    m.status === "KLAR" && "text-muted-foreground line-through"
                  )}
                >
                  {m.title}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{m.deadline}</span>
                  <DeadlineNote days={m.daysUntil} done={m.status === "KLAR"} />
                </p>
              </div>
              <Select
                value={m.status}
                onValueChange={(v) => {
                  if (!v || v === m.status) return;
                  startTransition(() =>
                    updateMilestoneStatus(m.id, v as MilestoneStatus)
                  );
                }}
              >
                <SelectTrigger size="sm" className="w-32" aria-label="Milstolpens status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(milestoneStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ta bort milstolpen ${m.title}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => startTransition(() => deleteMilestone(m.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2 border-t pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="min-w-40 flex-1">
          <Input name="title" placeholder="Ny milstolpe …" aria-label="Milstolpens rubrik" required />
        </div>
        <Input
          name="deadline"
          type="date"
          className="w-40 font-mono"
          aria-label="Deadline"
          required
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Lägger till …" : "Lägg till"}
        </Button>
        {state?.error ? (
          <p className="w-full text-sm text-destructive">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
