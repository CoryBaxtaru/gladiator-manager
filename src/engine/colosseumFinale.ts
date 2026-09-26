// Phase 12 Part L: "The Emperor's Praetorian Guard", a genuine Colosseum capstone --
// distinct presentation from an ordinary fight or even a Promotion Fight, and a real
// conclusive payoff for winning. Reuses the ordinary (non-lethal) resolveFight path
// per gladiator, same reasoning as a Promotion Fight: the stakes come from the
// opponents' own strength and the occasion's framing, not a separate permadeath rule
// bolted on top -- a loss here still carries the same real death risk (and
// sponsor-or-let-die choice) an ordinary loss does, no more, no less.
import type { CombatResult, FightMatchup, Gladiator, LudusState, RivalGladiator } from "../types";
import { COLOSSEUM_FINALE, REPUTATION_BANDS_BY_TIER } from "../config";
import { resolveFight, applyCombatResultToGladiator, canFight } from "./combat";
import { generateGladiator } from "./generator";
import { generateArenaName } from "./names";
import { effectiveStats, currentAbilityOf } from "./rating";
import { nextId } from "./rng";

export function praetorianFinaleOnCooldown(state: LudusState): boolean {
  return state.praetorianCooldownUntilDay !== null && state.currentDay < state.praetorianCooldownUntilDay;
}

/** Available once the player has both reached Colosseum tier AND maxed its reputation
 * band -- the top of the ordinary progression ladder, not just the first day of it. */
export function praetorianFinaleAvailable(state: LudusState): boolean {
  if (state.unlockedTier !== "colosseum") return false;
  if (state.reputation < REPUTATION_BANDS_BY_TIER.colosseum.max) return false;
  return !praetorianFinaleOnCooldown(state);
}

function generatePraetorian(playerCA: number): RivalGladiator {
  const base = Math.round(playerCA * COLOSSEUM_FINALE.opponentCAMultiplier);
  const full = generateGladiator(1, { baseStatOverride: base, statSpreadOverride: COLOSSEUM_FINALE.opponentStatSpread });
  return {
    id: full.id,
    name: `${generateArenaName()} of the Praetorian Guard`,
    origin: full.origin,
    currentAbility: currentAbilityOf(full),
    stats: effectiveStats(full),
    potentialAbility: full.potentialAbility,
    potentialNoiseSeed: full.potentialNoiseSeed ?? 0,
    physicalTrait: full.physicalTrait,
    personalityTraits: full.personalityTraits,
    backstory:
      "A hand-picked elite of the Emperor's own guard, sent into the Colosseum to test whether any ludus truly deserves its highest honor.",
  };
}

export interface PraetorianFinaleOutcome {
  results: CombatResult[];
  won: boolean;
  gladiatorsWon: number;
  gladiatorsTotal: number;
  bonusGold: number;
  bonusReputation: number;
}

/**
 * Fields a squad matching the size of the selected fighters, each significantly
 * stronger than an ordinary Colosseum-tier opponent (one Praetorian per gladiator sent,
 * scaled to THAT gladiator's own ability). The ludus wins the occasion if more than
 * half of the sent gladiators win their own individual clash.
 */
export function resolvePraetorianFinale(
  state: LudusState,
  selectedGladiatorIds: string[]
): { state: LudusState; outcome: PraetorianFinaleOutcome } | null {
  if (!praetorianFinaleAvailable(state)) return null;
  const fighters = selectedGladiatorIds
    .map((id) => state.gladiators.find((g) => g.id === id))
    .filter((g): g is Gladiator => !!g && canFight(g));
  if (fighters.length === 0) return null;

  let gladiators = [...state.gladiators];
  const results: CombatResult[] = [];
  let gold = state.gold;
  let reputation = state.reputation;
  let wonCount = 0;

  for (const fighter of fighters) {
    const idx = gladiators.findIndex((g) => g.id === fighter.id);
    const opponent = generatePraetorian(currentAbilityOf(fighter));
    const matchup: FightMatchup = {
      id: nextId("praet"),
      gladiatorId: fighter.id,
      tier: "colosseum",
      opponentName: opponent.name,
      opponentPowerLevel: opponent.currentAbility,
      opponentStats: opponent.stats,
      rivalLudusName: "the Praetorian Guard",
    };
    const activeCount = gladiators.filter((g) => g.status === "active").length;
    const combat = resolveFight(matchup, fighter, state, state.currentDay);
    const updated = applyCombatResultToGladiator(fighter, combat, state.currentDay, activeCount === 1);
    gladiators[idx] = updated;
    results.push(combat);
    gold += combat.goldReward;
    reputation += combat.reputationReward;
    if (combat.outcome === "win") wonCount++;
  }

  const won = wonCount > fighters.length / 2;
  const bonusGold = won ? COLOSSEUM_FINALE.winGoldBonus : 0;
  const bonusReputation = won ? COLOSSEUM_FINALE.winReputationBonus : 0;

  const working: LudusState = {
    ...state,
    gladiators,
    gold: gold + bonusGold,
    reputation: Math.max(0, reputation + bonusReputation),
    praetorianCooldownUntilDay: won ? null : state.currentDay + COLOSSEUM_FINALE.cooldownDays,
    praetorianVictories: won ? state.praetorianVictories + 1 : state.praetorianVictories,
  };

  return {
    state: working,
    outcome: { results, won, gladiatorsWon: wonCount, gladiatorsTotal: fighters.length, bonusGold, bonusReputation },
  };
}
