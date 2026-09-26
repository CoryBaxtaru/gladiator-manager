import type { CombatLogRound, CombatResult, FightMatchup, Gladiator, GladiatorStats, LudusState, SignatureTechniqueId } from "../types";
import { COMBAT, MOOD, STAFF, CLASH_LABELS, FIGHT_ECONOMY, PERSONALITY_TRAIT_UNLOCK, ALL_PERSONALITY_TRAITS, BRONZE_CROWN, DEATH_ON_DEFEAT, SPONSOR_SURVIVAL, INJURY_MISS_CHANCE, STRENGTH_STAKES, SIGNATURE_TECHNIQUES } from "../config";
import { randFloat, pickN } from "./rng";
import { addMoodModifier } from "./mood";
import { bestDoctor } from "./staff";
import { effectiveStats, averageStats, currentAbilityOf } from "./rating";
import { statSpreadMultiplier } from "./training";

/**
 * Phase 13 Part C: a gladiator with a light injury (bruised) can still be sent to
 * fight -- a real but small penalty (situationalBonus's flat condition deduction, plus
 * INJURY_MISS_CHANCE below), not full unavailability, matching what the condition's
 * own tooltip already promised ("a small penalty in the arena, heals fast"). Only the
 * more severe injury states sit him out entirely.
 *
 * Deliberately keyed on `condition`, not `injuryDaysRemaining`: those two used to
 * always agree in practice (bruised always carried injuryDaysRemaining > 0), which is
 * exactly why every screen gating on `injuryDaysRemaining === 0` silently excluded
 * every non-healthy gladiator regardless of how minor the injury actually was --
 * making both this file's condition penalty and its injury miss chance unreachable in
 * any real fight. `injuryDaysRemaining` still ticks down and still governs when a
 * doctor visit helps and when condition fully clears; it just isn't the fight-
 * eligibility gate anymore.
 */
export function canFight(gladiator: Gladiator): boolean {
  if (gladiator.status !== "active") return false;
  return gladiator.condition !== "injured" && gladiator.condition !== "gravely_injured";
}

// Phase 15 Part 3: strength and defence are deliberately NOT clash keys -- strength has
// no clash of its own (it's a stakes stat, see STRENGTH_STAKES below) and defence is a
// passive per-clash modifier applied to the OPPONENT's value, not a clash a gladiator
// "wins." Attack takes over strength's old clash slot 1:1, same 5-clash, odd-count
// structure as before (odd so a draw is unreachable without the sudden-death path).
type ClashKey = "attack" | "weaponSkill" | "endurance" | "showmanship" | "composite";

const CLASH_SEQUENCE: ClashKey[] = ["attack", "weaponSkill", "endurance", "showmanship", "composite"];

export interface FightOptions {
  /** Death match mode: no injuries, no draws (sudden-death tiebreak instead), the loser dies. */
  lethal?: boolean;
  /** Skip building log text. Used by estimateWinChance, which runs many trials and only needs the outcome. */
  skipLog?: boolean;
}

function compositeStat(stats: GladiatorStats): number {
  return Math.round((stats.weaponSkill * 1.2 + stats.attack + stats.endurance * 0.6) / 2.8);
}

function baseStatFor(key: ClashKey, stats: GladiatorStats): number {
  return key === "composite" ? compositeStat(stats) : stats[key];
}

/** Mood, trait, condition, and building bonuses applied to the player's side only -- the
 * rival side is intentionally not simulated to this depth (see rivalLudi.ts). */
function situationalBonus(g: Gladiator, state: LudusState, currentDay: number, isLosing: boolean, clashKey?: ClashKey): number {
  let total = 0;
  if (g.hotStreakUntilDay && g.hotStreakUntilDay > currentDay) total += MOOD.hotStreakBonus;
  if (g.mood < MOOD.minorBreakMax) total -= 4;
  if (g.condition === "bruised") total -= 2;
  if (g.condition === "injured") total -= 5;
  if (g.condition === "gravely_injured") total -= 9;

  total += state.buildings.armory.level * COMBAT.armoryBonusPerLevel;
  total += state.buildings.arena.level * COMBAT.homeArenaBonusPerLevel;

  if (g.personalityTraits.includes("Bloodthirsty")) total += 2;
  if (g.personalityTraits.includes("Coward") && isLosing) total -= 3;
  if (g.personalityTraits.includes("Prideful") && isLosing) total += 2; // refuses to yield, fights harder

  // Phase 15 Part 2: a signature technique's edge only shows up on the clash it's
  // actually about -- see SIGNATURE_TECHNIQUES's clashBonus.
  if (g.signatureTechnique && clashKey) {
    const technique = SIGNATURE_TECHNIQUES[g.signatureTechnique];
    if (technique.clashBonus.clash === clashKey) total += technique.clashBonus.bonus;
  }

  return total;
}

