import type { Gladiator, LudusState, StatKey, TrainingFocus } from "../types";
import { isOverextended } from "./buildings";
import { MOOD, OVEREXTENSION, TRAINING, STAT_SPREAD_PENALTY } from "../config";
import { addMoodModifier } from "./mood";
import { bestTrainerFor, bestDoctor } from "./staff";
import { tierCostMultiplier } from "./economy";
import { chance, pick } from "./rng";
import { currentAbilityOf } from "./rating";

const FOCUS_STAT: Record<Exclude<TrainingFocus, "rest" | "balanced">, StatKey> = {
  strength: "strength",
  weaponSkill: "weaponSkill",
  endurance: "endurance",
  showmanship: "showmanship",
};

const ALL_STATS: StatKey[] = ["strength", "weaponSkill", "endurance", "showmanship"];

export function markStatChange(gladiator: Gladiator, stat: StatKey, delta: number, currentDay: number): Gladiator {
  const marker = { stat, delta, expiresOnDay: currentDay + TRAINING.statChangeIndicatorDays };
  const filtered = gladiator.recentStatChanges.filter((m) => m.stat !== stat);
  return { ...gladiator, recentStatChanges: [...filtered, marker] };
}

/**
 * Phase 12 Part I (exploratory): a stat that's pulled far ahead of a gladiator's other
 * three trains more slowly, both from deliberate training and from combat-driven gains
 * (see combat.ts's applyCombatResultToGladiator), so growth naturally rebalances
 * toward an even spread instead of compounding an existing skew. Compares the target
 * stat against the average of the OTHER three, not the gladiator's own history, so it
 * reacts to whatever shape his attributes are actually in right now.
 */
export function statSpreadMultiplier(gladiator: Gladiator, statKey: StatKey): number {
  const others = ALL_STATS.filter((s) => s !== statKey).map((s) => gladiator.stats[s]);
  const avgOthers = others.reduce((sum, v) => sum + v, 0) / others.length;
  const lead = gladiator.stats[statKey] - avgOthers;
  const over = lead - STAT_SPREAD_PENALTY.tolerance;
  if (over <= 0) return 1;
  return Math.max(STAT_SPREAD_PENALTY.minMultiplier, 1 - over * STAT_SPREAD_PENALTY.penaltyPerPoint);
}

function baseEffectiveness(gladiator: Gladiator, state: LudusState): number {
  const yardLevel = state.buildings.training_yard.level;
  let effectiveness = TRAINING.yardBaseRate + yardLevel * TRAINING.yardLevelBonus;
  if (isOverextended(state)) effectiveness *= OVEREXTENSION.trainingEffectMultiplier;
  if (gladiator.mood < TRAINING.lowMoodThreshold) effectiveness *= TRAINING.lowMoodMultiplier;
  if (gladiator.mood >= TRAINING.highMoodThreshold) effectiveness *= TRAINING.highMoodMultiplier;
  return effectiveness;
}

/**
 * Rolls a training gain for one stat and applies it if successful. Shared by solo
 * focus training and sparring, so both go through the same effectiveness formula
 * (training yard level, mood, overextension, a matching trainer's hidden bonus).
 */
export function trainStat(
  gladiator: Gladiator,
  statKey: StatKey,
  state: LudusState,
  trainerFocusLookup: TrainingFocus,
  baseMultiplier = 1
): Gladiator {
  let effectiveness = baseEffectiveness(gladiator, state) * baseMultiplier;
  const trainer = bestTrainerFor(state, trainerFocusLookup);
  if (trainer) {
    effectiveness += trainer.trueSkill * TRAINING.trainerBonusPerSkillPoint;
  }
  // Applied to the FULL effectiveness (yard/mood base plus any trainer bonus), not just
  // the base -- otherwise a dedicated specialist trainer's bonus alone could still
  // power straight through the penalty, defeating the point (see Part I's own worked
  // example: a gladiator ground under one for a long stretch).
  effectiveness *= statSpreadMultiplier(gladiator, statKey);

  const roomToGrow = gladiator.potentialAbility - currentAbilityOf(gladiator);
  if (roomToGrow <= 0 || !chance(effectiveness)) return gladiator;

  const newStats = { ...gladiator.stats, [statKey]: Math.min(99, gladiator.stats[statKey] + 1) };
  let updated: Gladiator = { ...gladiator, stats: newStats };
  updated = markStatChange(updated, statKey, 1, state.currentDay);
  return updated;
}

