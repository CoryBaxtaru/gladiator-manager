import type { Building, BuildingId, BuildQueueItem, LudusState } from "../types";
import { BUILDING_MATERIAL_TIME, BUILDING_LEVEL_REPUTATION_GATE, OVEREXTENSION, IMBALANCE, BUILDING_SELL_REFUND_FRACTION } from "../config";

export function upgradeCost(building: Building): number {
  return Math.round(building.baseCost * Math.pow(building.costGrowth, building.level));
}

/** What the building's CURRENT level cost to reach, i.e. the upgrade cost that was
 * paid going from level-1 to level. Level 1 (the minimum) has nothing to refund. */
function costOfCurrentLevel(building: Building): number {
  if (building.level <= 1) return 0;
  return Math.round(building.baseCost * Math.pow(building.costGrowth, building.level - 1));
}

export function sellRefund(building: Building): number {
  return Math.round(costOfCurrentLevel(building) * BUILDING_SELL_REFUND_FRACTION);
}

export function canSellLevel(state: LudusState, buildingId: BuildingId): boolean {
  const building = state.buildings[buildingId];
  if (building.level <= 1) return false;
  return !state.buildQueue.some((q) => q.buildingId === buildingId);
}

/**
 * A deliberate downgrade lever for a cash crunch: refunds only part of what the
 * level cost (BUILDING_SELL_REFUND_FRACTION), so it's a real emergency option, not a
 * way to launder gold by upgrading then immediately reselling. Never below level 1.
 */
export function sellBuildingLevel(state: LudusState, buildingId: BuildingId): LudusState {
  if (!canSellLevel(state, buildingId)) return state;
  const building = state.buildings[buildingId];
  const refund = sellRefund(building);
  return {
    ...state,
    gold: state.gold + refund,
    buildings: {
      ...state.buildings,
      [buildingId]: { ...building, level: building.level - 1 },
    },
  };
}

export function upgradeTime(building: Building): number {
  const { baseTime, timeGrowth } = BUILDING_MATERIAL_TIME[building.material];
  return Math.round(baseTime * Math.pow(timeGrowth, building.level));
}

export function reputationGateFor(buildingId: BuildingId, targetLevel: number): number {
  return BUILDING_LEVEL_REPUTATION_GATE[buildingId](targetLevel);
}

export function canQueueUpgrade(
  state: LudusState,
  buildingId: BuildingId
): { ok: boolean; reason?: string; cost: number; time: number } {
  const building = state.buildings[buildingId];
  const cost = upgradeCost(building);
  const time = upgradeTime(building);
  const alreadyQueued = state.buildQueue.some((q) => q.buildingId === buildingId);
  if (alreadyQueued) {
    return { ok: false, reason: "Already queued.", cost, time };
  }
  if (state.gold < cost) {
    return { ok: false, reason: "Not enough gold.", cost, time };
  }
  const repGate = reputationGateFor(buildingId, building.level + 1);
  if (state.reputation < repGate) {
    return { ok: false, reason: `Requires ${repGate} reputation.`, cost, time };
  }
  return { ok: true, cost, time };
}

export function queueUpgrade(state: LudusState, buildingId: BuildingId): LudusState {
  const check = canQueueUpgrade(state, buildingId);
  if (!check.ok) return state;
  const building = state.buildings[buildingId];
  const item: BuildQueueItem = {
    buildingId,
    targetLevel: building.level + 1,
    startedOnDay: state.currentDay,
    completesOnDay: state.currentDay + check.time,
  };
  const recentBuildStarts = [...state.recentBuildStarts, state.currentDay].filter(
    (day) => state.currentDay - day <= OVEREXTENSION.windowDays
  );
  let overextendedUntil = state.overextendedUntil;
  if (recentBuildStarts.length >= OVEREXTENSION.triggerCount) {
    overextendedUntil = state.currentDay + OVEREXTENSION.debuffDurationDays;
  }
  return {
    ...state,
    gold: state.gold - check.cost,
    buildQueue: [...state.buildQueue, item],
    recentBuildStarts,
    overextendedUntil,
  };
}

/** Advance the build queue by one day; returns updated state and completion messages. */
export function tickBuildQueue(state: LudusState): { state: LudusState; completions: string[] } {
  const completions: string[] = [];
  const stillQueued: BuildQueueItem[] = [];
  const buildings = { ...state.buildings };
  for (const item of state.buildQueue) {
    if (state.currentDay >= item.completesOnDay) {
      const b = buildings[item.buildingId];
      buildings[item.buildingId] = { ...b, level: item.targetLevel };
      completions.push(`${item.buildingId.replace("_", " ")} completed construction, now level ${item.targetLevel}.`);
    } else {
      stillQueued.push(item);
    }
  }
  const overextendedUntil =
    state.overextendedUntil !== null && state.currentDay >= state.overextendedUntil
      ? null
      : state.overextendedUntil;
  return {
    state: { ...state, buildings, buildQueue: stillQueued, overextendedUntil },
    completions,
  };
}

export function isOverextended(state: LudusState): boolean {
  return state.overextendedUntil !== null && state.currentDay < state.overextendedUntil;
}

/**
 * Phase 10 Part A: a level-1 Barracks comfortably houses 4; each level past that adds
 * one more. This is a SOFT cap (see ROSTER_OVER_CAPACITY_UPKEEP_MULTIPLIER in
 * economy.ts) -- going over is allowed, not blocked, but costs more to sustain.
 */
export function rosterCapacity(state: LudusState): number {
  return 3 + state.buildings.barracks.level;
}

export interface ImbalancePenalty {
  moodDelta: number;
  flavorText: string[];
}

/** Computes the daily building-imbalance penalty and flavored callouts for mismatched pairs. */
export function computeImbalance(state: LudusState): ImbalancePenalty {
  const levels = Object.values(state.buildings).map((b) => b.level);
  const spread = Math.max(...levels) - Math.min(...levels);
  const overTolerance = Math.max(0, spread - IMBALANCE.tolerance);
  let moodDelta = overTolerance * IMBALANCE.moodPenaltyPerLevel;
  const flavorText: string[] = [];

  const b = state.buildings;
  if (b.arena.level - b.infirmary.level >= 3) {
    flavorText.push("Gladiators fear fighting with such a poor infirmary behind a grand arena.");
    moodDelta -= 2;
  }
  if (b.training_yard.level - b.quarters.level >= 3) {
    flavorText.push("Overtraining with no comfort is breeding burnout.");
    moodDelta -= 2;
  }
  if (b.armory.level - b.barracks.level >= 3) {
    flavorText.push("Fine gear can't fix cramped, overcrowded barracks.");
    moodDelta -= 2;
  }
  return { moodDelta, flavorText };
}