function withVariance(value: number): number {
  return Math.max(1, value * (1 + randFloat(-COMBAT.clashVariance, COMBAT.clashVariance)));
}

/** Phase 15 Part 3: see COMBAT.defenceMitigationPerPoint's doc comment -- reduces what
 * the opponent effectively rolls against this gladiator, every clash. Player-side only,
 * same asymmetric convention as situationalBonus. */
function defenceMitigation(defence: number): number {
  return Math.min(COMBAT.defenceMitigationMax, defence * COMBAT.defenceMitigationPerPoint);
}

export function resolveFight(
  matchup: FightMatchup,
  gladiator: Gladiator,
  state: LudusState,
  currentDay: number,
  options: FightOptions = {}
): CombatResult {
  const lethal = options.lethal ?? false;
  const skipLog = options.skipLog ?? false;
  const log: CombatLogRound[] = [];
  let playerWins = 0;
  let opponentWins = 0;
  const playerStats = effectiveStats(gladiator);

  // Phase 12 Part G: an injured gladiator carries a chance to flat-out miss a clash --
  // an automatic loss regardless of the stat comparison -- scaling with severity, on
  // top of the existing flat stat penalty in situationalBonus. Rolled per clash (not
  // once for the whole fight) so a lucky fighter can still salvage a clash or two.
  const missChance = INJURY_MISS_CHANCE[gladiator.condition as keyof typeof INJURY_MISS_CHANCE] ?? 0;

  for (let i = 0; i < CLASH_SEQUENCE.length; i++) {
    const key = CLASH_SEQUENCE[i];
    const isLosing = opponentWins > playerWins;
    const playerMisses = missChance > 0 && Math.random() < missChance;
    const playerBase = baseStatFor(key, playerStats) + situationalBonus(gladiator, state, currentDay, isLosing, key);
    const opponentBase = baseStatFor(key, matchup.opponentStats) * (1 - defenceMitigation(playerStats.defence));

    const playerValue = playerMisses ? 0 : withVariance(playerBase);
    const opponentValue = withVariance(opponentBase);

    let winnerText: string;
    if (playerMisses) {
      opponentWins++;
      winnerText = `${gladiator.name} falters from his wounds, ${matchup.opponentName} wins`;
    } else if (playerValue > opponentValue) {
      playerWins++;
      winnerText = `${gladiator.name} wins`;
    } else if (opponentValue > playerValue) {
      opponentWins++;
      winnerText = `${matchup.opponentName} wins`;
    } else {
      winnerText = "an even trade";
    }

    if (!skipLog) {
      log.push({
        round: i + 1,
        text: playerMisses
          ? `${CLASH_LABELS[key]}: ${gladiator.name} falters from his wounds and misses the clash entirely, ${matchup.opponentName} wins.`
          : `${CLASH_LABELS[key]}: ${gladiator.name} ${Math.round(playerValue)} versus ${matchup.opponentName} ${Math.round(opponentValue)}, ${winnerText}.`,
      });
    }
  }

  let outcome: CombatResult["outcome"] = playerWins > opponentWins ? "win" : opponentWins > playerWins ? "loss" : "draw";

  if (lethal && outcome === "draw") {
    // A death match cannot end in a draw. Break the tie with one sudden-death clash
    // on overall prowess; this only fires if clashCount is ever changed to an even
    // number, since the default 5 clashes can never tie on its own.
    const playerValue = withVariance(compositeStat(gladiator.stats) + situationalBonus(gladiator, state, currentDay, false, "composite"));
    const opponentValue = withVariance(compositeStat(matchup.opponentStats));
    outcome = playerValue >= opponentValue ? "win" : "loss";
    if (!skipLog) {
      log.push({
        round: log.length + 1,
        text: `Sudden death: ${gladiator.name} ${Math.round(playerValue)} versus ${matchup.opponentName} ${Math.round(opponentValue)}, ${outcome === "win" ? gladiator.name : matchup.opponentName} prevails.`,
      });
    }
  }

  const margin = Math.abs(playerWins - opponentWins);
  const marginFactor = margin / CLASH_SEQUENCE.length;

  const tierMultiplier = FIGHT_ECONOMY.tierMultiplier[matchup.tier];
  const basePurse = FIGHT_ECONOMY.basePurseLocal * tierMultiplier;
  const performanceMultiplier = COMBAT.winRewardBaseMultiplier + COMBAT.winRewardPerMarginMultiplier * marginFactor;

  const isPridefulForReward = gladiator.personalityTraits.includes("Prideful");

  let goldReward: number;
  let reputationReward: number;
  // Phase 11 Part B: reputation reward/penalty is intentionally NOT multiplied by
  // tierMultiplier -- that multiplier was built for gold-facing numbers (see
  // FIGHT_ECONOMY's own doc comment) and reputation already scales with tier
  // organically through opponentPowerLevel (rival rosters get stronger at higher
  // tiers). Applying tierMultiplier on top double-counted tier difficulty and, on
  // losses specifically, produced -24 to -35 rep at Rival tier for the same margin
  // of defeat that cost -6 to -8 at Local -- far more than "scaled by how decisive
  // it was" (margin, the intended lever) was ever meant to produce.
  if (outcome === "win") {
    goldReward = Math.round(basePurse * performanceMultiplier);
    reputationReward = Math.round((4 + matchup.opponentPowerLevel * 0.1) * performanceMultiplier);
    if (isPridefulForReward) {
      reputationReward = Math.round(reputationReward * COMBAT.pridefulWinReputationMultiplier);
    }
    // Phase 15 Part 3: strength's win-side job -- a decisive win backed by real power
    // pays out bigger ("that was a brutal, memorable win"), scaled by margin so a
    // narrow win barely notices it. See STRENGTH_STAKES's doc comment.
    const strengthRewardBonus = 1 + playerStats.strength * STRENGTH_STAKES.ownRewardBonusPerPoint * marginFactor;
    goldReward = Math.round(goldReward * strengthRewardBonus);
    reputationReward = Math.round(reputationReward * strengthRewardBonus);
  } else if (outcome === "draw") {
    goldReward = Math.round(basePurse * FIGHT_ECONOMY.drawFraction);
    reputationReward = 2;
  } else {
    goldReward = Math.round(basePurse * FIGHT_ECONOMY.lossFraction);
    // A loss now costs real reputation instead of a small consolation gain, scaled by
    // how decisive it was (a narrow loss barely stings, a clean sweep hurts). The gold
    // consolation above is unaffected -- a bad stretch should be felt in both numbers.
    const lossPenaltyMultiplier = COMBAT.lossRepPenaltyBaseMultiplier + COMBAT.lossRepPenaltyPerMarginMultiplier * marginFactor;
    reputationReward = -Math.round((3 + matchup.opponentPowerLevel * 0.08) * lossPenaltyMultiplier);
  }

  let injury: CombatResult["injury"] = null;
  let died = false;
  const isPrideful = gladiator.personalityTraits.includes("Prideful");
  const isCoward = gladiator.personalityTraits.includes("Coward");
  const doctor = bestDoctor(state);

  if (lethal) {
    if (outcome === "loss") died = true;
  } else if (outcome !== "win") {
    let injuryChance = COMBAT.baseInjuryChanceOnLoss - state.buildings.infirmary.level * 0.03;
    if (doctor) injuryChance -= doctor.trueSkill * STAFF.doctorInjuryChanceReductionPerSkillPoint;
    if (outcome === "draw") injuryChance *= COMBAT.drawInjuryChanceMultiplier;
    if (outcome === "loss") injuryChance += marginFactor * COMBAT.narrowLossInjuryMarginBonus;
    if (isPrideful) injuryChance += 0.15;
    if (isCoward) injuryChance -= 0.15;
    injuryChance = Math.max(0.03, Math.min(0.85, injuryChance));

    if (Math.random() < injuryChance) {
      // Phase 15 Part 3: strength's loss-side job -- a powerful opponent leaves worse
      // wounds. See STRENGTH_STAKES's doc comment.
      const severityRoll = Math.random() + marginFactor * 0.25 + matchup.opponentStats.strength * STRENGTH_STAKES.opponentSeverityPerPoint;
      if (severityRoll < 0.5) injury = "bruised";
      else if (severityRoll < 0.85) injury = "injured";
      else injury = "gravely_injured";
    }

    // Phase 12 Part A: death is now a single, direct roll on any real LOSS (a draw
    // never carries death risk), not gated behind injury-happens AND severity-rolls-
    // grave first -- see DEATH_ON_DEFEAT's doc comment for why the old chained version
    // diluted to under 1% in practice. A real baseline around 20%, additive modifiers
    // shift it but can't chain it away.
    if (outcome === "loss") {
      let deathChance = DEATH_ON_DEFEAT.baseChance + marginFactor * DEATH_ON_DEFEAT.marginBonus;
      deathChance -= state.buildings.infirmary.level * DEATH_ON_DEFEAT.infirmaryReductionPerLevel;
      if (doctor) deathChance -= doctor.trueSkill * DEATH_ON_DEFEAT.doctorSkillReduction;
      if (isPrideful) deathChance += DEATH_ON_DEFEAT.pridefulBonus;
      if (isCoward) deathChance -= DEATH_ON_DEFEAT.cowardReduction;
      deathChance += matchup.opponentStats.strength * STRENGTH_STAKES.opponentDeathChancePerPoint;
      deathChance = Math.max(DEATH_ON_DEFEAT.minChance, Math.min(DEATH_ON_DEFEAT.maxChance, deathChance));
      if (Math.random() < deathChance) {
        died = true;
        injury = "gravely_injured"; // a fatal defeat is always at least this severe
      }
    }
  }

  const isVain = gladiator.personalityTraits.includes("Vain");
  const isBloodthirsty = gladiator.personalityTraits.includes("Bloodthirsty");
  let showmanshipGain = 0;
  if (outcome === "win") {
    showmanshipGain = Math.round(
      COMBAT.winShowmanshipBase + COMBAT.winShowmanshipPerMargin * marginFactor + (isPrideful ? 0.5 : 0) + (isVain ? 1 : 0) + (isBloodthirsty ? 0.5 : 0)
    );
  }

  return {
    fightId: matchup.id,
    gladiatorId: gladiator.id,
    gladiatorName: gladiator.name,
    opponentName: matchup.opponentName,
    rivalLudusName: matchup.rivalLudusName,
    tier: matchup.tier,
    outcome,
    margin,
    log,
    goldReward,
    reputationReward,
    injury,
    died,
    showmanshipGain,
    isDeathMatch: lethal,
  };
}

