// Riskindikator per projekt: grön/gul/röd utifrån försenade aktiviteter,
// budgetläge och öppna risker. Poängbaserat så att flera små varningar
// tillsammans kan ge rött.

export type RiskColor = "GRON" | "GUL" | "ROD";

export interface RiskInput {
  overdueActions: number;
  overdueMilestones: number;
  /** Utfall delat med budget, 0–∞. null om budget saknas. */
  budgetUsedRatio: number | null;
  /** Öppna risker där sannolikhet eller konsekvens är HOG. */
  openHighRisks: number;
}

export interface RiskResult {
  color: RiskColor;
  reasons: string[];
}

export function assessProjectRisk(input: RiskInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (input.overdueActions > 0) {
    score += Math.min(input.overdueActions, 3);
    reasons.push(
      input.overdueActions === 1
        ? "1 försenad åtgärdspunkt"
        : `${input.overdueActions} försenade åtgärdspunkter`
    );
  }

  if (input.overdueMilestones > 0) {
    score += input.overdueMilestones * 2;
    reasons.push(
      input.overdueMilestones === 1
        ? "1 passerad milstolpe"
        : `${input.overdueMilestones} passerade milstolpar`
    );
  }

  if (input.budgetUsedRatio !== null) {
    if (input.budgetUsedRatio > 1) {
      score += 3;
      reasons.push(`Budget överskriden (${Math.round(input.budgetUsedRatio * 100)} %)`);
    } else if (input.budgetUsedRatio > 0.9) {
      score += 1;
      reasons.push(`Budget nära taket (${Math.round(input.budgetUsedRatio * 100)} %)`);
    }
  }

  if (input.openHighRisks > 0) {
    score += input.openHighRisks * 2;
    reasons.push(
      input.openHighRisks === 1
        ? "1 öppen hög risk"
        : `${input.openHighRisks} öppna höga risker`
    );
  }

  const color: RiskColor = score >= 4 ? "ROD" : score >= 2 ? "GUL" : "GRON";
  if (reasons.length === 0) reasons.push("Inga varningssignaler");
  return { color, reasons };
}
