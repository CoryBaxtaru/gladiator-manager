// Real sprite lookup, keyed by origin and condition (Phase 9 Part C). The 32 source
// images live in public/sprites -- Vite serves anything under public/ unchanged at
// the site root in both dev and a production build, the same convention already used
// for favicon.svg/icons.svg (see DEPLOY.md), so a root-relative path here works in
// both without any bundler config.
import type { GladiatorCondition, Origin } from "../types";

const ORIGIN_FILE: Record<Origin, string> = {
  Thracian: "thracian",
  Gaul: "gaul",
  Nubian: "nubian",
  Roman: "roman",
  Numidian: "numidian",
  Germanic: "germanic",
  Syrian: "syrian",
  Greek: "greek",
};

const CONDITION_FILE: Record<GladiatorCondition, string> = {
  healthy: "healthy",
  bruised: "lightly_wounded",
  injured: "badly_wounded",
  gravely_injured: "near_death",
};

/**
 * Gear is fixed per origin, not per individual, so two gladiators sharing an origin
 * and condition share a portrait -- intended scope, not a bug (see Phase 9 Part C).
 */
export function getPortraitSrc(origin: Origin, condition: GladiatorCondition): string {
  return `/sprites/${ORIGIN_FILE[origin]}_${CONDITION_FILE[condition]}.png`;
}

/**
 * Standalone head-and-shoulders portraits (a later addition), used for the Roster
 * list's compact "headshot" variant instead of a CSS crop of the full-body image --
 * these are purpose-composed close-ups, not derived from the same source art, so
 * they live in their own public/sprites/heads folder with a "head_" filename prefix.
 */
export function getHeadshotSrc(origin: Origin, condition: GladiatorCondition): string {
  return `/sprites/heads/head_${ORIGIN_FILE[origin]}_${CONDITION_FILE[condition]}.png`;
}
