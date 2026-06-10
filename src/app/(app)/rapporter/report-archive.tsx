"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Printer, Trash2 } from "lucide-react";
import { deleteReport } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ReportRow {
  id: string;
  title: string;
  typeLabel: string;
  projectLabel: string;
  statusLabel: string;
  date: string;
}

export function ReportArchive({ rows }: { rows: ReportRow[] }) {
  const [, startTransition] = useTransition();

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rapport</TableHead>
            <TableHead className="hidden md:table-cell">Projekt</TableHead>
            <TableHead className="hidden md:table-cell">Typ</TableHead>
            <TableHead className="text-right">Datum</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                Inga rapporter i arkivet ännu.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <a
                    href={`/rapporter/${r.id}/utskrift`}
                    target="_blank"
                    className="font-medium hover:underline"
                  >
                    {r.title}
                  </a>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {r.projectLabel}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {r.typeLabel}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {r.date}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <a
                      href={`/rapporter/${r.id}/utskrift`}
                      target="_blank"
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={`Skriv ut ${r.title}`}
                    >
                      <Printer className="size-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ta bort ${r.title}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteReport(r.id);
                          toast.success("Rapporten togs bort.");
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
