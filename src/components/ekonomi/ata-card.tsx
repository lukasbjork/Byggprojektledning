"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { AtaStatus } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  saveChangeOrder,
  updateChangeOrderStatus,
  deleteChangeOrder,
  type FormState,
} from "@/app/(app)/ekonomi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ataStatusLabels } from "@/lib/labels";
import { formatSEK } from "@/lib/format";

export interface AtaRow {
  id: string;
  number: number;
  title: string;
  description: string;
  date: string; // formaterad
  amount: number;
  status: AtaStatus;
  note: string;
}

export function AtaCard({
  projectId,
  atas,
  originalBudget,
}: {
  projectId: string;
  atas: AtaRow[];
  originalBudget: number;
}) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<AtaRow | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, addPending] = useActionState<FormState | undefined, FormData>(
    saveChangeOrder,
    undefined
  );
  const [editState, editAction, editPending] = useActionState<
    FormState | undefined,
    FormData
  >(saveChangeOrder, undefined);

  useEffect(() => {
    if (addState && !addState.error) addFormRef.current?.reset();
  }, [addState]);

  useEffect(() => {
    if (editState && !editState.error) setEditing(null);
  }, [editState]);

  const approved = atas.filter((a) => a.status === "GODKAND" || a.status === "FAKTURERAD");
  const approvedSum = approved.reduce((s, a) => s + a.amount, 0);
  const approvedShare =
    originalBudget > 0 ? Math.round((approvedSum / originalBudget) * 1000) / 10 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ÄTA-register</CardTitle>
        <CardDescription>
          Ändrings-, tilläggs- och avgående arbeten med löpnummer per projekt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Nr</TableHead>
              <TableHead>Beskrivning</TableHead>
              <TableHead className="hidden md:table-cell">Datum</TableHead>
              <TableHead className="text-right">Belopp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {atas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                  Inga ÄTA anmälda.
                </TableCell>
              </TableRow>
            ) : (
              atas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.number}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{a.title}</p>
                    {a.description ? (
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    ) : null}
                    {a.note ? (
                      <p className="text-xs italic text-muted-foreground">Ant: {a.note}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {a.date}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {a.amount > 0 ? formatSEK(a.amount) : "–"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={a.status}
                      onValueChange={(v) => {
                        if (!v || v === a.status) return;
                        startTransition(() =>
                          updateChangeOrderStatus(a.id, v as AtaStatus)
                        );
                      }}
                    >
                      <SelectTrigger size="sm" className="w-32" aria-label="ÄTA-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ataStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Redigera ÄTA ${a.number}`}
                        onClick={() => setEditing(a)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ta bort ÄTA ${a.number}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => startTransition(() => deleteChangeOrder(a.id))}
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

        <p className="border-t pt-3 text-sm">
          Godkända ÄTA:{" "}
          <span className="font-mono font-medium">{formatSEK(approvedSum)}</span>
          {approvedShare !== null ? (
            <span className="text-muted-foreground">
              {" "}
              ({String(approvedShare).replace(".", ",")} % av ursprunglig budget)
            </span>
          ) : null}
        </p>

        <form
          ref={addFormRef}
          action={addAction}
          className="flex flex-wrap items-end gap-2 border-t pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="min-w-48 flex-1">
            <Input name="title" placeholder="Ny ÄTA – vad avser den?" aria-label="Rubrik" required />
          </div>
          <Input
            name="amount"
            type="number"
            min={0}
            step={1000}
            placeholder="Belopp (0 om ej prissatt)"
            className="w-44 font-mono"
            aria-label="Belopp"
          />
          <Button type="submit" variant="secondary" disabled={addPending}>
            <Plus className="size-4" />
            {addPending ? "Anmäler …" : "Anmäl ÄTA"}
          </Button>
          {addState?.error ? (
            <p className="w-full text-sm text-destructive">{addState.error}</p>
          ) : null}
        </form>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera ÄTA {editing?.number}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form action={editAction} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="status" value={editing.status} />
              <div className="space-y-2">
                <Label htmlFor="ata-title">Rubrik</Label>
                <Input id="ata-title" name="title" defaultValue={editing.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ata-description">Beskrivning</Label>
                <Textarea
                  id="ata-description"
                  name="description"
                  rows={2}
                  defaultValue={editing.description}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ata-amount">Belopp (SEK)</Label>
                <Input
                  id="ata-amount"
                  name="amount"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={editing.amount}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ata-note">Anteckningar</Label>
                <Input id="ata-note" name="note" defaultValue={editing.note} />
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
