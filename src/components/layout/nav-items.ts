import {
  LayoutDashboard,
  HardHat,
  Sparkles,
  CalendarDays,
  ListTodo,
  Wallet,
  FileText,
  Zap,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Fas där modulen byggs. Moduler i senare faser visas som kommande. */
  phase: number;
}

// Alla sex faser är byggda — hela menyn är upplåst.
export const CURRENT_PHASE = 6;

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, phase: 1 },
  { title: "Projekt", href: "/projekt", icon: HardHat, phase: 1 },
  { title: "AI-assistent", href: "/assistent", icon: Sparkles, phase: 5 },
  { title: "Möten", href: "/moten", icon: CalendarDays, phase: 2 },
  { title: "Åtgärder", href: "/atgarder", icon: ListTodo, phase: 2 },
  { title: "Ekonomi", href: "/ekonomi", icon: Wallet, phase: 3 },
  { title: "Dokument", href: "/dokument", icon: FileText, phase: 4 },
  { title: "Automationer", href: "/automationer", icon: Zap, phase: 6 },
  { title: "Rapporter", href: "/rapporter", icon: FileBarChart, phase: 6 },
];
