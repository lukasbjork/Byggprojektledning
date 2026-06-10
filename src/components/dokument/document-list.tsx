import { ChevronDown, Download, FileText } from "lucide-react";
import { documentCategoryLabels } from "@/lib/labels";
import { DocumentRowActions } from "./document-actions";
import type { DocumentCategory } from "@prisma/client";

export interface DocumentListItem {
  id: string;
  name: string;
  category: DocumentCategory;
  summary: string;
  versions: Array<{
    id: string;
    version: number;
    fileName: string;
    size: number;
    createdAt: string; // formaterad
  }>;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${bytes} B`;
}

/** Serverrenderad dokumentlista med versionshistorik i utfällbara rader. */
export function DocumentList({ documents }: { documents: DocumentListItem[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Inga dokument uppladdade ännu.</p>;
  }

  return (
    <ul className="divide-y">
      {documents.map((doc) => {
        const latest = doc.versions[0];
        return (
          <li key={doc.id} className="py-2.5">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={latest ? `/api/dokument/${latest.id}` : "#"}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {doc.name}
                  </a>
                  <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {documentCategoryLabels[doc.category]}
                  </span>
                  {doc.versions.length > 1 ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      v{latest?.version}
                    </span>
                  ) : null}
                </div>
                {doc.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {doc.summary}
                  </p>
                ) : null}
                {latest ? (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {latest.createdAt} · {formatSize(latest.size)}
                  </p>
                ) : null}

                {doc.versions.length > 1 ? (
                  <details className="group mt-1">
                    <summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                      Versionshistorik ({doc.versions.length})
                    </summary>
                    <ul className="mt-1 space-y-1 border-l pl-4">
                      {doc.versions.map((v) => (
                        <li key={v.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-muted-foreground">v{v.version}</span>
                          <span className="truncate text-muted-foreground">{v.fileName}</span>
                          <span className="font-mono text-muted-foreground">{v.createdAt}</span>
                          <a
                            href={`/api/dokument/${v.id}`}
                            className="inline-flex items-center gap-1 text-ritning hover:underline"
                          >
                            <Download className="size-3" />
                            Ladda ner
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
              {latest ? (
                <a
                  href={`/api/dokument/${latest.id}`}
                  className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Ladda ner ${doc.name}`}
                >
                  <Download className="size-4" />
                </a>
              ) : null}
              <DocumentRowActions documentId={doc.id} documentName={doc.name} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