/**
 * `isLastActiveGladiator` floors the same soft-lock failure path as resolveBreak: the
 * roster's last gladiator can still come out of a fight gravely injured, but a normal
 * (non-death-match) fight can never kill him and zero the roster. Death matches are
 * exempt on purpose -- they're an explicit, well-warned player choice ("This is final
 * if you commit. The loser dies."), not the kind of ordinary bad luck this floor is for.
 */
export function applyCombatResultToGladiator(gladiator: Gladiator, result: CombatResult, currentDay: number, isLastActiveGladiator = false): Gladiator {
  const marginFactor = result.margin / CLASH_SEQUENCE.length;
  // Combat-driven showmanship gains must respect Potential Ability the same way
  // trainStat's roomToGrow check does (see training.ts) -- otherwise a gladiator who
  // keeps winning fights could climb past his PA even though training alone can't.
  // Backed off point by point (gains are small) so the exact averageStats rounding
  // behavior in currentAbilityOf is honored rather than approximated.
  // Phase 12 Part I: a stat pulled far ahead of the gladiator's other three trains
  // more slowly, combat-driven gains included -- see statSpreadMultiplier (training.ts).
  const spreadAdjustedGain = Math.round(result.showmanshipGain * statSpreadMultiplier(gladiator, "showmanship"));
  let cappedShowmanship = Math.min(99, gladiator.stats.showmanship + spreadAdjustedGain);
  while (
    cappedShowmanship > gladiator.stats.showmanship &&
    averageStats(effectiveStats({ ...gladiator, stats: { ...gladiator.stats, showmanship: cappedShowmanship } })) > gladiator.potentialAbility
  ) {
    cappedShowmanship -= 1;
  }
  let updated: Gladiator = {
    ...gladiator,
    record: {
      fights: gladiator.record.fights + 1,
      wins: gladiator.record.wins + (result.outcome === "win" ? 1 : 0),
      losses: gladiator.record.losses + (result.outcome === "loss" ? 1 : 0),
      nearDeaths: gladiator.record.nearDeaths + (result.injury === "gravely_injured" ? 1 : 0),
    },
    stats: {
      ...gladiator.stats,
      showmanship: cappedShowmanship,
    },
  };

  // Personality is earned (Phase 8 Part E): the moment career wins cross the
  // milestone, the first trait slot unlocks and is filled immediately, the same
  // "real, visible milestone" moment a player watching a young gladiator's record
  // would expect to pay off right away rather than on some later unrelated day.
  if (
    updated.personalityTraits.length === 0 &&
    updated.age > PERSONALITY_TRAIT_UNLOCK.youngAgeMax &&
    updated.record.wins >= PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone
  ) {
    updated = { ...updated, personalityTraits: pickN(ALL_PERSONALITY_TRAITS, 1) };
  }

  // Phase 15 Part 2: checked the same moment as the personality-trait unlock above --
  // see SIGNATURE_TECHNIQUES's doc comment for why it needs weapon type AND stat
  // threshold AND trait all at once, so it reads as earned rather than coincidental.
  // Permanent once earned; the caller (tick.ts et al.) diffs signatureTechnique
  // before/after this call to announce it, the same pattern already used for CA jumps.
  if (!updated.signatureTechnique) {
    const eff = effectiveStats(updated);
    const earnedId = (Object.keys(SIGNATURE_TECHNIQUES) as SignatureTechniqueId[]).find((id) => {
      const technique = SIGNATURE_TECHNIQUES[id];
      return (
        updated.weaponType === technique.weaponType &&
        updated.personalityTraits.includes(technique.trait) &&
        eff[technique.statKey] >= technique.minStatValue
      );
    });
    if (earnedId) {
      updated = { ...updated, signatureTechnique: earnedId };
    }
  }

  if (result.died) {
    if (result.isDeathMatch) {
      return { ...updated, status: "dead", condition: "gravely_injured", statusChangedOnDay: currentDay };
    }
    if (isLastActiveGladiator) {
      return { ...updated, condition: "gravely_injured", injuryDaysRemaining: 10 };
    }
    // Phase 12 Part A: an ordinary fatal defeat is no longer resolved silently -- hold
    // him here, gravely wounded but still nominally active, until the player chooses
    // to sponsor his survival (see sponsorSurvivalCost/resolveFateDecision below) or
    // let him die. The App shell surfaces this as a blocking choice ahead of the day's
    // summary.
    return { ...updated, condition: "gravely_injured", injuryDaysRemaining: 10, awaitingFateDecision: true };
  }

  if (result.injury) {
    const daysOut = result.injury === "bruised" ? 2 : result.injury === "injured" ? 5 : 10;
    updated = { ...updated, condition: result.injury, injuryDaysRemaining: daysOut };
  }

  if (result.outcome === "win") {
    const moodDelta = Math.round(COMBAT.winMoodBase + COMBAT.winMoodPerMargin * marginFactor);
    updated = addMoodModifier(updated, `Decisive win against ${result.opponentName}`, moodDelta, currentDay, 5);
  } else if (result.outcome === "loss") {
    const moodDelta = -Math.round(COMBAT.lossMoodBase + COMBAT.lossMoodPerMargin * marginFactor);
    updated = addMoodModifier(updated, `Loss to ${result.opponentName}`, moodDelta, currentDay, 5);
  }

  if (updated.personalityTraits.includes("Bloodthirsty") && result.outcome === "win") {
    updated = addMoodModifier(updated, "Bloodthirsty thrill of victory", 6, currentDay, 4);
  }
  if (updated.personalityTraits.includes("Vain") && result.outcome === "win") {
    updated = addMoodModifier(updated, "Crowd adored the spectacle", 5, currentDay, 4);
  }
  if (updated.personalityTraits.includes("Prideful") && result.outcome === "loss") {
    updated = addMoodModifier(updated, "Prideful sting of defeat", -8, currentDay, 5);
  }
  if (updated.personalityTraits.includes("Prideful") && result.outcome === "win") {
    updated = addMoodModifier(updated, "Prideful glory of victory", COMBAT.pridefulWinMoodBonus, currentDay, 5);
  }

  return updated;
}

