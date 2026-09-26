import type { FightMatchup, FightTier, Gladiator, LudusState } from "../types";
import { FIGHT_DAY, DIFFICULTY_RAMP, REPUTATION_BANDS_BY_TIER } from "../config";
import { rivalLudiForTier } from "./rivalLudi";
import { nextId, pick, chance } from "./rng";
import { currentAbilityOf } from "./rating";
import { canFight } from "./combat";

const TIER_ORDER: FightTier[] = ["local", "provincial", "rival", "colosseum"];

function tierBelow(tier: FightTier): FightTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx > 0 ? TIER_ORDER[idx - 1] : null;
}

/** 0 at the tier's reputation floor, 1 at its ceiling. */
function bandProgress(reputation: number, tier: FightTier): number {
  const band = REPUTATION_BANDS_BY_TIER[tier];
  if (band.max <= band.min) return 1;
  return Math.max(0, Math.min(1, (reputation - band.min) / (band.max - band.min)));
}

/**
 * See docs/difficulty-ramp.md. Right at the floor of a new tier, matchmaking leans
 * heavily on the tier below (the one the player has already proven they can handle);
 * that blend fades out over the first DIFFICULTY_RAMP.bandFraction of the new tier's
 * reputation band, so opponent strength ramps into a new tier instead of walling it.
 */
function pickMatchTier(state: LudusState, tier: FightTier): FightTier {
  const below = tierBelow(tier);
  if (!below) return tier;
  const rampProgress = Math.min(1, bandProgress(state.reputation, tier) / DIFFICULTY_RAMP.bandFraction);
  const blendChance = (1 - rampProgress) * DIFFICULTY_RAMP.maxBlendChance;
  return chance(blendChance) ? below : tier;
}

export function eligibleForFightDay(gladiators: Gladiator[]): Gladiator[] {
  return gladiators.filter(canFight);
}

export function computeNextFightDay(fromDay: number): number {
  return fromDay + FIGHT_DAY.intervalDays;
}

/** Builds one matchup per selected gladiator by pairing against a rival gladiator of
 * similar ability, one gladiator at a time so the difficulty-ramp roll (and its pool
 * of candidate ludi) can vary per matchup rather than locking the whole fight day to a
 * single tier. Ordinary fight days always match at the player's actually-unlocked
 * tier (see engine/promotion.ts) -- reputation can sit at or above a tier's threshold
 * without that tier's opponents showing up here until a Promotion Fight is won. */
export function matchmakeFightDay(state: LudusState, selectedGladiatorIds: string[]): FightMatchup[] {
  const playerTier = state.unlockedTier;
  const matchups: FightMatchup[] = [];
  // Tracks rival gladiators already drafted elsewhere in this same fight day's batch,
  // so the same named individual doesn't appear to fight (and lose to) two different
  // player gladiators on the same day -- confirmed happening repeatedly in playtesting
  // once the roster passed ~5 fighters, since each matchup used to be picked in
  // isolation with no memory of what the earlier iterations of this loop had already used.
  const usedRivalGladiatorIds = new Set<string>();

  for (const gladiatorId of selectedGladiatorIds) {
    const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
    if (!gladiator) continue;

    const matchTier = pickMatchTier(state, playerTier);
    const candidateLudi = rivalLudiForTier(state, matchTier);
    if (candidateLudi.length === 0) continue;

    const rivalLudus = pick(candidateLudi);
    if (rivalLudus.roster.length === 0) continue;

    const gladiatorCA = currentAbilityOf(gladiator);
    // Prefer an opponent not already booked today; if this ludus's whole roster is
    // already spoken for (a very small roster relative to the player's), fall back to
    // reusing one rather than skipping the matchup outright.
    const available = rivalLudus.roster.filter((r) => !usedRivalGladiatorIds.has(r.id));
    const pool = available.length > 0 ? available : rivalLudus.roster;
    const closest = [...pool].sort(
      (a, b) => Math.abs(a.currentAbility - gladiatorCA) - Math.abs(b.currentAbility - gladiatorCA)
    )[0];
    usedRivalGladiatorIds.add(closest.id);

    matchups.push({
      id: nextId("fm"),
      gladiatorId,
      tier: matchTier,
      opponentName: closest.name,
      opponentPowerLevel: closest.currentAbility,
      opponentStats: closest.stats,
      rivalLudusName: rivalLudus.name,
    });
  }

  return matchups;
}
