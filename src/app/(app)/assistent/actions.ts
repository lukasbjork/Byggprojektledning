"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Skapar en ny konversation, ev. kopplad till ett projekt. Returnerar id. */
export async function createConversation(projectId: string | null): Promise<string> {
  const conversation = await prisma.chatConversation.create({
    data: { projectId: projectId || null },
  });
  revalidatePath("/assistent");
  return conversation.id;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await prisma.chatConversation.delete({ where: { id: conversationId } });
  revalidatePath("/assistent");
}
