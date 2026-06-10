"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMeeting } from "@/app/(app)/moten/actions";
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

export function DeleteMeetingButton({
  meetingId,
  meetingTitle,
}: {
  meetingId: string;
  meetingTitle: string;
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
          <DialogTitle>Ta bort möte?</DialogTitle>
          <DialogDescription>
            ”{meetingTitle}” och dess protokoll tas bort permanent. Åtgärdspunkter som redan
            godkänts ligger kvar på projektet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Avbryt
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(() => deleteMeeting(meetingId))}
          >
            {pending ? "Tar bort …" : "Ta bort mötet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
