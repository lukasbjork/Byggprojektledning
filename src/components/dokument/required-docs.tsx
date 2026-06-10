"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createRequiredDocument,
  toggleRequiredDocument,
  deleteRequiredDocument,
  type FormState,
} from "@/app/(app)/dokument/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RequiredDocRow {
  id: string;
  name: string;
  fulfilled: boolean;
}

/** Redigerbar checklista över obligatoriska handlingar per projekt. */
export function RequiredDocs({
  projectId,
  docs,
}: {
  projectId: string;
  docs: RequiredDocRow[];
}) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    createRequiredDocument,
    undefined
  );

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  const missing = docs.filter((d) => !d.fulfilled).length;

  return (
    <div className="space-y-3">
      {missing > 0 ? (
        <p className="text-sm text-varsel">{missing} handlingar saknas.</p>
      ) : docs.length > 0 ? (
        <p className="text-sm text-godkand">Alla obligatoriska handlingar är på plats.</p>
      ) : null}

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Inga obligatoriska handlingar definierade ännu.
        </p>
      ) : (
        <ul className="divide-y">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={d.fulfilled}
                onChange={(e) =>
                  startTransition(() => toggleRequiredDocument(d.id, e.target.checked))
                }
                className="size-4 accent-foreground"
                aria-label={`${d.name} på plats`}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  d.fulfilled && "text-muted-foreground line-through"
                )}
              >
                {d.name}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Ta bort ${d.name}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => startTransition(() => deleteRequiredDocument(d.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex items-end gap-2 border-t pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex-1">
          <Input
            name="name"
            placeholder="Lägg till handling, t.ex. Bygglov …"
            aria-label="Handlingens namn"
            required
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          <Plus className="size-4" />
          Lägg till
        </Button>
        {state?.error ? (
          <p className="w-full text-sm text-destructive">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
