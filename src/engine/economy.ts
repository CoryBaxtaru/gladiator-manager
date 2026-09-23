import type { LudusState } from "../types";
import { ECONOMY, FIGHT_ECONOMY, ROSTER_OVER_CAPACITY_UPKEEP_MULTIPLIER } from "../config";
import { rosterCapacity } from "./buildings";

/**
 * The same tier multiplier that scales fight purses also scales one-time gold costs
 * (recruitment, mood actions, doctor visits), so an action that felt trivial at Local
 * tier still costs something proportional once the player has climbed, and something
 * that would be crushing at Local tier isn't priced for a ludus that's already there.
 * Building upgrade costs are excluded: their own baseCost*costGrowth^level curve,
 * gated by the reputation thresholds in BUILDING_LEVEL_REPUTATION_GATE, already scales
 * intrinsically with progression. Uses unlockedTier, not raw reputation: costs only
 * step up once a Promotion Fight is actually won (engine/promotion.ts), same as
 * fight-day matchmaking.
 */
export function tierCostMultiplier(state: LudusState): number {
  return FIGHT_ECONOMY.tierMultiplier[state.unlockedTier];
}

export function weeklyGladiatorUpkeep(state: LudusState): number {
  const active = state.gladiators.filter((g) => g.status === "active");
  const base = active.reduce((sum, g) => sum + g.weeklyUpkeep, 0);
  const overCapacity = active.length > rosterCapacity(state);
  return overCapacity ? Math.round(base * ROSTER_OVER_CAPACITY_UPKEEP_MULTIPLIER) : base;
}

export function weeklyBuildingUpkeep(state: LudusState): number {
  return Object.values(state.buildings).reduce((sum, b) => sum + b.upkeepPerLevel * b.level, 0);
}

export function totalBuildingLevels(state: LudusState): number {
  return Object.values(state.buildings).reduce((sum, b) => sum + b.level, 0);
}

export function weeklyLudusOverhead(state: LudusState): number {
  return Math.round(totalBuildingLevels(state) * ECONOMY.ludusOverheadPerBuildingLevel);
}

export function totalWeeklyUpkeep(state: LudusState): number {
  return weeklyGladiatorUpkeep(state) + weeklyBuildingUpkeep(state) + weeklyLudusOverhead(state);
}