/** Solo focus training. Gladiators currently paired for sparring are handled separately (see sparring.ts). */
export function applyDailyTraining(gladiator: Gladiator, state: LudusState): Gladiator {
  if (gladiator.status !== "active" || gladiator.injuryDaysRemaining > 0) return gladiator;
  if (gladiator.sparringPartnerId) return gladiator;

  if (gladiator.trainingFocus === "rest") {
    return addMoodModifier(gladiator, "Rest period", MOOD.restFocusBonus, state.currentDay, 2);
  }

  let statKey: StatKey;
  let isBalanced = false;
  let multiplier = 1;
  if (gladiator.trainingFocus === "balanced") {
    statKey = pick(ALL_STATS);
    multiplier = TRAINING.balancedFocusMultiplier;
    isBalanced = true;
  } else {
    statKey = FOCUS_STAT[gladiator.trainingFocus];
  }

  let updated = trainStat(gladiator, statKey, state, isBalanced ? statKey : gladiator.trainingFocus, multiplier);

  const trainingOverload = state.buildings.training_yard.level > state.buildings.quarters.level + TRAINING.overtrainingYardMinusQuartersThreshold;
  if (trainingOverload && chance(TRAINING.overtrainingChance)) {
    updated = { ...updated, condition: updated.condition === "healthy" ? "bruised" : updated.condition };
    updated = addMoodModifier(updated, "Overtraining injury scare", -4, state.currentDay, 3);
  }

  return updated;
}

/** Reveal exact PA once enough training history has accumulated (simple heuristic: fight count + hire tenure). */
export function maybeRevealPotential(gladiator: Gladiator, currentDay: number): Gladiator {
  if (gladiator.potentialRevealed === "exact") return gladiator;
  const tenureDays = currentDay - gladiator.hireDay;
  const qualifies = gladiator.record.fights >= 3 || tenureDays >= 30;
  if (qualifies && chance(0.15)) {
    return { ...gladiator, potentialRevealed: "exact" };
  }
  return gladiator;
}

export function tickInjuryRecovery(gladiator: Gladiator, doctorSkill: number, infirmaryLevel: number): Gladiator {
  if (gladiator.injuryDaysRemaining <= 0) return gladiator;
  const bonusDays = Math.floor(infirmaryLevel * 0.15 + doctorSkill * 0.02);
  const remaining = gladiator.injuryDaysRemaining - (1 + bonusDays);
  if (remaining <= 0) {
    return { ...gladiator, injuryDaysRemaining: 0, condition: "healthy" };
  }
  return { ...gladiator, injuryDaysRemaining: remaining };
}

/**
 * Gold cost of an ad hoc doctor visit for the current injury. Scales with how severe
 * the injury is and how many days remain -- a fresh gravely-injured case costs more
 * than a bruise that's nearly healed anyway -- and with the ludus's current tier, same
 * as other one-time costs.
 */
export function doctorVisitCost(gladiator: Gladiator, state: LudusState): number {
  const severityMultiplier = gladiator.condition === "bruised" ? 1 : gladiator.condition === "injured" ? 2.2 : 4;
  const base = 30 * severityMultiplier + gladiator.injuryDaysRemaining * 8;
  return Math.round(base * tierCostMultiplier(state));
}

/**
 * Pays for an immediate doctor visit: a meaningful, immediate cut to the remaining
 * recovery time. A hired doctor's true skill (the same hidden-rating mechanic used
 * for training) makes this far more effective; with no doctor hired it still helps,
 * as a stopgap for a ludus that hasn't built an Infirmary yet, just less.
 */
export function payForDoctorVisit(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || gladiator.injuryDaysRemaining <= 0) return state;
  const cost = doctorVisitCost(gladiator, state);
  if (state.gold < cost) return state;

  const doctor = bestDoctor(state);
  const skillFactor = doctor ? doctor.trueSkill / 100 : 0.15;
  const reductionFraction = 0.35 + skillFactor * 0.45;
  const reduction = Math.max(1, Math.round(gladiator.injuryDaysRemaining * reductionFraction));
  const newDays = Math.max(0, gladiator.injuryDaysRemaining - reduction);

  return {
    ...state,
    gold: state.gold - cost,
    gladiators: state.gladiators.map((g) =>
      g.id === gladiatorId
        ? { ...g, injuryDaysRemaining: newDays, condition: newDays === 0 ? "healthy" : g.condition }
        : g
    ),
  };
}

export function tickAgeAndDecline(gladiator: Gladiator, currentDay: number): Gladiator {
  if (gladiator.age < TRAINING.declineStartAge) return gladiator;
  if (!chance(TRAINING.weeklyDeclineChance)) return gladiator;
  const decliningStats = ALL_STATS.filter((s) => gladiator.stats[s] > 5);
  if (decliningStats.length === 0) return gladiator;
  const stat = pick(decliningStats);
  const newStats = { ...gladiator.stats, [stat]: gladiator.stats[stat] - 1 };
  let updated: Gladiator = { ...gladiator, stats: newStats };
  updated = markStatChange(updated, stat, -1, currentDay);
  return updated;
}
