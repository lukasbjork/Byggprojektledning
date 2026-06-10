import type {
  ProjectStatus,
  ActionStatus,
  MilestoneStatus,
} from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  projectStatusLabels,
  actionStatusLabels,
  milestoneStatusLabels,
} from "@/lib/labels";
import type { RiskColor } from "@/lib/risk";

// Stämpel-lika statusmarkeringar: mono, versaler, tunn ram — som
// stämplar i ett ritningshuvud.

function Stamp({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
        className
      )}
    >
      {children}
    </span>
  );
}

const projectStatusStyles: Record<ProjectStatus, string> = {
  PLANERING: "border-ritning/40 text-ritning",
  UPPHANDLING: "border-ritning/40 text-ritning",
  PRODUKTION: "border-varsel/50 text-varsel",
  BESIKTNING: "border-godkand/50 text-godkand",
  GARANTITID: "border-muted-foreground/40 text-muted-foreground",
  AVSLUTAT: "border-muted-foreground/30 text-muted-foreground/70",
};

export function ProjectStatusStamp({ status }: { status: ProjectStatus }) {
  return <Stamp className={projectStatusStyles[status]}>{projectStatusLabels[status]}</Stamp>;
}

const actionStatusStyles: Record<ActionStatus, string> = {
  OPPEN: "border-ritning/40 text-ritning",
  PAGAENDE: "border-varsel/50 text-varsel",
  KLAR: "border-godkand/50 text-godkand",
  FORSENAD: "border-destructive/50 text-destructive",
};

export function ActionStatusStamp({ status }: { status: ActionStatus }) {
  return <Stamp className={actionStatusStyles[status]}>{actionStatusLabels[status]}</Stamp>;
}

const milestoneStatusStyles: Record<MilestoneStatus, string> = {
  EJ_PABORJAD: "border-muted-foreground/40 text-muted-foreground",
  PAGAENDE: "border-varsel/50 text-varsel",
  KLAR: "border-godkand/50 text-godkand",
};

export function MilestoneStatusStamp({ status }: { status: MilestoneStatus }) {
  return (
    <Stamp className={milestoneStatusStyles[status]}>{milestoneStatusLabels[status]}</Stamp>
  );
}

/** Trafikljus-prick för projektets riskläge. */
export function RiskDot({ color, className }: { color: RiskColor; className?: string }) {
  return (
    <span
      aria-label={color === "ROD" ? "Hög risk" : color === "GUL" ? "Förhöjd risk" : "Låg risk"}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        color === "ROD" && "bg-destructive",
        color === "GUL" && "bg-varsel",
        color === "GRON" && "bg-godkand",
        className
      )}
    />
  );
}

/** Projektnummer som monostämpel, t.ex. P-2025-014. */
export function ProjectNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("font-mono text-xs text-muted-foreground", className)}>{value}</span>
  );
}
