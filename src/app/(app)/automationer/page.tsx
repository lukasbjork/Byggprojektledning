import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ensureDefaultRules, ruleMeta } from "@/lib/automations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelative } from "@/lib/format";
import { RulesPanel, type RuleView } from "./rules-panel";

export const metadata: Metadata = { title: "Automationer" };
export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  await ensureDefaultRules();

  const [rules, logs] = await Promise.all([
    prisma.automationRule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.automationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { rule: { select: { name: true } } },
    }),
  ]);

  const ruleViews: RuleView[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: ruleMeta[r.type].description,
    active: r.active,
    hasDays: ruleMeta[r.type].hasDays,
    hasPercent: ruleMeta[r.type].hasPercent,
    thresholdDays: r.thresholdDays,
    thresholdPercent: r.thresholdPercent,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Automationer</h1>
        <p className="text-sm text-muted-foreground">
          Regler enligt mönstret ”när X → gör Y”. Resultatet hamnar i notiscentralen
          (klockan uppe till höger).
        </p>
      </div>

      <RulesPanel rules={ruleViews} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logg — senaste utförda automationer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Händelse</TableHead>
                <TableHead className="hidden md:table-cell">Regel</TableHead>
                <TableHead className="text-right">När</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    Inga automationer har utförts ännu.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{log.message}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {log.rule.name}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelative(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
