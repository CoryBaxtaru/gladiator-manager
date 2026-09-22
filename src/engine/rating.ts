import type { Gladiator, GladiatorStats, PersonalityTrait, PhysicalTrait } from "../types";
import { REPUTATION_STAR_SCALE_MAX, POTENTIAL_STAR_TIERS, PHYSICAL_TRAITS, ATTRIBUTE_PERSONALITY_TRAITS } from "../config";

/** Raw average of the four attributes, unclamped. The single source of truth for
 * every "how strong is this fighter right now" calculation. */
export function averageStats(stats: GladiatorStats): number {
  return Math.round((stats.strength + stats.weaponSkill + stats.endurance + stats.showmanship) / 4);
}

interface TraitBearer {
  stats: GladiatorStats;
  physicalTrait: PhysicalTrait;
  personalityTraits: PersonalityTrait[];
}

/**
 * Base stats plus the fixed physical-trait trade-off and any attribute-affecting
 * personality traits (Athletic, Gluttonous, ...) -- what the fighter actually brings
 * into a clash or a Current Ability calculation, as opposed to the raw trainable
 * numbers shown on the Squad screen.
 */
export function effectiveStats(gladiator: TraitBearer): GladiatorStats {
  const result = { ...gladiator.stats };
  const applyModifiers = (modifiers: Partial<GladiatorStats> | undefined) => {
    if (!modifiers) return;
    for (const key of Object.keys(modifiers) as (keyof GladiatorStats)[]) {
      result[key] = Math.max(1, result[key] + (modifiers[key] ?? 0));
    }
  };
  applyModifiers(PHYSICAL_TRAITS[gladiator.physicalTrait]?.modifiers);
  for (const trait of gladiator.personalityTraits) {
    applyModifiers(ATTRIBUTE_PERSONALITY_TRAITS[trait]?.modifiers);
  }
  return result;
}

/**
 * Current Ability, derived live from the four effective attributes rather than
 * tracked as its own stored number -- there is nowhere for it to drift out of sync,
 * because it is recomputed every time it's needed. Clamped to Potential Ability so a
 * lucky training roll (or a trait bonus) can never numerically push it past the
 * fighter's ceiling.
 */
export function currentAbilityOf(gladiator: TraitBearer & { potentialAbility: number }): number {
  return Math.min(averageStats(effectiveStats(gladiator)), gladiator.potentialAbility);
}

export type StatIndicator = "boost" | "penalty";

/**
 * Which of the four attributes a fighter's physical build and attribute-affecting
 * personality traits push up or down, for the green/red markers next to each stat row
 * -- diffed straight from base vs. effective stats so it always matches whatever
 * combination of traits is actually in play, with no separate bookkeeping to drift.
 */
export function statIndicators(gladiator: TraitBearer): Partial<Record<keyof GladiatorStats, StatIndicator>> {
  const base = gladiator.stats;
  const effective = effectiveStats(gladiator);
  const out: Partial<Record<keyof GladiatorStats, StatIndicator>> = {};
  (Object.keys(base) as (keyof GladiatorStats)[]).forEach((key) => {
    if (effective[key] > base[key]) out[key] = "boost";
    else if (effective[key] < base[key]) out[key] = "penalty";
  });
  return out;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function reputationToStars(reputation: number): number {
  const raw = (Math.max(0, reputation) / REPUTATION_STAR_SCALE_MAX) * 5;
  return roundToHalf(Math.min(5, raw));
}

// Ascending breakpoints shared by Current Ability and Potential Ability, so "he's
// playing like a 3-star fighter with 4-star potential" reads on one consistent scale.
// Piecewise-linear between breakpoints gives a smooth fill rather than jumping in
// whole-tier steps.
const ABILITY_STAR_BREAKPOINTS: { value: number; stars: number }[] = [...POTENTIAL_STAR_TIERS]
  .sort((a, b) => a.minPotential - b.minPotential)
  .map((t) => ({ value: t.minPotential, stars: t.minStars }));

function interpolateStars(value: number): number {
  const v = clamp(value, 0, 99);
  for (let i = 0; i < ABILITY_STAR_BREAKPOINTS.length - 1; i++) {
    const cur = ABILITY_STAR_BREAKPOINTS[i];
    const next = ABILITY_STAR_BREAKPOINTS[i + 1];
    if (v <= next.value) {
      const frac = (v - cur.value) / (next.value - cur.value);
      return cur.stars + (next.stars - cur.stars) * frac;
    }
  }
  return 5;
}

export function currentAbilityStars(currentAbility: number): number {
  return roundToHalf(interpolateStars(currentAbility));
}

export function potentialTrueStars(potentialAbility: number): number {
  return roundToHalf(interpolateStars(potentialAbility));
}

export function potentialStarLabel(stars: number): string {
  const rounded = Math.max(1, Math.min(5, Math.round(stars)));
  const tier = POTENTIAL_STAR_TIERS.find((t) => t.minStars === rounded);
  return tier?.label ?? "Arena Fodder";
}

/** Deterministic fallback noise for gladiators saved before potentialNoiseSeed existed. */
function fallbackNoiseSeed(gladiatorId: string): number {
  let hash = 0;
  for (let i = 0; i < gladiatorId.length; i++) hash = (hash * 31 + gladiatorId.charCodeAt(i)) % 1000;
  return (hash / 1000) * 2 - 1; // -1..1
}

/**
 * A single noisy point estimate for Potential Ability, the same fuzzy-then-sharpening
 * mechanic used for trainer/doctor ratings: it converges on the true value as ludus
 * reputation grows, rather than showing a min-to-max spread. Primitive inputs so it
 * works for both the player's own gladiators and rival gladiators, which carry the
 * same potential/noise-seed data but not the full Gladiator shape.
 */
export function fuzzyPotentialStars(potentialAbility: number, noiseSeed: number, reputation: number, revealed: boolean): number {
  const trueStars = potentialTrueStars(potentialAbility);
  if (revealed) return trueStars;
  const decay = clamp(1 - reputation / REPUTATION_STAR_SCALE_MAX, 0, 1);
  const fuzzed = trueStars + noiseSeed * decay;
  return roundToHalf(clamp(fuzzed, 0.5, 5));
}

export function potentialDisplayStars(gladiator: Gladiator, reputation: number): number {
  const seed = gladiator.potentialNoiseSeed ?? fallbackNoiseSeed(gladiator.id);
  return fuzzyPotentialStars(gladiator.potentialAbility, seed, reputation, gladiator.potentialRevealed === "exact");
}

export interface PotentialStarDisplay {
  stars: number;
  label: string;
  revealed: boolean;
}

export function potentialStarDisplay(gladiator: Gladiator, reputation: number): PotentialStarDisplay {
  const stars = potentialDisplayStars(gladiator, reputation);
  return { stars, label: potentialStarLabel(stars), revealed: gladiator.potentialRevealed === "exact" };
}
