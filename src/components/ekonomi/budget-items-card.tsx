"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  saveBudgetItem,
  deleteBudgetItem,
  type FormState,
} from "@/app/(app)/ekonomi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatSEK } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BudgetItemRow {
  id: string;
  account: string;
  description: string;
  budgeted: number;
  outcome: number;
}

export function BudgetItemsCard({
  projectId,
  items,
}: {
  projectId: string;
  items: BudgetItemRow[];
}) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<BudgetItemRow | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, addPending] = useActionState<FormState | undefined, FormData>(
    saveBudgetItem,
    undefined
  );
  const [editState, editAction, editPending] = useActionState<
    FormState | undefined,
    FormData
  >(saveBudgetItem, undefined);

  useEffect(() => {
    if (addState && !addState.error) addFormRef.current?.reset();
  }, [addState]);

  useEffect(() => {
    if (editState && !editState.error) setEditing(null);
  }, [editState]);

  const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0);
  const totalOutcome = items.reduce((s, i) => s + i.outcome, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budgetposter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Konto / post</TableHead>
              <TableHead className="text-right">Budgeterat</TableHead>
              <TableHead className="text-right">Utfall</TableHead>
              <TableHead>Avvikelse</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  Inga budgetposter ännu.
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => {
                const over = i.outcome > i.budgeted && i.budgeted > 0;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <p className="font-medium">{i.account}</p>
                      {i.description ? (
                        <p className="text-xs text-muted-foreground">{i.description}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatSEK(i.budgeted)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-xs",
                        over && "font-medium text-destructive"
                      )}
                    >
                      {formatSEK(i.outcome)}
                    </TableCell>
                    <TableCell>
                      {over ? (
                        <DeviationFlag severity="destruktiv">Över budget</DeviationFlag>
                      ) : i.budgeted > 0 && i.outcome > 0.9 * i.budgeted ? (
                        <DeviationFlag>&gt; 90 %</DeviationFlag>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Redigera ${i.account}`}
                          onClick={() => setEditing(i)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ta bort ${i.account}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => startTransition(() => deleteBudgetItem(i.id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {items.length > 0 ? (
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Summa</TableCell>
                <TableCell className="text-right font-mono text-xs font-medium">
                  {formatSEK(totalBudgeted)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-xs font-medium",
                    totalOutcome > totalBudgeted && totalBudgeted > 0 && "text-destructive"
                  )}
                >
                  {formatSEK(totalOutcome)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>

        <form
          ref={addFormRef}
          action={addAction}
          className="flex flex-wrap items-end gap-2 border-t pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="min-w-40 flex-1">
            <Input name="account" placeholder="Konto, t.ex. 02 Stomme" aria-label="Konto" required />
          </div>
          <div className="min-w-40 flex-1">
            <Input name="description" placeholder="Beskrivning (valfri)" aria-label="Beskrivning" />
          </div>
          <Input
            name="budgeted"
            type="number"
            min={0}
            step={1000}
            placeholder="Belopp"
            className="w-36 font-mono"
            aria-label="Budgeterat belopp"
            required
          />
          <Button type="submit" variant="secondary" disabled={addPending}>
            <Plus className="size-4" />
            {addPending ? "Lägger till …" : "Lägg till"}
          </Button>
          {addState?.error ? (
            <p className="w-full text-sm text-destructive">{addState.error}</p>
          ) : null}
        </form>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera budgetpost</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form action={editAction} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <div className="space-y-2">
                <Label htmlFor="edit-account">Konto / post</Label>
                <Input id="edit-account" name="account" defaultValue={editing.account} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Beskrivning</Label>
                <Input id="edit-description" name="description" defaultValue={editing.description} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budgeted">Budgeterat belopp (SEK)</Label>
                <Input
                  id="edit-budgeted"
                  name="budgeted"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={editing.budgeted}
                  className="font-mono"
                  required
                />
              </div>
              {editState?.error ? (
                <p className="text-sm text-destructive">{editState.error}</p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={editPending}>
                  {editPending ? "Sparar …" : "Spara"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
