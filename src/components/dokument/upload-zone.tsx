"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudUpload, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { documentCategoryLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function UploadZone({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("RITNINGAR");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("category", category);
      form.set("file", file);
      try {
        const res = await fetch("/api/dokument/upload", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; version?: number; error?: string }
          | null;
        if (!res.ok || !json?.ok) {
          toast.error(json?.error ?? `Uppladdningen av ${file.name} misslyckades.`);
        } else {
          ok++;
          if (json.version && json.version > 1) {
            toast.success(`${file.name} sparades som version ${json.version}.`);
          }
        }
      } catch {
        toast.error(`Uppladdningen av ${file.name} misslyckades.`);
      }
    }
    setUploading(false);
    if (ok > 0) {
      if (ok > 1) toast.success(`${ok} filer uppladdade.`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Kategori:</span>
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger size="sm" className="w-40" aria-label="Dokumentkategori">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(documentCategoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
        disabled={uploading}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-varsel bg-varsel/5" : "hover:bg-accent/40",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <CloudUpload className="size-6 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {uploading ? "Laddar upp …" : "Släpp filer här eller klicka för att välja"}
        </p>
        <p className="text-xs text-muted-foreground">
          Max 4 MB per fil · samma filnamn skapar en ny version
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
