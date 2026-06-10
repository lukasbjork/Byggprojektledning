import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { runAutomations } from "@/lib/automations";
import { formatRelative } from "@/lib/format";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AppHeader } from "@/components/layout/app-header";
import type { NotificationView } from "@/components/layout/notification-bell";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Regelmotorn körs vid sidladdning (självbegränsad till en gång i timmen)
  await runAutomations("sidladdning").catch(() => null);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.notification.count({ where: { read: false } }),
  ]);

  const notificationViews: NotificationView[] = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    time: formatRelative(n.createdAt),
  }));

  return (
    <div className="flex min-h-svh w-full">
      {/* Sidomenyn delar bakgrund med innehållsytan — en hårfin kant räcker som avgränsning */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r md:flex">
        <div className="border-b p-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              Logga ut
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader notifications={notificationViews} unreadCount={unreadCount} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
