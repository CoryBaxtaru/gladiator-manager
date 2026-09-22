import { Badge } from "./Badge";
import type { WinChanceEstimate } from "../engine/combat";

/**
 * Qualitative only, on purpose: a bare "40%" reads as "don't fight him" even though
 * it's a fair bet in a game built on variance. Bands are wide, especially the middle
 * one, so a genuinely close matchup reads as reasonable rather than as a near-loss.
 */
function classify(winRate: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (winRate >= 0.75) return { label: "Heavy Favorite", tone: "success" };
  if (winRate >= 0.6) return { label: "Favored", tone: "success" };
  if (winRate >= 0.4) return { label: "Moderate", tone: "warning" };
  if (winRate >= 0.25) return { label: "Underdog", tone: "danger" };
  return { label: "Heavy Underdog", tone: "danger" };
}

export function WinChanceBadge({ estimate }: { estimate: WinChanceEstimate }) {
  const { label, tone } = classify(estimate.winRate);
  return <Badge tone={tone}>{label}</Badge>;
}
