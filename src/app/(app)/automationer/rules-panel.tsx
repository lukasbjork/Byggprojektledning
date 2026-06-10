"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Play, Save } from "lucide-react";
import { toggleRule, updateRuleThresholds, runAutomationsNow } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export interface RuleView {
  id: string;
  name: string;
  description: string;
  active: boolean;
  hasDays: boolean;
  hasPercent: boolean;
  thresholdDays: number | null;
  thresholdPercent: number | null;
}

function RuleRow({ rule }: { rule: RuleView }) {
  const [days, setDays] = useState(rule.thresholdDays?.toString() ?? "");
  const [percent, setPercent] = useState(rule.thresholdPercent?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  const dirty =
    (rule.hasDays && days !== (rule.thresholdDays?.toString() ?? "")) ||
    (rule.hasPercent && percent !== (rule.thresholdPercent?.toString() ?? ""));

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Switch
        checked={rule.active}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await toggleRule(rule.id, checked === true);
            toast.success(
              checked ? `”${rule.name}” aktiverades.` : `”${rule.name}” avaktiverades.`
            );
          })
        }
        aria-label={`Aktivera ${rule.name}`}
      />
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium">{rule.name}</p>
        <p className="text-xs text-muted-foreground">{rule.description}</p>
      </div>
      {rule.hasDays ? (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          N =
          <Input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="h-8 w-20 font-mono"
            aria-label={`Antal dagar för ${rule.name}`}
          />
          dagar
        </label>
      ) : null}
      {rule.hasPercent ? (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Tröskel
          <Input
            type="number"
            min={1}
            max={100}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="h-8 w-20 font-mono"
            aria-label={`Procenttröskel för ${rule.name}`}
          />
          %
        </label>
      ) : null}
      {dirty ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updateRuleThresholds(
                rule.id,
                rule.hasDays ? Number(days) || null : null,
                rule.hasPercent ? Number(percent) || null : null
              );
              toast.success("Tröskelvärdet sparades.");
            })
          }
        >
          <Save className="size-3.5" />
          Spara
        </Button>
      ) : null}
    </li>
  );
}

export function RulesPanel({ rules }: { rules: RuleView[] }) {
  const [running, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Regler</CardTitle>
          <CardDescription>
            Reglerna kontrolleras automatiskt vid sidladdning (högst en gång i timmen) och
            när du kör dem manuellt.
          </CardDescription>
        </div>
        <Button
          disabled={running}
          onClick={() =>
            startTransition(async () => {
              const result = await runAutomationsNow();
              toast.success(
                result.created > 0
                  ? `Klart — ${result.created} nya notiser skapades.`
                  : "Klart — inga nya varningar just nu."
              );
            })
          }
        >
          <Play className="size-4" />
          {running ? "Kör …" : "Kör automationer nu"}
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {rules.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
