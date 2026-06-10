export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-md border border-foreground/20 bg-card font-mono text-sm font-semibold tracking-tight">
        BP
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Byggprojektledning</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Platskontor
        </p>
      </div>
    </div>
  );
}
