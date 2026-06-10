"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus, ProjectType } from "@prisma/client";
import { Search } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { ProjectStatusStamp } from "@/components/status-badges";
import { projectStatusLabels, projectTypeLabels } from "@/lib/labels";
import { formatSEK } from "@/lib/format";

export interface ProjectRow {
  id: string;
  projectNumber: string;
  name: string;
  client: string;
  type: ProjectType;
  typeLabel: string;
  status: ProjectStatus;
  statusLabel: string;
  budget: number;
  outcome: number;
  endDate: string;
}

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALLA");
  const [type, setType] = useState<string>("ALLA");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "ALLA" && r.status !== status) return false;
      if (type !== "ALLA" && r.type !== type) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.projectNumber.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q)
      );
    });
  }, [rows, query, status, type]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök namn, nummer, beställare …"
            className="pl-8"
            aria-label="Sök projekt"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "ALLA")}>
          <SelectTrigger className="w-40" aria-label="Filtrera på status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALLA">Alla statusar</SelectItem>
            {Object.entries(projectStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v ?? "ALLA")}>
          <SelectTrigger className="w-40" aria-label="Filtrera på typ">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALLA">Alla typer</SelectItem>
            {Object.entries(projectTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Nr</TableHead>
              <TableHead>Projekt</TableHead>
              <TableHead className="hidden md:table-cell">Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Budget</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Utfall</TableHead>
              <TableHead className="hidden text-right md:table-cell">Slutdatum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Inga projekt matchar filtret.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/projekt/${r.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.projectNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    {r.client ? (
                      <div className="text-xs text-muted-foreground">{r.client}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {r.typeLabel}
                  </TableCell>
                  <TableCell>
                    <ProjectStatusStamp status={r.status} />
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-xs lg:table-cell">
                    {formatSEK(r.budget)}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-xs lg:table-cell">
                    {formatSEK(r.outcome)}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-xs text-muted-foreground md:table-cell">
                    {r.endDate}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
