import type { CombatResult, FightMatchup, FightTier, LudusState, PromotionOutcome, RivalGladiator, RivalLudus } from "../types";
import { PROMOTION, PROMOTION_READINESS, REPUTATION_BANDS_BY_TIER } from "../config";
import { rivalLudiForTier, recordRivalryResult } from "./rivalLudi";
import { resolveFight, applyCombatResultToGladiator, canFight, techniqueAnnouncementFor } from "./combat";
import { currentAbilityOf } from "./rating";
import { nextId } from "./rng";

const TIER_ORDER: FightTier[] = ["local", "provincial", "rival", "colosseum"];

export function nextTierOf(tier: FightTier): FightTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

/** The reputation ceiling for the player's current unlocked tier: the next tier's
 * floor, or unbounded once already at the top (Colosseum). */
export function reputationCapFor(state: LudusState): number {
  const next = nextTierOf(state.unlockedTier);
  return next ? REPUTATION_BANDS_BY_TIER[next].min : Infinity;
}

export function promotionOnCooldown(state: LudusState): boolean {
  return state.promotionCooldownUntilDay !== null && state.currentDay < state.promotionCooldownUntilDay;
}

export interface PromotionReadiness {
  ok: boolean;
  avgBuildingLevel: number;
  requiredBuildingLevel: number;
  avgRosterCA: number;
  requiredRosterCA: number;
}

/** Whether the ludus is actually built/trained for the tier it's about to enter, as a
 * check separate from (and in addition to) the reputation cap. See PROMOTION_READINESS. */
export function promotionReadiness(state: LudusState): PromotionReadiness | null {
  const next = nextTierOf(state.unlockedTier);
  if (!next) return null;
  const required = PROMOTION_READINESS[next];

  const buildingLevels = Object.values(state.buildings).map((b) => b.level);
  const avgBuildingLevel = buildingLevels.reduce((sum, l) => sum + l, 0) / buildingLevels.length;

  const active = state.gladiators.filter((g) => g.status === "active");
  const avgRosterCA = active.length === 0 ? 0 : active.reduce((sum, g) => sum + currentAbilityOf(g), 0) / active.length;

  return {
    ok: avgBuildingLevel >= required.minAvgBuildingLevel && avgRosterCA >= required.minAvgRosterCA,
    avgBuildingLevel,
    requiredBuildingLevel: required.minAvgBuildingLevel,
    avgRosterCA,
    requiredRosterCA: required.minAvgRosterCA,
  };
}

/** Reputation has reached the cap for the current tier, the ludus is actually ready
 * for the next one (see promotionReadiness), there's a tier left to earn, and no
 * cooldown from a recent loss is still active. */
export function promotionAvailable(state: LudusState): boolean {
  if (nextTierOf(state.unlockedTier) === null) return false;
  if (promotionOnCooldown(state)) return false;
  if (state.reputation < reputationCapFor(state)) return false;
  const readiness = promotionReadiness(state);
  return readiness ? readiness.ok : true;
}

export interface PromotionChampion {
  rivalLudus: RivalLudus;
  gladiator: RivalGladiator;
}

/**
 * Phase 11 Part C: previously drawn from the best gladiator of the top-ranked ludus
 * in the player's CURRENT tier -- but the tier multiplier on the fight's purse/
 * reputation formula already treats this as a next-tier occasion (see
 * buildPromotionMatchup below), while the opponent himself was still only as tough as
 * the tier being LEFT. Beating the best of a tier you already fight in every day is a
 * formality, not a real test of whether the roster can survive the next one.
 *
 * Now draws a median-strength gladiator from the tier being ENTERED: every rival
 * ludus's roster at that tier, pooled and sorted by ability, taking the middle entry.
 * Not the tier's best (that would just move the formality one tier later) and not its
 * weakest (that would defeat the point of a readiness test) -- a real, average
 * representative of what the player is about to fight regularly. Deterministic (pure
 * function of state), so the same champion shows up in the preview and the resolved
 * fight.
 */
