import type { DeathMatchOutcome, FightMatchup, Gladiator, LudusState, RivalGladiator, RivalLudus } from "../types";
import { DEATH_MATCH, FIGHT_ECONOMY, SELF_CHALLENGE } from "../config";
import { resolveFight, applyCombatResultToGladiator, canFight, techniqueAnnouncementFor } from "./combat";
import { reputationCapFor } from "./promotion";
import { nextId, pick, chance } from "./rng";
import { currentAbilityOf, effectiveStats } from "./rating";
import { generateGladiator } from "./generator";
import { generateArenaName } from "./names";

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
  const techniqueAnnouncement = techniqueAnnouncementFor(gladiator, updatedGladiator);

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
      mode: "ludus",
      techniqueAnnouncement,
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
  if (!canFight(gladiator)) return null;

  const decline = declineChance(currentAbilityOf(gladiator), rivalLudus.roster.map((r) => r.currentAbility));
  if (chance(decline)) {
    const declinedState = setCooldown(state, rivalLudusId);
    return { state: declinedState, outcome: { declined: true, declinedBy: "rival", rivalLudusName: rivalLudus.name } };
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

/**
 * Player responds to an incoming challenge. Declining now costs real reputation (a
 * smaller, softer cost than actually losing the death match) rather than being free --
 * backing down from a fight your own ludus was challenged into should sting a little,
 * same "real, felt effect" standard as every other consequence in this system.
 */
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
    const penalty = Math.max(
      DEATH_MATCH.minDeclineReputationPenalty,
      Math.round(cleared.reputation * DEATH_MATCH.declineReputationPenaltyPercent)
    );
    const declinedState = setCooldown(
      { ...cleared, reputation: Math.max(0, cleared.reputation - penalty) },
      rivalLudus.id
    );
    return {
      state: declinedState,
      outcome: { declined: true, declinedBy: "player", rivalLudusName: rivalLudus.name, reputationTransferred: -penalty },
    };
  }

  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canFight(gladiator)) {
    return { state: cleared, outcome: null };
  }

  const result = fightDeathMatch(cleared, gladiator, rivalLudus);
  return result;
}

/**
 * Phase 12 Part C/D: a second, self-directed Challenge mode -- the player picks one of
 * their OWN gladiators and an opponent is generated scaled around THAT gladiator's own
 * ability, rather than being limited to challenging a specific higher-reputation rival
 * ludus. Non-lethal (ordinary resolveFight, same as a fight day), so a bad roll costs
 * the same real stakes an ordinary loss does (injury, and now a real death risk with a
 * sponsor-or-let-die choice, see combat.ts) but never an automatic kill. This is also
 * the primary fix for underleveled recruits: a way to arrange a winnable, appropriately
 * scaled match for one specific fighter instead of hoping ordinary tier-scaled fight
 * days happen to suit him.
 */
export function canSelfChallenge(gladiator: Gladiator, currentDay: number): boolean {
  if (!canFight(gladiator)) return false;
  return !gladiator.lastSelfChallengeDay || currentDay - gladiator.lastSelfChallengeDay >= SELF_CHALLENGE.cooldownDays;
}

/** Pure random generation -- used by drawSelfChallengeOpponent, never called directly
 * by the UI anymore (Phase 13 Part B), so a preview can't reroll by re-invoking this. */
function generateSelfChallengeOpponent(gladiator: Gladiator): RivalGladiator {
  const gladiatorCA = currentAbilityOf(gladiator);
  const base = Math.max(3, gladiatorCA + SELF_CHALLENGE.opponentCAOffset);
  const full = generateGladiator(1, { baseStatOverride: Math.round(base), statSpreadOverride: SELF_CHALLENGE.opponentSpread });
  return {
    id: full.id,
    name: `${generateArenaName()}, an arranged opponent`,
    origin: full.origin,
    currentAbility: currentAbilityOf(full),
    stats: effectiveStats(full),
    potentialAbility: full.potentialAbility,
    potentialNoiseSeed: full.potentialNoiseSeed ?? 0,
    physicalTrait: full.physicalTrait,
    personalityTraits: full.personalityTraits,
    backstory: full.backstory,
  };
}

/**
 * Phase 13 Part B: an opponent, once drawn for a gladiator, is locked in for the day
 * it was drawn rather than rerolled every time the preview is opened -- closing and
 * reopening the picker (or even the whole screen) the same day returns the exact same
 * opponent. Time actually has to pass (a new day) before a fresh draw happens; the
 * player can still decline and walk away without committing, they just can't fish for
 * a better one for free. Not a pure function (mutates state on a fresh draw), so the
 * caller commits the result the same way any other Math.random()-using action does.
 */
export function drawSelfChallengeOpponent(state: LudusState, gladiatorId: string): { state: LudusState; opponent: RivalGladiator | null } {
  const existing = state.selfChallengeDraws[gladiatorId];
  if (existing && existing.generatedOnDay === state.currentDay) {
    return { state, opponent: existing.opponent };
  }

  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator) return { state, opponent: null };

  const opponent = generateSelfChallengeOpponent(gladiator);
  return {
    state: {
      ...state,
      selfChallengeDraws: { ...state.selfChallengeDraws, [gladiatorId]: { opponent, generatedOnDay: state.currentDay } },
    },
    opponent,
  };
}

export function resolveSelfChallenge(state: LudusState, gladiatorId: string): { state: LudusState; outcome: DeathMatchOutcome } | null {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !canSelfChallenge(gladiator, state.currentDay)) return null;

  // Reuses today's locked-in draw if the player already previewed one (the normal
  // path); falls back to a fresh generation only if this is somehow called without a
  // prior preview, so the function still works standalone.
  const draw = state.selfChallengeDraws[gladiatorId];
  const opponent = draw && draw.generatedOnDay === state.currentDay ? draw.opponent : generateSelfChallengeOpponent(gladiator);
  const matchup: FightMatchup = {
    id: nextId("sc"),
    gladiatorId: gladiator.id,
    tier: state.unlockedTier,
    opponentName: opponent.name,
    opponentPowerLevel: opponent.currentAbility,
    opponentStats: opponent.stats,
    rivalLudusName: "an arranged match",
  };

  const activeCount = state.gladiators.filter((g) => g.status === "active").length;
  const combat = resolveFight(matchup, gladiator, state, state.currentDay);
  const combatUpdatedGladiator = applyCombatResultToGladiator(gladiator, combat, state.currentDay, activeCount === 1);
  const techniqueAnnouncement = techniqueAnnouncementFor(gladiator, combatUpdatedGladiator);
  const updatedGladiator = {
    ...combatUpdatedGladiator,
    lastSelfChallengeDay: state.currentDay,
  };

  const remainingDraws = Object.fromEntries(Object.entries(state.selfChallengeDraws).filter(([id]) => id !== gladiatorId));

  const working: LudusState = {
    ...state,
    gladiators: state.gladiators.map((g) => (g.id === gladiator.id ? updatedGladiator : g)),
    gold: state.gold + combat.goldReward,
    reputation: Math.min(reputationCapFor(state), Math.max(0, state.reputation + combat.reputationReward)),
    selfChallengeDraws: remainingDraws,
  };

  return {
    state: working,
    outcome: {
      declined: false,
      rivalLudusName: matchup.rivalLudusName,
      combat,
      goldDelta: combat.goldReward,
      reputationTransferred: combat.reputationReward,
      mode: "self",
      techniqueAnnouncement,
    },
  };
}
