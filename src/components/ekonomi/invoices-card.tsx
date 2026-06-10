"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { InvoiceStatus } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import {
  createInvoice,
  updateInvoiceStatus,
  updateInvoiceBudgetItem,
  deleteInvoice,
  type FormState,
} from "@/app/(app)/ekonomi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DeviationFlag } from "@/components/status-badges";
import { invoiceStatusLabels } from "@/lib/labels";
import { formatSEK } from "@/lib/format";

export interface InvoiceRow {
  id: string;
  supplier: string;
  amount: number;
  date: string; // formaterad ÅÅÅÅ-MM-DD
  status: InvoiceStatus;
  budgetItemId: string | null;
  note: string;
}

export interface BudgetItemOption {
  id: string;
  label: string;
}

export function InvoicesCard({
  projectId,
  invoices,
  budgetItems,
}: {
  projectId: string;
  invoices: InvoiceRow[];
  budgetItems: BudgetItemOption[];
}) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    createInvoice,
    undefined
  );

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fakturor</CardTitle>
        <CardDescription>
          Fakturor utan koppling till budgetpost flaggas. Utfall räknas på attesterade och
          betalda fakturor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leverantör</TableHead>
              <TableHead className="hidden md:table-cell">Datum</TableHead>
              <TableHead className="text-right">Belopp</TableHead>
              <TableHead className="hidden lg:table-cell">Budgetpost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                  Inga fakturor registrerade.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <p className="font-medium">{inv.supplier}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {inv.note ? (
                        <span className="text-xs text-muted-foreground">{inv.note}</span>
                      ) : null}
                      {!inv.budgetItemId ? (
                        <DeviationFlag>Saknar koppling</DeviationFlag>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {inv.date}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatSEK(inv.amount)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Select
                      value={inv.budgetItemId ?? "INGEN"}
                      onValueChange={(v) => {
                        const next = v === "INGEN" ? null : v ?? null;
                        if (next === inv.budgetItemId) return;
                        startTransition(() => updateInvoiceBudgetItem(inv.id, next));
                      }}
                    >
                      <SelectTrigger size="sm" className="w-44" aria-label="Budgetpost">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INGEN">Ingen koppling</SelectItem>
                        {budgetItems.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={inv.status}
                      onValueChange={(v) => {
                        if (!v || v === inv.status) return;
                        startTransition(() =>
                          updateInvoiceStatus(inv.id, v as InvoiceStatus)
                        );
                      }}
                    >
                      <SelectTrigger size="sm" className="w-32" aria-label="Fakturastatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(invoiceStatusLabels).map(([value, label]) => (
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
                      aria-label={`Ta bort fakturan från ${inv.supplier}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => startTransition(() => deleteInvoice(inv.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-2 border-t pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="min-w-44 flex-1">
            <Input name="supplier" placeholder="Leverantör" aria-label="Leverantör" required />
          </div>
          <Input
            name="amount"
            type="number"
            min={1}
            step={100}
            placeholder="Belopp"
            className="w-32 font-mono"
            aria-label="Belopp"
            required
          />
          <Input
            name="invoiceDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-40 font-mono"
            aria-label="Fakturadatum"
            required
          />
          <div className="w-44">
            <Select name="budgetItemId" defaultValue="INGEN">
              <SelectTrigger className="w-full" aria-label="Budgetpost">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INGEN">Ingen koppling</SelectItem>
                {budgetItems.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="secondary" disabled={pending}>
            <Plus className="size-4" />
            {pending ? "Registrerar …" : "Registrera"}
          </Button>
          {state?.error ? (
            <p className="w-full text-sm text-destructive">{state.error}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
