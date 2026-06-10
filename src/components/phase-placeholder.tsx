export function PhasePlaceholder({ phase, module }: { phase: number; module: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Fas {phase}
      </span>
      <p className="text-sm text-muted-foreground">{module} byggs i fas {phase}.</p>
    </div>
  );
}
