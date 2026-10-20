import type { FightOutcome, FightTier, LudusState, RivalGladiator, RivalLudus } from "../types";
import { FIGHT_DAY, REPUTATION_BANDS_BY_TIER, RIVALRY } from "../config";
import { reputationToStars, currentAbilityOf, effectiveStats } from "./rating";
import { generateArenaName, generateLudusName, ludusEpithet } from "./names";
import { generateGladiator } from "./generator";
import { nextId, randInt } from "./rng";

const TIERS: FightTier[] = ["local", "provincial", "rival", "colosseum"];

// See docs/difficulty-ramp.md: these bases used to step +15 per tier (15/30/45/65),
// applied the instant reputation crossed the threshold, while organic player CA growth
// only manages 2-5 points over the ~20-25 days it takes to reach that threshold -- a
// 15-28 CA point gap. Gentler here, and matchmakeFightDay (engine/fightday.ts) also
// blends in the tier below for the first half of a new tier's reputation band, so the
// jump is a ramp, not a wall.
function rosterStrengthForTier(tier: FightTier): { base: number; spread: number } {
  switch (tier) {
    case "local":
      return { base: 15, spread: 20 };
    case "provincial":
      return { base: 27, spread: 20 };
    case "rival":
      return { base: 40, spread: 20 };
    case "colosseum":
      return { base: 56, spread: 20 };
  }
}

/**
 * Rival gladiators are generated through the same pipeline as the player's own
 * roster (stats, potential, traits, backstory), so a challenge preview or hover
 * card can show real information rather than a stub. Only the display name
 * differs: a gladiator carries his school as a suffix, e.g. "Hilarus Neronianus"
 * is attested at Pompeii and means "Hilarus of the Neronian ludus".
 */
function generateRivalGladiator(tier: FightTier, ludusName: string): RivalGladiator {
  const { base, spread } = rosterStrengthForTier(tier);
  const full = generateGladiator(1, { baseStatOverride: base, statSpreadOverride: spread });

  const epithet = ludusEpithet(ludusName);
  const arenaName = generateArenaName();
  const name = epithet ? `${arenaName} ${epithet}` : arenaName;

  return {
    id: full.id,
    name,
    origin: full.origin,
    currentAbility: currentAbilityOf(full),
    // Rivals never train and are never seen mid-fight the way the player's own
    // gladiators are, so their stored stats are the effective (post-trait) numbers
    // directly -- what they actually bring to a clash, with nothing left implicit.
    stats: effectiveStats(full),
    potentialAbility: full.potentialAbility,
    potentialNoiseSeed: full.potentialNoiseSeed ?? 0,
    physicalTrait: full.physicalTrait,
    personalityTraits: full.personalityTraits,
    backstory: full.backstory,
  };
}

function generateRivalLudus(tier: FightTier, usedNames: Set<string>): RivalLudus {
  const name = generateLudusName(usedNames);
  usedNames.add(name);

  const band = REPUTATION_BANDS_BY_TIER[tier];
  const reputation = randInt(band.min, band.max);
  const rosterSize = randInt(FIGHT_DAY.rosterSizeMin, FIGHT_DAY.rosterSizeMax);
  const roster = Array.from({ length: rosterSize }, () => generateRivalGladiator(tier, name));

  return {
    id: nextId("rl"),
    name,
    tier,
    reputation,
    facilityLevel: Math.max(1, Math.round(reputationToStars(reputation))),
    roster,
    record: { wins: 0, losses: 0, meetingsWon: 0, meetingsLost: 0 },
  };
}

/**
 * `excludeName` keeps a rival ludus from ever being generated with the SAME name as
 * the player's own -- confirmed in Round 10 playtesting: a rival drawn from the same
 * pool with no exclusion could land on the player's exact ludus name, producing
 * nonsense like "Ludus Aurelianus has challenged your ludus... of the Ludus
 * Aurelianus." Seeded into the same `usedNames` set generateLudusName already uses to
 * keep the three ludi within a tier from colliding with each other.
 */
export function generateAllRivalLudi(excludeName?: string): RivalLudus[] {
  const usedNames = new Set<string>();
  if (excludeName) usedNames.add(excludeName);
  const ludi: RivalLudus[] = [];
  for (const tier of TIERS) {
    for (let i = 0; i < FIGHT_DAY.ludiPerTier; i++) {
      ludi.push(generateRivalLudus(tier, usedNames));
    }
  }
  return ludi;
}

export function tierForReputation(reputation: number): FightTier {
  if (reputation >= REPUTATION_BANDS_BY_TIER.colosseum.min) return "colosseum";
  if (reputation >= REPUTATION_BANDS_BY_TIER.rival.min) return "rival";
  if (reputation >= REPUTATION_BANDS_BY_TIER.provincial.min) return "provincial";
  return "local";
}

export function rivalLudiForTier(state: LudusState, tier: FightTier): RivalLudus[] {
  const matching = state.rivalLudi.filter((l) => l.tier === tier);
  return matching.length > 0 ? matching : state.rivalLudi;
}

/**
 * Records one meeting with a specific persistent rival ludus -- a fight day, a
 * Promotion Fight or a ludus death match; anything without a real rivalLudusId
 * (self-challenges, the Colosseum finale) is a no-op. Every bout still counts toward
 * the per-bout win/loss record (the Ludi Rankings column and its Bitter Rival tag),
 * but the "the crowd remembers" notice counts MEETINGS, each decided by which side
 * won more of that day's bouts. Counting bouts made one fight day with three fighters
 * against the same school read as a three-time rivalry before a second meeting had
 * ever happened.
 */
export function recordRivalryMeeting(
  state: LudusState,
  rivalLudusId: string | null | undefined,
  outcomes: FightOutcome[]
): { state: LudusState; notice: string | null } {
  if (!rivalLudusId || outcomes.length === 0) return { state, notice: null };
  const ludus = state.rivalLudi.find((l) => l.id === rivalLudusId);
  if (!ludus) return { state, notice: null };

  const boutWins = outcomes.filter((o) => o === "win").length;
  const boutLosses = outcomes.filter((o) => o === "loss").length;
  const meetingWon = boutWins > boutLosses;
  const meetingLost = boutLosses > boutWins;

  const record = {
    wins: ludus.record.wins + boutWins,
    losses: ludus.record.losses + boutLosses,
    meetingsWon: ludus.record.meetingsWon + (meetingWon ? 1 : 0),
    meetingsLost: ludus.record.meetingsLost + (meetingLost ? 1 : 0),
  };

  const updated: LudusState = {
    ...state,
    rivalLudi: state.rivalLudi.map((l) => (l.id === rivalLudusId ? { ...l, record } : l)),
  };

  let notice: string | null = null;
  if (meetingLost && RIVALRY.noticeThresholds.includes(record.meetingsLost)) {
    notice = `${ludus.name} has got the better of you on ${record.meetingsLost} separate occasions now. The crowd remembers.`;
  } else if (meetingWon && RIVALRY.noticeThresholds.includes(record.meetingsWon)) {
    notice = `Your ludus has got the better of ${ludus.name} on ${record.meetingsWon} separate occasions now. They won't soon forget this rivalry.`;
  }

  return { state: updated, notice };
}