/**
 * Phase 9 Part B: a clean sweep (every clash won) or a win pulled off as a Heavy
 * Underdog (see WinChanceBadge's classify(), same 0.25 cutoff as BRONZE_CROWN's
 * underdogWinRateMax) is a "particularly notable win" -- earns an automatic bronze
 * crown (mood + reputation) on top of the normal win rewards. preFightWinRate is the
 * estimateWinChance() reading taken for that matchup before it was actually resolved.
 */
export function checkBronzeCrown(result: CombatResult, preFightWinRate: number | null): boolean {
  if (result.outcome !== "win") return false;
  const cleanSweep = result.margin === CLASH_SEQUENCE.length;
  const underdogUpset = preFightWinRate !== null && preFightWinRate < BRONZE_CROWN.underdogWinRateMax;
  return cleanSweep || underdogUpset;
}

export interface WinChanceEstimate {
  winRate: number;
  drawRate: number;
  lossRate: number;
}

/**
 * Estimates a matchup's odds by running the real clash-resolution logic many times
 * and tallying outcomes, rather than a separate hand-written formula. Cheap: skipLog
 * avoids building round text for trials that only need the outcome.
 */
export function estimateWinChance(
  gladiator: Gladiator,
  matchup: FightMatchup,
  state: LudusState,
  currentDay: number,
  trials = 150
): WinChanceEstimate {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (let i = 0; i < trials; i++) {
    const result = resolveFight(matchup, gladiator, state, currentDay, { skipLog: true });
    if (result.outcome === "win") wins++;
    else if (result.outcome === "draw") draws++;
    else losses++;
  }
  return { winRate: wins / trials, drawRate: draws / trials, lossRate: losses / trials };
}

