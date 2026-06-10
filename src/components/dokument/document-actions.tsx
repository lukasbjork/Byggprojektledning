"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { aiCategorizeDocument, deleteDocument } from "@/app/(app)/dokument/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentCategoryLabels } from "@/lib/labels";

/** Knappar per dokument: AI-kategorisering och borttagning. */
export function DocumentRowActions({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName: string;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [text, setText] = useState("");
  const [working, startTransition] = useTransition();

  function handleCategorize() {
    startTransition(async () => {
      const result = await aiCategorizeDocument(documentId, text);
      if (result.error) {
        toast.error(result.error, { duration: 8000 });
        return; // texten behålls i rutan
      }
      toast.success(
        `Sparat: ${result.category ? documentCategoryLabels[result.category] : "kategori oförändrad"}.`
      );
      setAiOpen(false);
      setText("");
    });
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`AI-kategorisera ${documentName}`}
        title="AI: föreslå kategori + sammanfattning"
        onClick={() => setAiOpen(true)}
      >
        <Sparkles className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Ta bort ${documentName}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI-kategorisera ”{documentName}”</DialogTitle>
            <DialogDescription>
              Klistra in textinnehåll från dokumentet. AI:n föreslår kategori och en kort
              sammanfattning som sparas som metadata.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Klistra in dokumentets text här …"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={working}>
              Avbryt
            </Button>
            <Button onClick={handleCategorize} disabled={working || !text.trim()}>
              {working ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {working ? "Analyserar …" : "Analysera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort dokument?</DialogTitle>
            <DialogDescription>
              ”{documentName}” och alla dess versioner tas bort permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={working}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={working}
              onClick={() =>
                startTransition(async () => {
                  await deleteDocument(documentId);
                  toast.success("Dokumentet togs bort.");
                  setDeleteOpen(false);
                })
              }
            >
              {working ? "Tar bort …" : "Ta bort"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
