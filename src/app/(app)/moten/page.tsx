import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
import { meetingTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Möten" };
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const meetings = await prisma.meeting.findMany({
    orderBy: { date: "desc" },
    include: { project: { select: { id: true, name: true, projectNumber: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Möten</h1>
          <p className="text-sm text-muted-foreground">
            {meetings.length} möten · klistra in anteckningar och låt AI:n skriva protokollet
          </p>
        </div>
        <Button render={<Link href="/moten/nytt" />}>
          <Plus className="size-4" />
          Nytt möte
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Datum</TableHead>
              <TableHead>Möte</TableHead>
              <TableHead className="hidden md:table-cell">Projekt</TableHead>
              <TableHead className="hidden md:table-cell">Typ</TableHead>
              <TableHead>Protokoll</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Inga möten ännu. Skapa det första med ”Nytt möte”.
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDate(m.date)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/moten/${m.id}`} className="font-medium hover:underline">
                      {m.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {m.project.name}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {meetingTypeLabels[m.type]}
                  </TableCell>
                  <TableCell>
                    {m.protocol ? (
                      <span className="inline-flex items-center gap-1.5 rounded-sm border border-godkand/50 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-godkand">
                        <FileText className="size-3" />
                        Klart
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-sm border border-muted-foreground/40 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Saknas
                      </span>
                    )}
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
