import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/format";
import {
  AssistantShell,
  type ChatMessageView,
  type ConversationListItem,
} from "./assistant-shell";

export const metadata: Metadata = { title: "AI-assistent" };
export const dynamic = "force-dynamic";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ samtal?: string; projekt?: string }>;
}) {
  const { samtal, projekt } = await searchParams;

  const [conversations, projects, selected] = await Promise.all([
    prisma.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { project: { select: { projectNumber: true } } },
    }),
    prisma.project.findMany({
      where: { status: { not: "AVSLUTAT" } },
      orderBy: { projectNumber: "asc" },
      select: { id: true, name: true, projectNumber: true },
    }),
    samtal
      ? prisma.chatConversation.findUnique({
          where: { id: samtal },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : Promise.resolve(null),
  ]);

  const conversationItems: ConversationListItem[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    projectLabel: c.project?.projectNumber ?? null,
    updated: formatRelative(c.updatedAt),
  }));

  const messages: ChatMessageView[] =
    selected?.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI-assistent</h1>
        <p className="text-sm text-muted-foreground">
          Erfaren byggprojektassistent med tillgång till din projektdata
        </p>
      </div>
      <AssistantShell
        conversations={conversationItems}
        conversationId={selected?.id ?? null}
        initialMessages={messages}
        projects={projects.map((p) => ({ id: p.id, label: `${p.projectNumber} · ${p.name}` }))}
        defaultProjectId={projekt ?? null}
      />
    </div>
  );
}
