import type { Building, BuildingId, LudusState } from "../types";
import { BUILDING_DEFAULTS, ECONOMY, FIGHT_DAY } from "../config";
import { generateGladiator } from "../engine/generator";
import { generateStaffPool } from "../engine/staff";
import { generateAllRivalLudi } from "../engine/rivalLudi";
import { generateLudusName, generateRomanCitizenName } from "../engine/names";

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

export function createInitialState(ludusName?: string, founderName?: string): LudusState {
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
    // The trade was legally infamis, so many lanistae were freedmen: Latin praenomen,
    // former owner's nomen, own Greek slave name as cognomen (see generateRomanCitizenName).
    // Phase 12 Part N: was always auto-generated with no way for the player to pick
    // their own -- now an optional override, pre-filled with a generated suggestion by
    // the caller (see MainMenu/FoundingModal) but editable.
    founderName: founderName?.trim() || generateRomanCitizenName({ freedman: true }),
    ludusName: ludusName?.trim() || generateLudusName(),
    praetorianCooldownUntilDay: null,
    praetorianVictories: 0,
    selfChallengeDraws: {},
  };
}
