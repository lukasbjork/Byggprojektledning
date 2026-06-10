"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { documentCategoryLabels } from "@/lib/labels";

export interface GlobalDocumentRow {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  summary: string;
  projectId: string;
  projectLabel: string;
  latestVersionId: string;
  version: number;
  dateIso: string; // för filtrering
  dateLabel: string;
  fileKind: "PDF" | "BILD" | "OVRIGT";
}

export interface ProjectOption {
  id: string;
  label: string;
}

export function DokumentTable({
  rows,
  projects,
}: {
  rows: GlobalDocumentRow[];
  projects: ProjectOption[];
}) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("ALLA");
  const [category, setCategory] = useState("ALLA");
  const [kind, setKind] = useState("ALLA");
  const [after, setAfter] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (project !== "ALLA" && r.projectId !== project) return false;
      if (category !== "ALLA" && r.category !== category) return false;
      if (kind !== "ALLA" && r.fileKind !== kind) return false;
      if (after && r.dateIso < after) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.projectLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, query, project, category, kind, after]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-60">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök dokument …"
            className="pl-8"
            aria-label="Sök dokument"
          />
        </div>
        <Select value={project} onValueChange={(v) => setProject(v ?? "ALLA")}>
          <SelectTrigger className="w-52" aria-label="Filtrera på projekt">
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
        <Select value={category} onValueChange={(v) => setCategory(v ?? "ALLA")}>
          <SelectTrigger className="w-40" aria-label="Filtrera på kategori">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALLA">Alla kategorier</SelectItem>
            {Object.entries(documentCategoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(v) => setKind(v ?? "ALLA")}>
          <SelectTrigger className="w-32" aria-label="Filtrera på filtyp">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALLA">Alla filtyper</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="BILD">Bilder</SelectItem>
            <SelectItem value="OVRIGT">Övrigt</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={after}
          onChange={(e) => setAfter(e.target.value)}
          className="w-40 font-mono"
          aria-label="Uppladdad efter datum"
          title="Visa dokument uppladdade efter detta datum"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dokument</TableHead>
              <TableHead className="hidden md:table-cell">Projekt</TableHead>
              <TableHead className="hidden md:table-cell">Kategori</TableHead>
              <TableHead className="text-right">Uppladdad</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Inga dokument matchar filtret.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <a
                      href={`/api/dokument/${r.latestVersionId}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </a>
                    {r.version > 1 ? (
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        v{r.version}
                      </span>
                    ) : null}
                    {r.summary ? (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{r.summary}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    <Link
                      href={`/projekt/${r.projectId}?flik=dokument`}
                      className="hover:underline"
                    >
                      {r.projectLabel}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.categoryLabel}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {r.dateLabel}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/api/dokument/${r.latestVersionId}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={`Ladda ner ${r.name}`}
                    >
                      <Download className="size-4" />
                    </a>
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
