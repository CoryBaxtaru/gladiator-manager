import type { Gladiator, MoodModifier, SummaryEntry } from "../types";
import { MOOD } from "../config";
import { nextId, chance } from "./rng";

// Ascending breakpoints on the plain 0-100 mood value, read off the same thresholds
// that drive breaks/hot streaks elsewhere, so the word a player sees always agrees
// with the mechanics happening underneath it. Never shown as the raw number.
const MOOD_LABEL_BREAKPOINTS: { min: number; label: string }[] = [
  { min: MOOD.hotStreakThreshold, label: "Elated" },
  { min: 70, label: "Happy" },
  { min: 55, label: "Content" },
  { min: MOOD.minorBreakMax, label: "Uneasy" },
  { min: MOOD.minorBreakMin, label: "Grumpy" },
  { min: MOOD.majorBreakMin, label: "Angry" },
  { min: MOOD.min, label: "Furious" },
];

export function moodLabel(mood: number): string {
  for (const tier of MOOD_LABEL_BREAKPOINTS) {
    if (mood >= tier.min) return tier.label;
  }
  return "Furious";
}

export function traitMultiplier(gladiator: Gladiator): number {
  if (gladiator.personalityTraits.includes("Stoic")) return 0.5;
  if (gladiator.personalityTraits.includes("Volatile")) return 1.6;
  return 1;
}

export function addMoodModifier(
  gladiator: Gladiator,
  source: string,
  magnitude: number,
  currentDay: number,
  durationDays = 3
): Gladiator {
  const scaled = Math.round(magnitude * traitMultiplier(gladiator));
  if (scaled === 0) return gladiator;
  const modifier: MoodModifier = {
    id: nextId("mm"),
    source,
    magnitude: scaled,
    expiresOnDay: currentDay + durationDays,
  };
  return { ...gladiator, moodModifiers: [...gladiator.moodModifiers, modifier] };
}

/** Recompute mood from base drift + active modifiers, clamp, expire old modifiers. */
export function recomputeMood(gladiator: Gladiator, currentDay: number): { gladiator: Gladiator; entries: SummaryEntry[] } {
  const entries: SummaryEntry[] = [];
  const activeModifiers = gladiator.moodModifiers.filter((m) => m.expiresOnDay > currentDay);

  let baseline = 0;
  if (gladiator.personalityTraits.includes("Brooding")) {
    baseline += MOOD.brooding_dailyDecay;
  }

  const modifierSum = activeModifiers.reduce((sum, m) => sum + m.magnitude, 0);
  let newMood = gladiator.mood + baseline + modifierSum * 0.15;
  newMood = Math.max(MOOD.min, Math.min(MOOD.max, newMood));

  const hotStreakUntilDay =
    newMood >= MOOD.hotStreakThreshold ? currentDay + 3 : gladiator.hotStreakUntilDay && gladiator.hotStreakUntilDay > currentDay ? gladiator.hotStreakUntilDay : null;

  if (hotStreakUntilDay && !gladiator.hotStreakUntilDay) {
    entries.push({ category: "mood", text: `${gladiator.name} is on a hot streak, riding high morale.` });
  }

  return {
    gladiator: { ...gladiator, mood: Math.round(newMood), moodModifiers: activeModifiers, hotStreakUntilDay },
    entries,
  };
}

export type BreakTier = "none" | "minor" | "major" | "extreme";

export function breakTierFor(gladiator: Gladiator): BreakTier {
  const volatileBoost = gladiator.personalityTraits.includes("Volatile");
  if (gladiator.mood < MOOD.extremeBreakMax || (volatileBoost && gladiator.mood <= MOOD.majorBreakMax)) {
    return gladiator.mood < MOOD.extremeBreakMax ? "extreme" : "major";
  }
  if (gladiator.mood <= MOOD.majorBreakMax) return "major";
  if (gladiator.mood <= MOOD.minorBreakMax) return "minor";
  return "none";
}

export interface BreakOutcome {
  gladiator: Gladiator;
  entries: SummaryEntry[];
  gateEscapeAttempt: boolean;
}

/**
 * Resolve a mood-driven break event for one gladiator. Gate level passed in for escape
 * resolution. `isLastActiveGladiator` is a hard floor on the failure state itself: the
 * last gladiator in the roster can still be hurt, but can never escape or die from a
 * break, so the ludus can never be reduced to zero gladiators through these paths (see
 * the phase 6 soft-lock fix). Every escape/death chance() roll still fires normally so
 * the floor never changes the odds a player experiences, it only changes the outcome
 * of an escape/death roll that would otherwise zero the roster.
 */
