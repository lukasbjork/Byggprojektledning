"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ActionStatus } from "@prisma/client";
import { ArrowUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createActionItem,
  deleteActionItem,
  updateActionStatus,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actionStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface ActionRow {
  id: string;
  title: string;
  responsible: string;
  deadline: string; // formaterad, "" om saknas
  deadlineTs: number | null;
  status: ActionStatus;
  overdue: boolean;
  projectId: string;
  projectLabel: string;
  meetingId: string | null;
  meetingTitle: string | null;
}

export interface ProjectOption {
  id: string;
  label: string;
}

type SortKey = "responsible" | "deadline" | "status";

const statusOrder: Record<ActionStatus, number> = {
  FORSENAD: 0,
  OPPEN: 1,
  PAGAENDE: 2,
  KLAR: 3,
};

export function ActionsTable({
  rows,
  projects,
}: {
  rows: ActionRow[];
  projects: ProjectOption[];
}) {
  const [filter, setFilter] = useState<string>("OPPNA");
  const [projectFilter, setProjectFilter] = useState<string>("ALLA");
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [sortAsc, setSortAsc] = useState(true);
  const [, startTransition] = useTransition();

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const visible = useMemo(() => {
    let r = rows;
    if (projectFilter !== "ALLA") r = r.filter((x) => x.projectId === projectFilter);
    if (filter === "OPPNA") r = r.filter((x) => x.status !== "KLAR");
    else if (filter === "FORSENADE") r = r.filter((x) => x.overdue);
    else if (filter === "KLARA") r = r.filter((x) => x.status === "KLAR");

    const dir = sortAsc ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sortKey === "responsible")
        return a.responsible.localeCompare(b.responsible, "sv") * dir;
      if (sortKey === "status")
        return (statusOrder[a.status] - statusOrder[b.status]) * dir;
      // deadline: saknad deadline sist
      const at = a.deadlineTs ?? Number.MAX_SAFE_INTEGER;
      const bt = b.deadlineTs ?? Number.MAX_SAFE_INTEGER;
      return (at - bt) * dir;
    });
  }, [rows, filter, projectFilter, sortKey, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "OPPNA")}>
          <SelectTrigger className="w-40" aria-label="Filtrera på status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPPNA">Öppna</SelectItem>
            <SelectItem value="FORSENADE">Försenade</SelectItem>
            <SelectItem value="KLARA">Klara</SelectItem>
            <SelectItem value="ALLA">Alla</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? "ALLA")}>
          <SelectTrigger className="w-56" aria-label="Filtrera på projekt">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALLA">Alla projekt</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Åtgärd</TableHead>
              <TableHead className="hidden lg:table-cell">Projekt</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("responsible")}
              >
                <span className="inline-flex items-center gap-1">
                  Ansvarig <ArrowUpDown className="size-3" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("deadline")}
              >
                <span className="inline-flex items-center gap-1">
                  Deadline <ArrowUpDown className="size-3" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                <span className="inline-flex items-center gap-1">
                  Status <ArrowUpDown className="size-3" />
                </span>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Inga åtgärder matchar filtret.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => (
                <TableRow key={r.id} className={cn(r.overdue && "bg-destructive/5")}>
                  <TableCell>
                    <p className="font-medium">{r.title}</p>
                    {r.meetingId ? (
                      <Link
                        href={`/moten/${r.meetingId}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        {r.meetingTitle}
                      </Link>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    <Link href={`/projekt/${r.projectId}`} className="hover:underline">
                      {r.projectLabel}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.responsible || "–"}</TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs",
                      r.overdue ? "font-medium text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {r.deadline || "–"}
                    {r.overdue ? " ⚠" : ""}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(v) => {
                        if (!v || v === r.status) return;
                        startTransition(() =>
                          updateActionStatus(r.id, v as ActionStatus)
                        );
                      }}
                    >
                      <SelectTrigger size="sm" className="w-32" aria-label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(actionStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ta bort åtgärden ${r.title}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteActionItem(r.id);
                          toast.success("Åtgärden togs bort.");
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <QuickAddForm projects={projects} />
    </div>
  );
}

function QuickAddForm({ projects }: { projects: ProjectOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    createActionItem,
    undefined
  );

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ny åtgärd</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
          <div className="w-56">
            <Select name="projectId" defaultValue={projects[0]?.id}>
              <SelectTrigger className="w-full" aria-label="Projekt">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-48 flex-1">
            <Input name="title" placeholder="Vad ska göras?" aria-label="Rubrik" required />
          </div>
          <Input name="responsible" placeholder="Ansvarig" className="w-40" aria-label="Ansvarig" />
          <Input name="deadline" type="date" className="w-40 font-mono" aria-label="Deadline" />
          <Button type="submit" variant="secondary" disabled={pending}>
            <Plus className="size-4" />
            {pending ? "Lägger till …" : "Lägg till"}
          </Button>
          {state?.error ? (
            <p className="w-full text-sm text-destructive">{state.error}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
