"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/app/(app)/projekt/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="text-destructive hover:text-destructive" />
        }
      >
        <Trash2 className="size-4" />
        Ta bort
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort projekt?</DialogTitle>
          <DialogDescription>
            ”{projectName}” tas bort permanent tillsammans med alla möten, åtgärder,
            budgetposter, ÄTA, dokument och risker som hör till projektet. Detta går
            inte att ångra.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Avbryt
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(() => deleteProject(projectId))}
          >
            {pending ? "Tar bort …" : "Ta bort projektet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
