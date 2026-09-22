import type { CombatResult, DaySummary, FightMatchup, Gladiator, LudusState, SummaryEntry } from "../types";
import { tickBuildQueue, computeImbalance } from "./buildings";
import { recomputeMood, resolveBreak, addMoodModifier } from "./mood";
import { applyDailyTraining, maybeRevealPotential, tickInjuryRecovery, tickAgeAndDecline } from "./training";
import { applySparringTraining } from "./sparring";
import { resolveFight, applyCombatResultToGladiator } from "./combat";
import { weeklyGladiatorUpkeep, weeklyBuildingUpkeep, weeklyLudusOverhead } from "./economy";
import { tickRecruiterTrip } from "./scouting";
import { maybeRefreshStaffPool, weeklyStaffSalaries, bestDoctor } from "./staff";
import { maybeRivalInitiatesChallenge } from "./deathMatch";
import { tickWeeklyDebt } from "./debt";
import { tickWeeklyLoan, applyPurseCut } from "./loan";
import { reputationCapFor } from "./promotion";
import { currentAbilityOf } from "./rating";

const MAX_HISTORY_ENTRIES = 60;

export function advanceDay(
  state: LudusState,
  fightMatchups: FightMatchup[] = []
): { state: LudusState; summary: DaySummary } {
  const entries: SummaryEntry[] = [];
  const combatResults: CombatResult[] = [];
  const nextDay = state.currentDay + 1;
  let working: LudusState = { ...state, currentDay: nextDay };

  // 1. Building queue progress
  const buildTick = tickBuildQueue(working);
  working = buildTick.state;
  for (const msg of buildTick.completions) entries.push({ category: "building", text: msg });

  // 2. Resolve this day's fight day matchups, if any
  let gladiators = [...working.gladiators];
  let goldFromFights = 0;
  let reputationFromFights = 0;

  for (const matchup of fightMatchups) {
    const idx = gladiators.findIndex((g) => g.id === matchup.gladiatorId);
    if (idx === -1) continue;
    const gladiator = gladiators[idx];
    if (gladiator.status !== "active") continue;

    const isLastActiveGladiator = gladiators.filter((g) => g.status === "active").length === 1;
    const result = resolveFight(matchup, gladiator, working, nextDay);
    combatResults.push(result);
    goldFromFights += result.goldReward;
    reputationFromFights += result.reputationReward;
    gladiators[idx] = applyCombatResultToGladiator(gladiator, result, nextDay, isLastActiveGladiator);
    // Fight results are shown as their own result cards (see FightResultCard /
    // SummaryModal), not duplicated here as a text entry.
  }
  // A purse-cut sponsorship (see engine/loan.ts) skims its redirect fraction off
  // fight winnings before they ever reach the player's pocket.
  const purseCut = applyPurseCut(working, goldFromFights);
  if (purseCut.entry) entries.push(purseCut.entry);

  working = {
    ...working,
    gladiators,
    gold: working.gold + purseCut.netGold,
    loanPrincipal: purseCut.loanPrincipal,
    // Reputation from a loss can be negative now, but the ludus's total never goes
    // below 0 -- a bad stretch costs standing, it doesn't manufacture debt on its own.
    // Gains are capped at the current tier's ceiling: ordinary fights can defend or
    // lose ground, but climbing past it requires actually winning a Promotion Fight.
    reputation: Math.min(reputationCapFor(working), Math.max(0, working.reputation + reputationFromFights)),
  };

  // 3. Imbalance penalty (applied as a mood modifier source to all active gladiators)
  const imbalance = computeImbalance(working);
  for (const text of imbalance.flavorText) entries.push({ category: "mood", text });

  // 4. Per-gladiator daily processing: injury recovery, training (solo or paired
  // sparring), mood recompute, breaks, PA reveal
  const gateLevel = working.buildings.gate.level;
  const doctor = bestDoctor(working);

  const byId = new Map(working.gladiators.map((g) => [g.id, g]));
  const processed = new Map<string, Gladiator>();

  /** How many gladiators are still active considering today's results so far: earlier
   * gladiators already processed this loop (escapes, deaths, sales) plus anyone not
   * yet reached still carrying their pre-day status. Drives the soft-lock floor in
   * resolveBreak, so it stays accurate even as gladiators are processed one by one. */
  function activeCountSoFar(currentId: string, currentStatus: Gladiator["status"]): number {
    let count = 0;
    for (const g of working.gladiators) {
      const effectiveStatus = g.id === currentId ? currentStatus : processed.get(g.id)?.status ?? g.status;
      if (effectiveStatus === "active") count++;
    }
    return count;
  }

  function finishDailyGladiator(g: Gladiator): Gladiator {
    let updated = g;
    if (imbalance.moodDelta !== 0) {
      updated = addMoodModifier(updated, "Building imbalance", imbalance.moodDelta, nextDay, 1);
    }
    const moodResult = recomputeMood(updated, nextDay);
    updated = moodResult.gladiator;
    entries.push(...moodResult.entries);

    const isLastActiveGladiator = updated.status === "active" && activeCountSoFar(updated.id, updated.status) === 1;
    const breakOutcome = resolveBreak(updated, gateLevel, nextDay, isLastActiveGladiator);
    updated = breakOutcome.gladiator;
    entries.push(...breakOutcome.entries);

    return maybeRevealPotential(updated, nextDay);
  }

  for (const original of working.gladiators) {
    if (processed.has(original.id)) continue;
    if (original.status !== "active") {
      processed.set(original.id, original);
      continue;
    }

    const recovered = tickInjuryRecovery(original, doctor?.trueSkill ?? 0, working.buildings.infirmary.level);
    const partner = recovered.sparringPartnerId ? byId.get(recovered.sparringPartnerId) : undefined;
    const partnerIsMutual = partner && partner.status === "active" && partner.sparringPartnerId === recovered.id;

    if (partnerIsMutual && !processed.has(partner.id)) {
      const recoveredPartner = tickInjuryRecovery(partner, doctor?.trueSkill ?? 0, working.buildings.infirmary.level);
      const beforeA = currentAbilityOf(recovered);
      const beforeB = currentAbilityOf(recoveredPartner);
      const sparResult = applySparringTraining(recovered, recoveredPartner, working, nextDay);
      entries.push(...sparResult.entries);
      const afterA = currentAbilityOf(sparResult.a);
      const afterB = currentAbilityOf(sparResult.b);
      if (afterA > beforeA) {
        entries.push({
          category: "training",
          text: `${sparResult.a.name} sparred hard and picked up something new (${beforeA} to ${afterA} current ability).`,
        });
      }
      if (afterB > beforeB) {
        entries.push({
          category: "training",
          text: `${sparResult.b.name} sparred hard and picked up something new (${beforeB} to ${afterB} current ability).`,
        });
      }
      processed.set(recovered.id, finishDailyGladiator(sparResult.a));
      processed.set(recoveredPartner.id, finishDailyGladiator(sparResult.b));
      continue;
    }

    const beforeCA = currentAbilityOf(recovered);
    const trained = applyDailyTraining(recovered, working);
    const afterCA = currentAbilityOf(trained);
    if (afterCA > beforeCA) {
      entries.push({
        category: "training",
        text: `${trained.name} picked up something new in training (${beforeCA} to ${afterCA} current ability).`,
      });
    }
    processed.set(original.id, finishDailyGladiator(trained));
  }

  gladiators = working.gladiators.map((g) => processed.get(g.id) ?? g);
  working = { ...working, gladiators };

  // 5. Weekly upkeep and age-related decline (every 7 days)
  if (nextDay % 7 === 0) {
    const gladUpkeep = weeklyGladiatorUpkeep(working);
    const bldUpkeep = weeklyBuildingUpkeep(working);
    const overhead = weeklyLudusOverhead(working);
    const staffSalaries = weeklyStaffSalaries(working);
    const total = gladUpkeep + bldUpkeep + overhead + staffSalaries;
    working = { ...working, gold: working.gold - total };
    entries.push({
      category: "upkeep",
      text: `Weekly upkeep paid: ${gladUpkeep}g gladiators, ${bldUpkeep}g buildings, ${staffSalaries}g staff, ${overhead}g overhead, ${total}g total.`,
    });

    const declined = working.gladiators.map((g) => (g.status === "active" ? tickAgeAndDecline(g, nextDay) : g));
    working = { ...working, gladiators: declined };

    const debtResult = tickWeeklyDebt(working, nextDay);
    working = debtResult.state;
    entries.push(...debtResult.entries);

    const loanResult = tickWeeklyLoan(working, nextDay);
    working = loanResult.state;
    entries.push(...loanResult.entries);
  }

  // 6. Staff pool refresh and recruiter trip resolution
  working = maybeRefreshStaffPool(working);
  const tripResult = tickRecruiterTrip(working);
  working = tripResult.state;
  if (tripResult.returned) {
    entries.push({
      category: "recruitment",
      text: `Your recruiter returned with ${working.recruitPool.length} candidate(s) to review.`,
    });
  }

  // 7. A higher-reputation rival may occasionally issue a death match challenge
  working = maybeRivalInitiatesChallenge(working);

  const summary: DaySummary = { day: nextDay, entries, combatResults };
  const history = [...working.history, summary].slice(-MAX_HISTORY_ENTRIES);
  working = { ...working, lastSummary: summary, history };

  return { state: working, summary };
}
