// Formatering enligt svensk standard: belopp i SEK och datum som ÅÅÅÅ-MM-DD.

const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

const sekCompact = new Intl.NumberFormat("sv-SE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatSEK(amount: number): string {
  return sek.format(amount);
}

/** Kompakt belopp för diagram/KPI, t.ex. "48,5 mn kr". */
export function formatSEKCompact(amount: number): string {
  return `${sekCompact.format(amount)} kr`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "–";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("sv-SE"); // ger ÅÅÅÅ-MM-DD
}

/** Relativ tid på svenska, t.ex. "för 2 dagar sedan". */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("sv-SE", { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  return rtf.format(months, "month");
}

/** Antal hela dagar från idag till datumet (negativt = passerat). */
export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
