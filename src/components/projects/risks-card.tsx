"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { RiskLevel, RiskStatus } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { saveRisk, updateRiskStatus, deleteRisk, type FormState } from "@/app/(app)/projekt/risk-actions";
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
import { riskLevelLabels, riskStatusLabels } from "@/lib/labels";

export interface RiskRow {
  id: string;
  title: string;
  description: string;
  probability: RiskLevel;
  consequence: RiskLevel;
  status: RiskStatus;
  action: string;
}

export function RisksCard({ projectId, risks }: { projectId: string; risks: RiskRow[] }) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    saveRisk,
    undefined
  );

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Riskregister</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga risker registrerade.</p>
        ) : (
          <ul className="divide-y">
            {risks.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Sannolikhet: {riskLevelLabels[r.probability]} · Konsekvens:{" "}
                    {riskLevelLabels[r.consequence]}
                    {r.action ? ` · Hantering: ${r.action}` : ""}
                  </p>
                </div>
                <Select
                  value={r.status}
                  onValueChange={(v) => {
                    if (!v || v === r.status) return;
                    startTransition(() => updateRiskStatus(r.id, v as RiskStatus));
                  }}
                >
                  <SelectTrigger size="sm" className="w-32" aria-label="Riskstatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(riskStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ta bort risken ${r.title}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => startTransition(() => deleteRisk(r.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-2 border-t pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="min-w-48 flex-1">
            <Input name="title" placeholder="Ny risk …" aria-label="Riskens rubrik" required />
          </div>
          <div className="w-36">
            <Select name="probability" defaultValue="MEDEL">
              <SelectTrigger className="w-full" aria-label="Sannolikhet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(riskLevelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    Sannolikhet: {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Select name="consequence" defaultValue="MEDEL">
              <SelectTrigger className="w-full" aria-label="Konsekvens">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(riskLevelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    Konsekvens: {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input name="action" placeholder="Hantering (valfri)" className="w-48" aria-label="Hantering" />
          <Button type="submit" variant="secondary" disabled={pending}>
            <Plus className="size-4" />
            Lägg till
          </Button>
          {state?.error ? (
            <p className="w-full text-sm text-destructive">{state.error}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
