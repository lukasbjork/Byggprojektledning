"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateForecastAdjustment } from "@/app/(app)/ekonomi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatSEK } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ForecastCard({
  projectId,
  budget,
  approvedAta,
  adjustment,
  outcome,
}: {
  projectId: string;
  budget: number;
  approvedAta: number;
  adjustment: number;
  outcome: number;
}) {
  const [value, setValue] = useState(String(adjustment));
  const [saving, startTransition] = useTransition();

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  const adj = Number.isFinite(parsed) ? parsed : adjustment;
  const forecast = budget + approvedAta + adj;
  const overBudget = outcome > budget + approvedAta && budget > 0;

  function handleSave() {
    if (!Number.isFinite(parsed)) {
      toast.error("Ange ett giltigt belopp.");
      return;
    }
    startTransition(async () => {
      await updateForecastAdjustment(projectId, parsed);
      toast.success("Prognosen uppdaterades.");
    });
  }

  const rows: Array<[string, number]> = [
    ["Ursprunglig budget", budget],
    ["Godkända ÄTA", approvedAta],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Slutkostnadsprognos</CardTitle>
        <CardDescription>
          Prognos = budget + godkända ÄTA + bedömd återstående kostnad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-2.5">
          {rows.map(([label, v]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-mono text-sm">{formatSEK(v)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Bedömd återstående kostnad</dt>
            <dd className="flex items-center gap-2">
              <Input
                type="number"
                step={10000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-36 text-right font-mono"
                aria-label="Bedömd återstående kostnad"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSave}
                disabled={saving || parsed === adjustment}
              >
                {saving ? "Sparar …" : "Spara"}
              </Button>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t pt-2.5">
            <dt className="text-sm font-medium">Prognos</dt>
            <dd className="font-mono text-base font-semibold">{formatSEK(forecast)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Utfall hittills</dt>
            <dd
              className={cn(
                "font-mono text-sm",
                overBudget && "font-medium text-destructive"
              )}
            >
              {formatSEK(outcome)}
            </dd>
          </div>
        </dl>
        {overBudget ? (
          <p className="text-xs text-destructive">
            Utfallet överstiger budget + godkända ÄTA.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
