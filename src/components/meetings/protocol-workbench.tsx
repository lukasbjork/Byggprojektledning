"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Save, Download, Printer, Loader2 } from "lucide-react";
import {
  saveRawNotes,
  saveProtocol,
  approveActionItems,
} from "@/app/(app)/moten/actions";
import { ATGARDER_MARKER, parseProtocolResponse, type SuggestedAction } from "@/lib/protokoll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownView } from "@/components/markdown-view";

interface EditableSuggestion extends SuggestedAction {
  include: boolean;
}

export function ProtocolWorkbench({
  meetingId,
  meetingTitle,
  initialRawNotes,
  initialProtocol,
}: {
  meetingId: string;
  meetingTitle: string;
  initialRawNotes: string;
  initialProtocol: string;
}) {
  const router = useRouter();
  const [rawNotes, setRawNotes] = useState(initialRawNotes);
  const [protocol, setProtocol] = useState(initialProtocol);
  const [streamText, setStreamText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [savingProtocol, startProtocolSave] = useTransition();
  const [savingActions, startActionsSave] = useTransition();

  async function handleGenerate() {
    if (!rawNotes.trim()) {
      toast.error("Klistra in mötesanteckningar först.");
      return;
    }
    setGenerating(true);
    setStreamText("");
    try {
      // 1. Spara alltid anteckningarna först — texten får aldrig gå förlorad
      await saveRawNotes(meetingId, rawNotes);

      // 2. Streama AI-svaret
      const res = await fetch("/api/moten/protokoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "AI-anropet misslyckades. Försök igen.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamText(acc);
      }

      // 3. Dela upp i protokoll + åtgärdsförslag
      const parsed = parseProtocolResponse(acc);
      setProtocol(parsed.protocol);
      setSuggestions(parsed.actions.map((a) => ({ ...a, include: true })));
      if (parsed.actionsParseFailed) {
        toast.warning(
          "Protokollet skapades, men åtgärdsförslagen kunde inte tolkas. Lägg till åtgärder manuellt under Åtgärder."
        );
      } else if (parsed.actions.length === 0) {
        toast.info("Protokollet skapades. Inga åtgärdspunkter hittades i anteckningarna.");
      } else {
        toast.success(
          `Protokoll + ${parsed.actions.length} åtgärdsförslag klara. Granska och spara nedan.`
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel vid AI-anropet.", {
        duration: 8000,
      });
    } finally {
      setGenerating(false);
    }
  }

  function handleSaveNotes() {
    startProtocolSave(async () => {
      await saveRawNotes(meetingId, rawNotes);
      toast.success("Anteckningarna sparades.");
    });
  }

  function handleSaveProtocol() {
    startProtocolSave(async () => {
      await saveProtocol(meetingId, protocol);
      toast.success("Protokollet sparades.");
    });
  }

  function handleDownload() {
    const blob = new Blob([protocol], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meetingTitle.replace(/[^\wåäöÅÄÖ -]/g, "").trim() || "protokoll"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    // Spara först så att utskriftsvyn (som läser från databasen) är aktuell
    startProtocolSave(async () => {
      await saveProtocol(meetingId, protocol);
      window.open(`/moten/${meetingId}/utskrift`, "_blank");
    });
  }

  function updateSuggestion(index: number, patch: Partial<EditableSuggestion>) {
    setSuggestions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function handleApprove() {
    const included = suggestions.filter((s) => s.include && s.title.trim());
    if (included.length === 0) {
      toast.error("Inga åtgärder är markerade.");
      return;
    }
    startActionsSave(async () => {
      const { created } = await approveActionItems(meetingId, included);
      setSuggestions((prev) => prev.filter((s) => !s.include || !s.title.trim()));
      toast.success(`${created} åtgärdspunkter sparades.`);
      router.refresh();
    });
  }

  const includedCount = suggestions.filter((s) => s.include && s.title.trim()).length;
  // Under streaming visas bara protokolldelen (allt före åtgärdsmarkören)
  const livePreview = streamText.split(ATGARDER_MARKER)[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mötesanteckningar</CardTitle>
          <CardDescription>
            Klistra in råa anteckningar eller ett transkript (t.ex. från Teams). Anteckningarna
            sparas alltid innan AI-anropet — texten går aldrig förlorad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            rows={10}
            placeholder={
              "Närvarande: Lukas, Anna (NCC) …\nStommen två veckor sen, NCC tar fram ny tidplan till fredag …"
            }
            disabled={generating}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {generating ? "Genererar …" : "Generera protokoll med AI"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveNotes}
              disabled={generating || savingProtocol}
            >
              Spara anteckningar
            </Button>
          </div>
        </CardContent>
      </Card>

      {generating ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="size-4 animate-spin text-varsel" />
              Protokoll skapas …
            </CardTitle>
          </CardHeader>
          <CardContent>
            {livePreview ? (
              <MarkdownView markdown={livePreview} />
            ) : (
              <p className="text-sm text-muted-foreground">Väntar på svar från AI:n …</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!generating && protocol ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Protokoll</CardTitle>
            <CardDescription>
              Granska och justera innan du sparar. Export: Markdown-fil eller utskrift
              (spara som PDF i utskriftsdialogen).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Förhandsgranska</TabsTrigger>
                <TabsTrigger value="edit">Redigera</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-3 rounded-md border p-4">
                <MarkdownView markdown={protocol} />
              </TabsContent>
              <TabsContent value="edit" className="mt-3">
                <Textarea
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  rows={18}
                  className="font-mono text-xs"
                />
              </TabsContent>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSaveProtocol} disabled={savingProtocol}>
                <Save className="size-4" />
                {savingProtocol ? "Sparar …" : "Spara protokoll"}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="size-4" />
                Ladda ner .md
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={savingProtocol}>
                <Printer className="size-4" />
                Skriv ut / PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {suggestions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Föreslagna åtgärder</CardTitle>
            <CardDescription>
              Redigera, bocka ur det som inte ska med, och spara. Godkända åtgärder kopplas
              till mötet och projektet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-2.5"
                >
                  <input
                    type="checkbox"
                    checked={s.include}
                    onChange={(e) => updateSuggestion(i, { include: e.target.checked })}
                    className="size-4 accent-foreground"
                    aria-label="Ta med åtgärden"
                  />
                  <Input
                    value={s.title}
                    onChange={(e) => updateSuggestion(i, { title: e.target.value })}
                    className="min-w-48 flex-1"
                    aria-label="Åtgärdens rubrik"
                  />
                  <Input
                    value={s.responsible ?? ""}
                    onChange={(e) =>
                      updateSuggestion(i, { responsible: e.target.value || null })
                    }
                    placeholder="Ansvarig"
                    className="w-40"
                    aria-label="Ansvarig"
                  />
                  <Input
                    type="date"
                    value={s.deadline ?? ""}
                    onChange={(e) => updateSuggestion(i, { deadline: e.target.value || null })}
                    className="w-40 font-mono"
                    aria-label="Deadline"
                  />
                </li>
              ))}
            </ul>
            <Button onClick={handleApprove} disabled={savingActions || includedCount === 0}>
              {savingActions
                ? "Sparar …"
                : `Spara ${includedCount} godkända åtgärder`}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
