import type { CombatResult, FightMatchup, FightTier, LudusState, PromotionOutcome, RivalGladiator, RivalLudus } from "../types";
import { PROMOTION, REPUTATION_BANDS_BY_TIER } from "../config";
import { rivalLudiForTier } from "./rivalLudi";
import { resolveFight, applyCombatResultToGladiator } from "./combat";
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

/** Reputation has reached the cap for the current tier, there's a tier left to earn,
 * and no cooldown from a recent loss is still active. */
export function promotionAvailable(state: LudusState): boolean {
  if (nextTierOf(state.unlockedTier) === null) return false;
  if (promotionOnCooldown(state)) return false;
  return state.reputation >= reputationCapFor(state);
}

export interface PromotionChampion {
  rivalLudus: RivalLudus;
  gladiator: RivalGladiator;
}

/**
 * The top-ranked rival ludus in the player's CURRENT tier puts forward its best
 * gladiator -- proving you belong at the next tier means beating the best of the one
 * you're leaving. Deterministic (pure function of state), so the same champion shows
 * up in the preview and in the actual resolved fight.
 */
export function promotionChampion(state: LudusState): PromotionChampion | null {
  const pool = rivalLudiForTier(state, state.unlockedTier);
  if (pool.length === 0) return null;
  const topLudus = [...pool].sort((a, b) => b.reputation - a.reputation)[0];
  if (topLudus.roster.length === 0) return null;
  const gladiator = [...topLudus.roster].sort((a, b) => b.currentAbility - a.currentAbility)[0];
  return { rivalLudus: topLudus, gladiator };
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
  if (!gladiator || gladiator.status !== "active" || gladiator.injuryDaysRemaining > 0) return null;
  if (!promotionAvailable(state)) return null;

  const matchup = buildPromotionMatchup(state, gladiatorId);
  if (!matchup) return null;

  const activeCount = state.gladiators.filter((g) => g.status === "active").length;
  const combat = resolveFight(matchup, gladiator, state, currentDay);
  const updatedGladiator = applyCombatResultToGladiator(gladiator, combat, currentDay, activeCount === 1);

  let working: LudusState = {
    ...state,
    gladiators: state.gladiators.map((g) => (g.id === gladiator.id ? updatedGladiator : g)),
  };

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
    return { state: working, outcome: { won: true, combat: displayCombat, newTier, cooldownUntilDay: null } };
  }

  const cooldownUntilDay = currentDay + PROMOTION.cooldownDays;
  working = {
    ...working,
    gold: working.gold + combat.goldReward,
    reputation: Math.max(0, working.reputation + combat.reputationReward),
    promotionCooldownUntilDay: cooldownUntilDay,
  };
  return { state: working, outcome: { won: false, combat, newTier: null, cooldownUntilDay } };
}
