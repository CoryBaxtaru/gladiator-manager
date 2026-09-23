import type { CombatLogRound, CombatResult, FightMatchup, Gladiator, GladiatorStats, LudusState, StatKey } from "../types";
import { COMBAT, MOOD, STAFF, CLASH_LABELS, FIGHT_ECONOMY, PERSONALITY_TRAIT_UNLOCK, ALL_PERSONALITY_TRAITS, BRONZE_CROWN } from "../config";
import { randFloat, pickN } from "./rng";
import { addMoodModifier } from "./mood";
import { bestDoctor } from "./staff";
import { effectiveStats } from "./rating";

type ClashKey = StatKey | "composite";

const CLASH_SEQUENCE: ClashKey[] = ["strength", "weaponSkill", "endurance", "showmanship", "composite"];

export interface FightOptions {
  /** Death match mode: no injuries, no draws (sudden-death tiebreak instead), the loser dies. */
  lethal?: boolean;
  /** Skip building log text. Used by estimateWinChance, which runs many trials and only needs the outcome. */
  skipLog?: boolean;
}

function compositeStat(stats: GladiatorStats): number {
  return Math.round((stats.weaponSkill * 1.2 + stats.strength + stats.endurance * 0.6) / 2.8);
}

function baseStatFor(key: ClashKey, stats: GladiatorStats): number {
  return key === "composite" ? compositeStat(stats) : stats[key];
}

/** Mood, trait, condition, and building bonuses applied to the player's side only -- the
 * rival side is intentionally not simulated to this depth (see rivalLudi.ts). */
function situationalBonus(g: Gladiator, state: LudusState, currentDay: number, isLosing: boolean): number {
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

  return total;
}

function withVariance(value: number): number {
  return Math.max(1, value * (1 + randFloat(-COMBAT.clashVariance, COMBAT.clashVariance)));
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

  for (let i = 0; i < CLASH_SEQUENCE.length; i++) {
    const key = CLASH_SEQUENCE[i];
    const isLosing = opponentWins > playerWins;
    const playerBase = baseStatFor(key, playerStats) + situationalBonus(gladiator, state, currentDay, isLosing);
    const opponentBase = baseStatFor(key, matchup.opponentStats);

    const playerValue = withVariance(playerBase);
    const opponentValue = withVariance(opponentBase);

    let winnerText: string;
    if (playerValue > opponentValue) {
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
        text: `${CLASH_LABELS[key]}: ${gladiator.name} ${Math.round(playerValue)} versus ${matchup.opponentName} ${Math.round(opponentValue)}, ${winnerText}.`,
      });
    }
  }

  let outcome: CombatResult["outcome"] = playerWins > opponentWins ? "win" : opponentWins > playerWins ? "loss" : "draw";

  if (lethal && outcome === "draw") {
    // A death match cannot end in a draw. Break the tie with one sudden-death clash
    // on overall prowess; this only fires if clashCount is ever changed to an even
    // number, since the default 5 clashes can never tie on its own.
    const playerValue = withVariance(compositeStat(gladiator.stats) + situationalBonus(gladiator, state, currentDay, false));
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
  if (outcome === "win") {
    goldReward = Math.round(basePurse * performanceMultiplier);
    reputationReward = Math.round((4 + matchup.opponentPowerLevel * 0.1) * tierMultiplier * performanceMultiplier);
    if (isPridefulForReward) {
      reputationReward = Math.round(reputationReward * COMBAT.pridefulWinReputationMultiplier);
    }
  } else if (outcome === "draw") {
    goldReward = Math.round(basePurse * FIGHT_ECONOMY.drawFraction);
    reputationReward = Math.round(2 * tierMultiplier);
  } else {
    goldReward = Math.round(basePurse * FIGHT_ECONOMY.lossFraction);
    // A loss now costs real reputation instead of a small consolation gain, scaled by
    // how decisive it was (a narrow loss barely stings, a clean sweep hurts). The gold
    // consolation above is unaffected -- a bad stretch should be felt in both numbers.
    const lossPenaltyMultiplier = COMBAT.lossRepPenaltyBaseMultiplier + COMBAT.lossRepPenaltyPerMarginMultiplier * marginFactor;
    reputationReward = -Math.round((3 + matchup.opponentPowerLevel * 0.08) * tierMultiplier * lossPenaltyMultiplier);
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
      const severityRoll = Math.random() + marginFactor * 0.25;
      if (severityRoll < 0.5) injury = "bruised";
      else if (severityRoll < 0.85) injury = "injured";
      else injury = "gravely_injured";

      if (injury === "gravely_injured") {
        let deathChance = COMBAT.baseDeathChanceOnGraveInjury - state.buildings.infirmary.level * 0.015;
        if (doctor) deathChance -= doctor.trueSkill * 0.001;
        deathChance = Math.max(0.02, deathChance);
        if (Math.random() < deathChance) died = true;
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
      showmanship: Math.min(99, gladiator.stats.showmanship + result.showmanshipGain),
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

  if (result.died) {
    if (!result.isDeathMatch && isLastActiveGladiator) {
      return { ...updated, condition: "gravely_injured", injuryDaysRemaining: 10 };
    }
    return { ...updated, status: "dead", condition: "gravely_injured", statusChangedOnDay: currentDay };
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
