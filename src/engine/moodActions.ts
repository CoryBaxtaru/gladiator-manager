import type { Gladiator, LudusState } from "../types";
import { MOOD_ACTIONS } from "../config";
import { addMoodModifier } from "./mood";
import { tierCostMultiplier } from "./economy";
import { currentAbilityOf } from "./rating";

/** Local-tier baseline scaled by the ludus's current tier, same as recruitment costs. */
export function moraleEventCostFor(state: LudusState): number {
  return Math.round(MOOD_ACTIONS.moraleEventCost * tierCostMultiplier(state));
}

function replaceGladiator(state: LudusState, gladiatorId: string, updater: (g: Gladiator) => Gladiator): LudusState {
  return {
    ...state,
    gladiators: state.gladiators.map((g) => (g.id === gladiatorId ? updater(g) : g)),
  };
}

export function canTriggerMoraleEvent(gladiator: Gladiator, currentDay: number): boolean {
  if (gladiator.lastMoraleEventDay === null) return true;
  return currentDay - gladiator.lastMoraleEventDay >= MOOD_ACTIONS.moraleEventCooldownDays;
}

export function triggerMoraleEvent(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  const cost = moraleEventCostFor(state);
  if (!gladiator || state.gold < cost) return state;
  if (!canTriggerMoraleEvent(gladiator, state.currentDay)) return state;

  const withGold = { ...state, gold: state.gold - cost };
  return replaceGladiator(withGold, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "Feast in his honor", MOOD_ACTIONS.moraleEventBoost, state.currentDay, MOOD_ACTIONS.moraleEventDurationDays);
    return { ...boosted, lastMoraleEventDay: state.currentDay };
  });
}

export function canPerformRitual(gladiator: Gladiator, currentDay: number): boolean {
  if (!gladiator.personalityTraits.includes("Devout")) return false;
  if (gladiator.lastRitualDay === null) return true;
  return currentDay - gladiator.lastRitualDay >= MOOD_ACTIONS.ritualCooldownDays;
}

export function performRitual(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canPerformRitual(gladiator, state.currentDay)) return state;
  return replaceGladiator(state, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "Pre-fight ritual observed", MOOD_ACTIONS.ritualBoost, state.currentDay, MOOD_ACTIONS.ritualDurationDays);
    return { ...boosted, lastRitualDay: state.currentDay };
  });
}

export function canGiveBonusCut(gladiator: Gladiator, currentDay: number): boolean {
  if (!gladiator.personalityTraits.includes("Greedy")) return false;
  if (gladiator.lastBonusCutDay === null) return true;
  return currentDay - gladiator.lastBonusCutDay >= MOOD_ACTIONS.bonusCutCooldownDays;
}

export function bonusCutCost(gladiator: Gladiator): number {
  return Math.round(currentAbilityOf(gladiator) * MOOD_ACTIONS.bonusCutCostPerCA);
}

export function giveBonusCut(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canGiveBonusCut(gladiator, state.currentDay)) return state;
  const cost = bonusCutCost(gladiator);
  if (state.gold < cost) return state;

  const withGold = { ...state, gold: state.gold - cost };
  return replaceGladiator(withGold, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "Given a bigger cut of the winnings", MOOD_ACTIONS.bonusCutBoost, state.currentDay, MOOD_ACTIONS.bonusCutDurationDays);
    return { ...boosted, lastBonusCutDay: state.currentDay };
  });
}

/** Free and trait-gated, parallel to the Devout ritual: lets a Prideful gladiator hold
 * court and bask in his own reputation, giving him a real upside to balance the trait's
 * real downside (mood penalties on a loss or on being benched). */
export function canBoastPride(gladiator: Gladiator, currentDay: number): boolean {
  if (!gladiator.personalityTraits.includes("Prideful")) return false;
  if (gladiator.lastPrideBoastDay === null) return true;
  return currentDay - gladiator.lastPrideBoastDay >= MOOD_ACTIONS.prideBoastCooldownDays;
}

export function boastPride(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canBoastPride(gladiator, state.currentDay)) return state;
  return replaceGladiator(state, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "Held court, boasting of his own glory", MOOD_ACTIONS.prideBoastBoost, state.currentDay, MOOD_ACTIONS.prideBoastDurationDays);
    return { ...boosted, lastPrideBoastDay: state.currentDay };
  });
}

