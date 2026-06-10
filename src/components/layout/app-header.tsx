"use client";

import { useState } from "react";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Date().toLocaleDateString("sv-SE");

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      {/* Mobilmeny */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Öppna meny" />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="sr-only">Meny</SheetTitle>
            <Brand />
          </SheetHeader>
          <div className="p-3">
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <span className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
        {today}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notiser (kommer i fas 6)"
                className="text-muted-foreground/60"
              />
            }
          >
            <Bell className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Notiscentral byggs i fas 6</TooltipContent>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
