"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/(app)/automationer/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface NotificationView {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  time: string; // relativ tid
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationView[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function open(n: NotificationView) {
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id);
      if (n.link) router.push(n.link);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`Notiser (${unreadCount} olästa)`} className="relative" />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-varsel font-mono text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notiser</p>
          {unreadCount > 0 ? (
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead();
                  router.refresh();
                })
              }
            >
              <CheckCheck className="size-3.5" />
              Markera alla som lästa
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Inga notiser. Automationerna säger till när något behöver din uppmärksamhet.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => open(n)}
                    className={cn(
                      "block w-full px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
                      !n.read && "bg-varsel/5"
                    )}
                  >
                    <span className="flex items-start gap-2">
                      {!n.read ? (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-varsel" />
                      ) : (
                        <span className="mt-1.5 size-1.5 shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug">{n.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {n.message ? `${n.message} · ` : ""}
                          {n.time}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