export function resolveBreak(gladiator: Gladiator, gateLevel: number, currentDay: number, isLastActiveGladiator = false): BreakOutcome {
  const entries: SummaryEntry[] = [];
  const tier = breakTierFor(gladiator);
  let updated = gladiator;
  let gateEscapeAttempt = false;

  if (tier === "none") {
    return { gladiator, entries, gateEscapeAttempt };
  }

  const loyal = gladiator.personalityTraits.includes("Loyal");

  if (tier === "minor") {
    entries.push({ category: "mood", text: `${gladiator.name} is grumbling and refuses optional training today.` });
  } else if (tier === "major") {
    const roll = Math.random();
    if (roll < 0.34) {
      entries.push({ category: "mood", text: `${gladiator.name} refused to fight when scheduled.` });
    } else if (roll < 0.67) {
      entries.push({ category: "mood", text: `${gladiator.name} picked a fight with another gladiator over a trivial slight.` });
      updated = { ...updated, condition: updated.condition === "healthy" ? "bruised" : updated.condition };
    } else if (!loyal) {
      gateEscapeAttempt = true;
      const escapeChance = Math.max(0.05, 0.5 - gateLevel * 0.06);
      const escapes = chance(escapeChance);
      if (escapes && !isLastActiveGladiator) {
        updated = { ...updated, status: "escaped", statusChangedOnDay: currentDay };
        entries.push({ category: "mood", text: `${gladiator.name} escaped in the night! The gate held too weakly.` });
      } else if (escapes) {
        entries.push({ category: "mood", text: `${gladiator.name} nearly fled in the night, but with no one else left to carry the ludus, he thought better of it at the gate.` });
        updated = addMoodModifier(updated, "Almost fled", -5, currentDay, 4);
      } else {
        entries.push({ category: "mood", text: `${gladiator.name} attempted to escape but was caught at the gate.` });
        updated = addMoodModifier(updated, "Failed escape attempt", -5, currentDay, 4);
      }
    } else {
      entries.push({ category: "mood", text: `${gladiator.name} considered fleeing but loyalty held him back.` });
    }
  } else if (tier === "extreme") {
    const roll = Math.random();
    if (loyal && roll < 0.5) {
      entries.push({ category: "mood", text: `${gladiator.name} is at the breaking point, but loyalty keeps him in line, barely.` });
    } else if (roll < 0.4) {
      gateEscapeAttempt = true;
      const escapeChance = Math.max(0.1, 0.7 - gateLevel * 0.06);
      const escapes = chance(escapeChance);
      if (escapes && !isLastActiveGladiator) {
        updated = { ...updated, status: "escaped", statusChangedOnDay: currentDay };
        entries.push({ category: "mood", text: `${gladiator.name} broke out in a desperate escape attempt and vanished.` });
      } else if (escapes) {
        entries.push({ category: "mood", text: `${gladiator.name} broke for the gate in desperation, but with no one else left to run the ludus, he was dragged back before he got clear.` });
        updated = addMoodModifier(updated, "Failed escape attempt", -6, currentDay, 4);
      } else {
        entries.push({ category: "mood", text: `${gladiator.name} was cut down attempting a desperate escape.` });
        if (chance(0.25) && !isLastActiveGladiator) {
          updated = { ...updated, status: "dead", statusChangedOnDay: currentDay };
          entries.push({ category: "mood", text: `${gladiator.name} did not survive the attempt.` });
        } else {
          updated = { ...updated, condition: "gravely_injured" };
        }
      }
    } else {
      entries.push({ category: "mood", text: `${gladiator.name} spiraled into a violent rage in the yard.` });
      updated = { ...updated, condition: updated.condition === "healthy" ? "injured" : "gravely_injured" };
    }
  }

  return { gladiator: updated, entries, gateEscapeAttempt };
}

export interface RiskTag {
  label: string;
  tone: "warning" | "danger";
  tooltip: string;
}

/** Surfaces the same internal break thresholds that silently drove escapes/breaks
 * before, as a visible tag on the Squad screen, so a player can see a crisis coming
 * and has a chance to intervene (a mood action, benching, whatever's available) before
 * losing the gladiator rather than finding out after the fact. */
export function riskTagFor(gladiator: Gladiator): RiskTag | null {
  const tier = breakTierFor(gladiator);
  if (tier === "none") return null;
  if (tier === "minor") {
    return { label: "Unsettled", tone: "warning", tooltip: "Mood is low enough to skip optional training some days. Not in danger yet, but worth watching." };
  }
  return { label: "Flight Risk", tone: "danger", tooltip: "Mood is critically low. He may refuse to fight, lash out, or try to escape until this improves." };
}