/**
 * Phase 13 Part A: the gold cost to sponsor a gladiator's survival when an ordinary
 * defeat would otherwise kill him. Scaled off his own Current Ability alone (capped by
 * PA, same as everywhere else) -- no separate tier multiplier, since CA already climbs
 * with tier as a roster develops; multiplying by tier again double-counted the same
 * signal and made the cost unaffordable in practice (see SPONSOR_SURVIVAL's doc
 * comment in config.ts for the diagnostic). `state` is no longer needed here but kept
 * in the signature so callers don't need to change.
 */
export function sponsorSurvivalCost(gladiator: Gladiator, _state: LudusState): number {
  return Math.round(currentAbilityOf(gladiator) * SPONSOR_SURVIVAL.costPerCA);
}

/**
 * Resolves the player's sponsor-or-let-die choice for a gladiator held in limbo by
 * awaitingFateDecision. Sponsoring deducts the cost and clears the flag (he stays
 * gravely_injured, already set when the fight result was applied); declining (or not
 * being able to afford it) finalizes him as dead.
 */
export function resolveFateDecision(state: LudusState, gladiatorId: string, sponsor: boolean): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator || !gladiator.awaitingFateDecision) return state;

  if (sponsor) {
    const cost = sponsorSurvivalCost(gladiator, state);
    if (state.gold < cost) return state;
    return {
      ...state,
      gold: state.gold - cost,
      gladiators: state.gladiators.map((g) => (g.id === gladiatorId ? { ...g, awaitingFateDecision: false } : g)),
    };
  }

  return {
    ...state,
    gladiators: state.gladiators.map((g) =>
      g.id === gladiatorId
        ? { ...g, status: "dead" as const, awaitingFateDecision: false, statusChangedOnDay: state.currentDay }
        : g
    ),
  };
}