/**
 * Free, untraited, and never tier-scaled: the one mood tool a ludus can always afford,
 * no matter how deep in debt or how high the tier, so a player in a rough patch always
 * has something to try. Weaker and shorter than a Feast on purpose -- a stopgap, not a
 * replacement for it.
 */
export function canGiveEncouragement(gladiator: Gladiator, currentDay: number): boolean {
  if (gladiator.lastEncouragementDay === null) return true;
  return currentDay - gladiator.lastEncouragementDay >= MOOD_ACTIONS.encouragementCooldownDays;
}

export function giveEncouragement(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canGiveEncouragement(gladiator, state.currentDay)) return state;
  return replaceGladiator(state, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "A word of encouragement", MOOD_ACTIONS.encouragementBoost, state.currentDay, MOOD_ACTIONS.encouragementDurationDays);
    return { ...boosted, lastEncouragementDay: state.currentDay };
  });
}

export function canGiveLeave(gladiator: Gladiator, currentDay: number): boolean {
  if (gladiator.lastLeaveDay === null) return true;
  return currentDay - gladiator.lastLeaveDay >= MOOD_ACTIONS.leaveCooldownDays;
}

/**
 * Free, no gold cost, never tier-scaled -- a real rest period, not a token nudge: on
 * top of its own mood boost, it puts the gladiator on Rest training focus (the
 * existing manual "rest" option) for a couple of days, so a player actually gives up
 * training time to use it rather than getting a free number with no cost at all.
 */
export function giveLeave(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canGiveLeave(gladiator, state.currentDay)) return state;
  return replaceGladiator(state, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "A day of leave", MOOD_ACTIONS.leaveBoost, state.currentDay, MOOD_ACTIONS.leaveDurationDays);
    return { ...boosted, trainingFocus: "rest", lastLeaveDay: state.currentDay };
  });
}

/** Local-tier baseline scaled by the ludus's current tier, same convention as the Feast cost. */
export function bathsCostFor(state: LudusState): number {
  return Math.round(MOOD_ACTIONS.bathsCostBase * tierCostMultiplier(state));
}

export function canVisitBaths(gladiator: Gladiator, currentDay: number): boolean {
  if (gladiator.lastBathsDay === null) return true;
  return currentDay - gladiator.lastBathsDay >= MOOD_ACTIONS.bathsCooldownDays;
}

/** Gold cost; effectiveness scales with the Quarters building level, the one mood
 * action tied to an existing building rather than a flat number. */
export function visitBaths(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  const cost = bathsCostFor(state);
  if (!gladiator || state.gold < cost) return state;
  if (!canVisitBaths(gladiator, state.currentDay)) return state;

  const boostMagnitude = MOOD_ACTIONS.bathsBoostBase + state.buildings.quarters.level * MOOD_ACTIONS.bathsBoostPerQuartersLevel;
  const withGold = { ...state, gold: state.gold - cost };
  return replaceGladiator(withGold, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "An evening at the baths", boostMagnitude, state.currentDay, MOOD_ACTIONS.bathsDurationDays);
    return { ...boosted, lastBathsDay: state.currentDay };
  });
}

/** Local-tier baseline scaled by the ludus's current tier, same convention as the Feast cost. */
export function recognitionCostFor(state: LudusState): number {
  return Math.round(MOOD_ACTIONS.recognitionCostBase * tierCostMultiplier(state));
}

export function canGivePublicRecognition(gladiator: Gladiator, currentDay: number): boolean {
  if (gladiator.lastRecognitionDay === null) return true;
  return currentDay - gladiator.lastRecognitionDay >= MOOD_ACTIONS.recognitionCooldownDays;
}

/** The gold cost is flat like the others, but the boost itself scales with the
 * gladiator's showmanship, so a crowd favorite gets more out of public praise than a
 * quiet fighter does. */
export function givePublicRecognition(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  const cost = recognitionCostFor(state);
  if (!gladiator || state.gold < cost) return state;
  if (!canGivePublicRecognition(gladiator, state.currentDay)) return state;

  const boostMagnitude = Math.round(
    MOOD_ACTIONS.recognitionBoostBase + gladiator.stats.showmanship * MOOD_ACTIONS.recognitionBoostPerShowmanship
  );
  const withGold = { ...state, gold: state.gold - cost };
  return replaceGladiator(withGold, gladiatorId, (g) => {
    const boosted = addMoodModifier(g, "Publicly praised before the crowd", boostMagnitude, state.currentDay, MOOD_ACTIONS.recognitionDurationDays);
    return { ...boosted, lastRecognitionDay: state.currentDay };
  });
}
