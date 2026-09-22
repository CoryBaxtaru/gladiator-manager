import type { DeathMatchOutcome, FightMatchup, Gladiator, LudusState, RivalGladiator, RivalLudus } from "../types";
import { DEATH_MATCH, FIGHT_ECONOMY } from "../config";
import { resolveFight, applyCombatResultToGladiator } from "./combat";
import { reputationCapFor } from "./promotion";
import { nextId, pick, chance } from "./rng";
import { currentAbilityOf } from "./rating";

function average(values: number[]): number {
  if (values.length === 0) return 1;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function cooldownActive(state: LudusState, rivalLudusId: string): boolean {
  const entry = state.deathMatchCooldowns.find((c) => c.rivalLudusId === rivalLudusId);
  return !!entry && state.currentDay < entry.cooldownUntilDay;
}

function setCooldown(state: LudusState, rivalLudusId: string): LudusState {
  const others = state.deathMatchCooldowns.filter((c) => c.rivalLudusId !== rivalLudusId);
  return {
    ...state,
    deathMatchCooldowns: [...others, { rivalLudusId, cooldownUntilDay: state.currentDay + DEATH_MATCH.cooldownDays }],
  };
}

/** Ludi the player is currently allowed to challenge: strictly higher reputation, no active cooldown. */
export function eligibleChallengeTargets(state: LudusState): RivalLudus[] {
  return state.rivalLudi.filter((l) => l.reputation > state.reputation && !cooldownActive(state, l.id));
}

/**
 * Decline chance for the challenged side, based on the challenger's best gladiator
 * versus the challenged roster's average ability. A much weaker challenger is usually
 * declined (not worth the risk to a more prestigious school); a comparable or stronger
 * challenger is usually accepted. Never fully 0% or 100%.
 */
export function declineChance(challengerCA: number, challengedRosterCA: number[]): number {
  const avgChallenged = average(challengedRosterCA);
  const ratio = challengerCA / Math.max(1, avgChallenged);
  const base = DEATH_MATCH.declineBaseline - ratio * DEATH_MATCH.declineRatioWeight;
  return Math.max(DEATH_MATCH.declineFloor, Math.min(DEATH_MATCH.declineCeiling, base));
}

function pickRivalOpponent(roster: RivalGladiator[], playerCA: number): RivalGladiator {
  const sorted = [...roster].sort((a, b) => Math.abs(a.currentAbility - playerCA) - Math.abs(b.currentAbility - playerCA));
  return sorted[0];
}

/**
 * Deterministic (pure function of roster + player CA, no randomness) so the UI can
 * preview the exact opponent a challenge will be matched against before the player
 * commits, and resolution will pick the same one.
 */
export function previewOpponent(state: LudusState, rivalLudusId: string, playerGladiatorId: string): RivalGladiator | null {
  const rivalLudus = state.rivalLudi.find((l) => l.id === rivalLudusId);
  const gladiator = state.gladiators.find((g) => g.id === playerGladiatorId);
  if (!rivalLudus || !gladiator || rivalLudus.roster.length === 0) return null;
  return pickRivalOpponent(rivalLudus.roster, currentAbilityOf(gladiator));
}

function reputationTransfer(loserReputation: number): number {
  return Math.max(DEATH_MATCH.minReputationTransfer, Math.round(loserReputation * DEATH_MATCH.reputationTransferPercent));
}

/** Tied to the same tier-purse scale as fight income: a death match wager is a
 * high-stakes multiple of a normal win at the challenger's actually-unlocked tier. */
function goldWager(state: LudusState): number {
  const tierMultiplier = FIGHT_ECONOMY.tierMultiplier[state.unlockedTier];
  return Math.round(FIGHT_ECONOMY.basePurseLocal * tierMultiplier * DEATH_MATCH.goldWagerPurseMultiplier);
}

/** Resolve a death match between the player's gladiator and a specific rival ludus. Used by
 * both the player-issued challenge flow and an accepted incoming-challenge flow. */
function fightDeathMatch(
  state: LudusState,
  gladiator: Gladiator,
  rivalLudus: RivalLudus
): { state: LudusState; outcome: DeathMatchOutcome } {
  const opponent = pickRivalOpponent(rivalLudus.roster, currentAbilityOf(gladiator));
  const matchup: FightMatchup = {
    id: nextId("dm"),
    gladiatorId: gladiator.id,
    tier: rivalLudus.tier,
    opponentName: opponent.name,
    opponentPowerLevel: opponent.currentAbility,
    opponentStats: opponent.stats,
    rivalLudusName: rivalLudus.name,
  };

  const combat = resolveFight(matchup, gladiator, state, state.currentDay, { lethal: true });
  const updatedGladiator = applyCombatResultToGladiator(gladiator, combat, state.currentDay);

  const playerWon = combat.outcome === "win";
  const repAtStake = playerWon ? rivalLudus.reputation : state.reputation;
  const transferred = reputationTransfer(repAtStake);
  const wager = goldWager(state);

  let working: LudusState = {
    ...state,
    gladiators: state.gladiators.map((g) => (g.id === gladiator.id ? updatedGladiator : g)),
  };

  if (playerWon) {
    // The rival's fighter dies in the loss: he's gone from that ludus's roster.
    // Reputation from a death match win is capped the same as ordinary fights: it
    // can't be used as a backdoor around the Promotion Fight gate.
    working = {
      ...working,
      reputation: Math.min(reputationCapFor(working), working.reputation + transferred),
      gold: working.gold + wager,
      rivalLudi: working.rivalLudi.map((l) =>
        l.id === rivalLudus.id
          ? { ...l, reputation: Math.max(0, l.reputation - transferred), roster: l.roster.filter((r) => r.id !== opponent.id) }
          : l
      ),
    };
  } else {
    working = {
      ...working,
      reputation: Math.max(0, working.reputation - transferred),
      // No gold floor: a lost wager can push the ludus into debt, same as any other cost.
      gold: working.gold - wager,
      rivalLudi: working.rivalLudi.map((l) =>
        l.id === rivalLudus.id ? { ...l, reputation: l.reputation + transferred } : l
      ),
    };
  }

  working = setCooldown(working, rivalLudus.id);

  return {
    state: working,
    outcome: {
      declined: false,
      rivalLudusName: rivalLudus.name,
      combat,
      reputationTransferred: playerWon ? transferred : -transferred,
      goldDelta: playerWon ? wager : -wager,
    },
  };
}

/** Player challenges a rival ludus with a chosen gladiator. */
export function issueChallenge(
  state: LudusState,
  rivalLudusId: string,
  gladiatorId: string
): { state: LudusState; outcome: DeathMatchOutcome } | null {
  const rivalLudus = state.rivalLudi.find((l) => l.id === rivalLudusId);
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!rivalLudus || !gladiator) return null;
  if (rivalLudus.reputation <= state.reputation) return null;
  if (cooldownActive(state, rivalLudusId)) return null;
  if (gladiator.status !== "active" || gladiator.injuryDaysRemaining > 0) return null;

  const decline = declineChance(currentAbilityOf(gladiator), rivalLudus.roster.map((r) => r.currentAbility));
  if (chance(decline)) {
    const declinedState = setCooldown(state, rivalLudusId);
    return { state: declinedState, outcome: { declined: true, rivalLudusName: rivalLudus.name } };
  }

  return fightDeathMatch(state, gladiator, rivalLudus);
}

