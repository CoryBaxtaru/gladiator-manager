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