export function promotionChampion(state: LudusState): PromotionChampion | null {
  const next = nextTierOf(state.unlockedTier);
  if (!next) return null;
  const pool = rivalLudiForTier(state, next);
  const entries = pool.flatMap((rivalLudus) => rivalLudus.roster.map((gladiator) => ({ rivalLudus, gladiator })));
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.gladiator.currentAbility - b.gladiator.currentAbility);
  return entries[Math.floor(entries.length / 2)];
}

/** The tier multiplier used for the promotion fight's purse/reputation formula is the
 * tier being promoted INTO, not the current one -- a real occasion should pay and cost
 * like the next tier already, not the one you're trying to leave. */
export function buildPromotionMatchup(state: LudusState, gladiatorId: string): FightMatchup | null {
  const champion = promotionChampion(state);
  const next = nextTierOf(state.unlockedTier);
  if (!champion || !next) return null;
  return {
    id: nextId("promo"),
    gladiatorId,
    tier: next,
    opponentName: champion.gladiator.name,
    opponentPowerLevel: champion.gladiator.currentAbility,
    opponentStats: champion.gladiator.stats,
    rivalLudusName: champion.rivalLudus.name,
    rivalLudusId: champion.rivalLudus.id,
  };
}

/**
 * Resolves a Promotion Fight. Reuses the exact same fight resolution as an ordinary
 * fight day, so the win/loss reputation and gold formulas stay consistent (the
 * champion's own strength and the next-tier purse multiplier already make the stakes
 * feel bigger without a separate hand-tuned number). A win adds a flat bonus on top and
 * unlocks the next tier; anything else starts the cooldown. Non-lethal like an ordinary
 * fight day: the last-gladiator floor in applyCombatResultToGladiator still applies.
 */
export function resolvePromotionFight(
  state: LudusState,
  gladiatorId: string,
  currentDay: number
): { state: LudusState; outcome: PromotionOutcome } | null {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canFight(gladiator)) return null;
  if (!promotionAvailable(state)) return null;

  const matchup = buildPromotionMatchup(state, gladiatorId);
  if (!matchup) return null;

  const activeCount = state.gladiators.filter((g) => g.status === "active").length;
  const combat = resolveFight(matchup, gladiator, state, currentDay);
  const updatedGladiator = applyCombatResultToGladiator(gladiator, combat, currentDay, activeCount === 1);
  const techniqueAnnouncement = techniqueAnnouncementFor(gladiator, updatedGladiator);

  let working: LudusState = {
    ...state,
    gladiators: state.gladiators.map((g) => (g.id === gladiator.id ? updatedGladiator : g)),
  };
  const rivalry = recordRivalryResult(working, matchup.rivalLudusId, combat.outcome);
  working = rivalry.state;
  const rivalryNotice = rivalry.notice;

  if (combat.outcome === "win") {
    const newTier = nextTierOf(state.unlockedTier)!;
    const totalGold = combat.goldReward * PROMOTION.winGoldBonusMultiplier;
    const flooredReputation = Math.max(working.reputation + combat.reputationReward, REPUTATION_BANDS_BY_TIER[newTier].min);
    const newReputation = flooredReputation + PROMOTION.winReputationBonus;
    // The result card shown to the player must reflect the TOTAL gold/reputation
    // actually applied (base formula + the win floor + the occasion bonus), not just
    // the base resolveFight numbers, so the card and the top bar never disagree.
    const displayCombat: CombatResult = {
      ...combat,
      goldReward: totalGold,
      reputationReward: newReputation - working.reputation,
    };
    working = {
      ...working,
      unlockedTier: newTier,
      reputation: newReputation,
      gold: working.gold + totalGold,
      promotionCooldownUntilDay: null,
    };
    return { state: working, outcome: { won: true, combat: displayCombat, newTier, cooldownUntilDay: null, techniqueAnnouncement, rivalryNotice } };
  }

  const cooldownUntilDay = currentDay + PROMOTION.cooldownDays;
  working = {
    ...working,
    gold: working.gold + combat.goldReward,
    reputation: Math.max(0, working.reputation + combat.reputationReward),
    promotionCooldownUntilDay: cooldownUntilDay,
  };
  return { state: working, outcome: { won: false, combat, newTier: null, cooldownUntilDay, techniqueAnnouncement, rivalryNotice } };
}
