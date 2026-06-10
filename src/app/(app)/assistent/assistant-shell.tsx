"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { createConversation, deleteConversation } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownView } from "@/components/markdown-view";
import { cn } from "@/lib/utils";

export interface ChatMessageView {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  projectLabel: string | null;
  updated: string;
}

export interface ProjectOption {
  id: string;
  label: string;
}

const QUICK_COMMANDS = [
  "Sammanfatta projektläget",
  "Skriv ett veckobrev till beställaren",
  "Lista mina största risker just nu",
  "Skriv ett utkast till statusmejl",
];

export function AssistantShell({
  conversations,
  conversationId,
  initialMessages,
  projects,
  defaultProjectId,
}: {
  conversations: ConversationListItem[];
  conversationId: string | null;
  initialMessages: ChatMessageView[];
  projects: ProjectOption[];
  defaultProjectId: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "PORTFOLJ");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Synka när användaren byter konversation (server skickar nya props)
  useEffect(() => {
    setMessages(initialMessages);
  }, [conversationId, initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamText]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    setStreamText("");
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: "USER", content },
    ]);

    try {
      // Skapa konversationen vid första meddelandet
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation(projectId === "PORTFOLJ" ? null : projectId);
      }

      const res = await fetch("/api/assistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, content }),
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
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "ASSISTANT", content: full },
      ]);
      setStreamText("");
      if (!conversationId && convId) {
        router.replace(`/assistent?samtal=${convId}`);
        router.refresh();
      }
    } catch (e) {
      // Behåll användarens text i inmatningen vid fel
      setInput(content);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("tmp-")));
      toast.error(e instanceof Error ? e.message : "Något gick fel.", { duration: 8000 });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      {/* Konversationslista */}
      <div className="space-y-2">
        <Button
          variant="secondary"
          className="w-full"
          render={<Link href="/assistent" />}
        >
          <Plus className="size-4" />
          Ny konversation
        </Button>
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id} className="group relative">
              <Link
                href={`/assistent?samtal=${c.id}`}
                className={cn(
                  "block rounded-md px-3 py-2 pr-8 text-sm transition-colors",
                  c.id === conversationId
                    ? "bg-accent font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <span className="line-clamp-1">{c.title}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {c.projectLabel ?? "Alla projekt"} · {c.updated}
                </span>
              </Link>
              <button
                aria-label={`Ta bort konversationen ${c.title}`}
                className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-destructive group-hover:block"
                onClick={() =>
                  startTransition(async () => {
                    await deleteConversation(c.id);
                    if (c.id === conversationId) router.replace("/assistent");
                    router.refresh();
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Chatten */}
      <Card className="flex min-h-[70svh] flex-col p-0">
        {!conversationId ? (
          <div className="flex items-center gap-2 border-b p-3">
            <span className="text-sm text-muted-foreground">Kontext:</span>
            <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
              <SelectTrigger size="sm" className="w-64" aria-label="Projektkontext">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PORTFOLJ">Alla aktiva projekt</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !streaming ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Ställ en fråga om dina projekt — assistenten har tillgång till status,
                ekonomi, åtgärder, ÄTA och risker.
              </p>
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3.5 py-2.5",
                m.role === "USER"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "border bg-card"
              )}
            >
              {m.role === "USER" ? (
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              ) : (
                <MarkdownView markdown={m.content} />
              )}
            </div>
          ))}
          {streaming ? (
            <div className="max-w-[85%] rounded-lg border bg-card px-3.5 py-2.5">
              {streamText ? (
                <MarkdownView markdown={streamText} />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2 border-t p-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="xs"
                disabled={streaming}
                onClick={() => void send(cmd)}
              >
                {cmd}
              </Button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              placeholder="Skriv din fråga … (Enter skickar, Shift+Enter ny rad)"
              className="min-h-0 flex-1 resize-none"
              disabled={streaming}
            />
            <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Skicka">
              {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
