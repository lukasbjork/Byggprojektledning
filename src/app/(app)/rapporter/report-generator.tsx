"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileBarChart, Loader2, Printer, Save, Sparkles } from "lucide-react";
import { saveReport } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownView } from "@/components/markdown-view";

export interface ProjectOption {
  id: string;
  label: string;
  name: string;
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function ReportGenerator({
  projects,
  defaultProjectId,
  defaultType,
}: {
  projects: ProjectOption[];
  defaultProjectId: string | null;
  defaultType: string | null;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [type, setType] = useState(defaultType === "MANADSRAPPORT" ? "MANADSRAPPORT" : "VECKORAPPORT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [streamText, setStreamText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, startSave] = useTransition();

  function defaultTitle(): string {
    const project = projects.find((p) => p.id === projectId);
    const now = new Date();
    return type === "VECKORAPPORT"
      ? `Veckorapport v.${isoWeek(now)} – ${project?.name ?? ""}`
      : `Månadsrapport ${now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })} – ${project?.name ?? ""}`;
  }

  async function handleGenerate() {
    if (!projectId) {
      toast.error("Välj projekt först.");
      return;
    }
    setGenerating(true);
    setStreamText("");
    try {
      const res = await fetch("/api/rapporter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "AI-anropet misslyckades.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamText(full);
      }
      setContent(full.trim());
      setTitle(defaultTitle());
      setStreamText("");
      toast.success("Utkastet är klart — granska, justera och spara.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel.", { duration: 8000 });
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    if (!content.trim() || !title.trim()) {
      toast.error("Rubrik och innehåll krävs.");
      return;
    }
    startSave(async () => {
      const id = await saveReport({
        projectId,
        type: type as "VECKORAPPORT" | "MANADSRAPPORT",
        title,
        content,
      });
      toast.success("Rapporten sparades i arkivet.");
      setContent("");
      setTitle("");
      router.refresh();
      window.open(`/rapporter/${id}/utskrift`, "_blank");
    });
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "rapport").replace(/[^\wåäöÅÄÖ. -]/g, "").trim()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generera rapport</CardTitle>
        <CardDescription>
          AI:n sammanställer status, framdrift, ekonomi, åtgärder, ÄTA och risker enligt
          rapportmallen. Utkastet kan redigeras innan det sparas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-64">
            <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
              <SelectTrigger className="w-full" aria-label="Projekt">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="w-full" aria-label="Rapporttyp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VECKORAPPORT">Veckorapport</SelectItem>
                <SelectItem value="MANADSRAPPORT">Månadsrapport</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating ? "Genererar …" : "Generera utkast"}
          </Button>
        </div>

        {generating ? (
          <div className="rounded-md border p-4">
            {streamText ? (
              <MarkdownView markdown={streamText} />
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileBarChart className="size-4" />
                Sammanställer projektdata …
              </p>
            )}
          </div>
        ) : null}

        {!generating && content ? (
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rapportens rubrik"
              aria-label="Rapportens rubrik"
            />
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Förhandsgranska</TabsTrigger>
                <TabsTrigger value="edit">Redigera</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-3 rounded-md border p-4">
                <MarkdownView markdown={content} />
              </TabsContent>
              <TabsContent value="edit" className="mt-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={18}
                  className="font-mono text-xs"
                />
              </TabsContent>
            </Tabs>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Sparar …" : "Spara i arkivet"}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="size-4" />
                Ladda ner .md
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Printer className="size-4" />
                Spara + skriv ut/PDF
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
