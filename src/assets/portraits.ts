// Real sprite lookup, keyed by origin and condition (Phase 9 Part C). The source
// images live in public/sprites -- Vite serves anything under public/ unchanged,
// same convention as favicon.svg/icons.svg (see DEPLOY.md). Paths are built off
// import.meta.env.BASE_URL rather than a hardcoded leading slash: a root deploy has
// BASE_URL "/", but a subpath deploy (e.g. GitHub Pages at /repo-name/) does not, and
// a hardcoded "/sprites/..." would 404 there since it skips the subpath entirely.
import type { GladiatorCondition, Origin } from "../types";

const BASE = import.meta.env.BASE_URL;

const ORIGIN_FILE: Record<Origin, string> = {
  Thracian: "thracian",
  Gaul: "gaul",
  Nubian: "nubian",
  Roman: "roman",
  Numidian: "numidian",
  Germanic: "germanic",
  Syrian: "syrian",
  Greek: "greek",
  // No sprite art exists for this one-off origin (see the Origin type's own note) --
  // Caucasian Iberia had real Hellenistic cultural ties, so the Greek set stands in.
  Iberian: "greek",
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
  return `${BASE}sprites/${ORIGIN_FILE[origin]}_${CONDITION_FILE[condition]}.png`;
}

/**
 * Standalone head-and-shoulders portraits (a later addition), used for the Roster
 * list's compact "headshot" variant instead of a CSS crop of the full-body image --
 * these are purpose-composed close-ups, not derived from the same source art, so
 * they live in their own public/sprites/heads folder with a "head_" filename prefix.
 */
export function getHeadshotSrc(origin: Origin, condition: GladiatorCondition): string {
  return `${BASE}sprites/heads/head_${ORIGIN_FILE[origin]}_${CONDITION_FILE[condition]}.png`;
}
