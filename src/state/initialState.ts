import type { Building, BuildingId, LudusState } from "../types";
import { BUILDING_DEFAULTS, ECONOMY, FIGHT_DAY } from "../config";
import { generateGladiator } from "../engine/generator";
import { generateStaffPool } from "../engine/staff";
import { generateAllRivalLudi } from "../engine/rivalLudi";
import { generateLudusName } from "../engine/names";

function makeStartingBuildings(): Record<BuildingId, Building> {
  const buildings = {} as Record<BuildingId, Building>;
  (Object.keys(BUILDING_DEFAULTS) as BuildingId[]).forEach((id) => {
    const def = BUILDING_DEFAULTS[id];
    buildings[id] = {
      level: 1,
      material: def.material,
      baseCost: def.baseCost,
      costGrowth: def.costGrowth,
      upkeepPerLevel: def.upkeepPerLevel,
    };
  });
  return buildings;
}

export function createInitialState(ludusName?: string): LudusState {
  const currentDay = 1;
  const usedArenaNames = new Set<string>();
  const gladiators = Array.from({ length: 4 }, () => {
    const gladiator = generateGladiator(currentDay, { tier: "weak", usedArenaNames });
    usedArenaNames.add(gladiator.name);
    return gladiator;
  });

  return {
    gold: ECONOMY.startingGold,
    reputation: 0,
    currentDay,
    buildings: makeStartingBuildings(),
    buildQueue: [],
    overextendedUntil: null,
    recentBuildStarts: [],
    gladiators,
    staff: [],
    staffPool: generateStaffPool(currentDay),
    staffPoolRefreshedOnDay: currentDay,
    rivalLudi: generateAllRivalLudi(),
    nextFightDay: currentDay + FIGHT_DAY.intervalDays,
    deathMatchCooldowns: [],
    pendingDeathMatchChallenge: null,
    recruitPool: [],
    recruiterTrip: null,
    debtWeeksActive: 0,
    loanPrincipal: 0,
    loanTakenOnDay: null,
    loanCollateral: null,
    loanPurseCutFraction: 0,
    unlockedTier: "local",
    promotionCooldownUntilDay: null,
    lastSummary: null,
    history: [],
    founderName: "Retired Legionary",
    ludusName: ludusName?.trim() || generateLudusName(),
  };
}