/** Rolled once per day tick: a higher-reputation rival occasionally issues a challenge to the player. */
export function maybeRivalInitiatesChallenge(state: LudusState): LudusState {
  if (state.pendingDeathMatchChallenge) return state;
  const activeGladiators = state.gladiators.filter((g) => g.status === "active");
  if (activeGladiators.length === 0) return state;

  const candidates = state.rivalLudi.filter((l) => l.reputation > state.reputation && !cooldownActive(state, l.id));
  if (candidates.length === 0) return state;
  if (!chance(DEATH_MATCH.rivalChallengeDailyChance)) return state;

  const rivalLudus = pick(candidates);
  return {
    ...state,
    pendingDeathMatchChallenge: {
      id: nextId("dmc"),
      rivalLudusId: rivalLudus.id,
      rivalLudusName: rivalLudus.name,
      offeredOnDay: state.currentDay,
    },
  };
}

/** Player responds to an incoming challenge. Declining costs nothing but the cooldown. */
export function respondToChallenge(
  state: LudusState,
  accept: boolean,
  gladiatorId?: string
): { state: LudusState; outcome: DeathMatchOutcome | null } {
  const pending = state.pendingDeathMatchChallenge;
  if (!pending) return { state, outcome: null };
  const rivalLudus = state.rivalLudi.find((l) => l.id === pending.rivalLudusId);
  const cleared = { ...state, pendingDeathMatchChallenge: null };
  if (!rivalLudus) return { state: cleared, outcome: null };

  if (!accept || !gladiatorId) {
    const declinedState = setCooldown(cleared, rivalLudus.id);
    return { state: declinedState, outcome: { declined: true, rivalLudusName: rivalLudus.name } };
  }

  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || gladiator.status !== "active" || gladiator.injuryDaysRemaining > 0) {
    return { state: cleared, outcome: null };
  }

  const result = fightDeathMatch(cleared, gladiator, rivalLudus);
  return result;
}
