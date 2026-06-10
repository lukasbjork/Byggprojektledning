"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runAutomations, type AutomationRunResult } from "@/lib/automations";

export async function toggleRule(ruleId: string, active: boolean): Promise<void> {
  await prisma.automationRule.update({ where: { id: ruleId }, data: { active } });
  revalidatePath("/automationer");
}

export async function updateRuleThresholds(
  ruleId: string,
  thresholdDays: number | null,
  thresholdPercent: number | null
): Promise<void> {
  await prisma.automationRule.update({
    where: { id: ruleId },
    data: {
      thresholdDays: thresholdDays !== null && thresholdDays > 0 ? thresholdDays : null,
      thresholdPercent:
        thresholdPercent !== null && thresholdPercent > 0 ? thresholdPercent : null,
    },
  });
  revalidatePath("/automationer");
}

export async function runAutomationsNow(): Promise<AutomationRunResult> {
  const result = await runAutomations("manuell");
  revalidatePath("/automationer");
  revalidatePath("/");
  return result;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
  revalidatePath("/");
}

export async function markAllNotificationsRead(): Promise<void> {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/");
}
