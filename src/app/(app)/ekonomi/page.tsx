import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeviationFlag } from "@/components/status-badges";
import { formatDate, formatSEK } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReviewInvoices, type ReviewInvoiceRow } from "./review-invoices";

export const metadata: Metadata = { title: "Ekonomi" };
export const dynamic = "force-dynamic";

export default async function EconomyPage() {
  const [projects, outcomeSums, ataSums, unlinkedCounts, toReview] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "AVSLUTAT" } },
      orderBy: { projectNumber: "asc" },
    }),
    prisma.invoice.groupBy({
      by: ["projectId"],
      where: { status: { in: ["ATTESTERAD", "BETALD"] } },
      _sum: { amount: true },
    }),
    prisma.changeOrder.groupBy({
      by: ["projectId"],
      where: { status: { in: ["GODKAND", "FAKTURERAD"] } },
      _sum: { amount: true },
    }),
    prisma.invoice.groupBy({
      by: ["projectId"],
      where: { budgetItemId: null },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: { status: "ATT_GRANSKA" },
      orderBy: { invoiceDate: "asc" },
      include: { project: { select: { id: true, name: true, projectNumber: true } } },
    }),
  ]);

  const outcomeBy = new Map(outcomeSums.map((s) => [s.projectId, Number(s._sum.amount ?? 0)]));
  const ataBy = new Map(ataSums.map((s) => [s.projectId, Number(s._sum.amount ?? 0)]));
  const unlinkedBy = new Map(unlinkedCounts.map((s) => [s.projectId, s._count._all]));

  const rows = projects.map((p) => {
    const budget = Number(p.budget);
    const outcome = outcomeBy.get(p.id) ?? 0;
    const ata = ataBy.get(p.id) ?? 0;
    const forecast = budget + ata + Number(p.forecastAdjustment);
    return {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      budget,
      outcome,
      ata,
      forecast,
      overBudget: budget > 0 && outcome > budget + ata,
      nearBudget: budget > 0 && outcome > 0.9 * (budget + ata) && outcome <= budget + ata,
      unlinked: unlinkedBy.get(p.id) ?? 0,
    };
  });

  const totals = rows.reduce(
    (t, r) => ({
      budget: t.budget + r.budget,
      outcome: t.outcome + r.outcome,
      ata: t.ata + r.ata,
      forecast: t.forecast + r.forecast,
    }),
    { budget: 0, outcome: 0, ata: 0, forecast: 0 }
  );

  const reviewRows: ReviewInvoiceRow[] = toReview.map((inv) => ({
    id: inv.id,
    supplier: inv.supplier,
    amount: Number(inv.amount),
    date: formatDate(inv.invoiceDate),
    projectId: inv.project.id,
    projectLabel: `${inv.project.projectNumber} · ${inv.project.name}`,
  }));

  const kpis: Array<{ label: string; value: number }> = [
    { label: "Total budget", value: totals.budget },
    { label: "Totalt utfall", value: totals.outcome },
    { label: "Godkända ÄTA", value: totals.ata },
    { label: "Total prognos", value: totals.forecast },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ekonomi</h1>
        <p className="text-sm text-muted-foreground">
          Budget, utfall och prognos för {rows.length} aktiva projekt
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-lg border bg-card p-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-ritning" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold">{formatSEK(k.value)}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projekt</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Utfall</TableHead>
              <TableHead className="hidden text-right md:table-cell">Godkända ÄTA</TableHead>
              <TableHead className="text-right">Prognos</TableHead>
              <TableHead>Flaggor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    href={`/projekt/${r.id}?flik=ekonomi`}
                    className="font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">{r.projectNumber}</p>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatSEK(r.budget)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-xs",
                    r.overBudget && "font-medium text-destructive"
                  )}
                >
                  {formatSEK(r.outcome)}
                </TableCell>
                <TableCell className="hidden text-right font-mono text-xs md:table-cell">
                  {formatSEK(r.ata)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatSEK(r.forecast)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {r.overBudget ? (
                      <DeviationFlag severity="destruktiv">Över budget</DeviationFlag>
                    ) : null}
                    {r.nearBudget ? <DeviationFlag>&gt; 90 %</DeviationFlag> : null}
                    {r.unlinked > 0 ? (
                      <DeviationFlag>{r.unlinked} utan koppling</DeviationFlag>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Summa</TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatSEK(totals.budget)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatSEK(totals.outcome)}
              </TableCell>
              <TableCell className="hidden text-right font-mono text-xs font-medium md:table-cell">
                {formatSEK(totals.ata)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatSEK(totals.forecast)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Fakturor att granska{reviewRows.length > 0 ? ` (${reviewRows.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewInvoices rows={reviewRows} />
        </CardContent>
      </Card>
    </div>
  );
}
