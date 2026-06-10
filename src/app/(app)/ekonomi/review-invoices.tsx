"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ShieldAlert } from "lucide-react";
import { updateInvoiceStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/format";

export interface ReviewInvoiceRow {
  id: string;
  supplier: string;
  amount: number;
  date: string;
  projectId: string;
  projectLabel: string;
}

/** Lista över fakturor i status "Att granska" med snabbknappar för attest/bestridande. */
export function ReviewInvoices({ rows }: { rows: ReviewInvoiceRow[] }) {
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Inga fakturor väntar på granskning. Bra jobbat!
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.supplier}</p>
            <p className="truncate text-xs text-muted-foreground">
              <Link href={`/projekt/${r.projectId}?flik=ekonomi`} className="hover:underline">
                {r.projectLabel}
              </Link>
              {" · "}
              <span className="font-mono">{r.date}</span>
            </p>
          </div>
          <span className="font-mono text-sm">{formatSEK(r.amount)}</span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateInvoiceStatus(r.id, "ATTESTERAD");
                  toast.success(`Fakturan från ${r.supplier} attesterades.`);
                })
              }
            >
              <Check className="size-3.5" />
              Attestera
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateInvoiceStatus(r.id, "BESTRIDEN");
                  toast.success(`Fakturan från ${r.supplier} markerades som bestriden.`);
                })
              }
            >
              <ShieldAlert className="size-3.5" />
              Bestrid
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
