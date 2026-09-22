import type { LudusState, SummaryEntry } from "../types";
import { DEBT } from "../config";
import { addMoodModifier } from "./mood";
import { instantSalePrice } from "./sale";
import { pick, chance } from "./rng";
import { currentAbilityOf } from "./rating";

export interface DebtTickResult {
  state: LudusState;
  entries: SummaryEntry[];
}

function applySevereConsequence(state: LudusState): { state: LudusState; entries: SummaryEntry[] } {
  const entries: SummaryEntry[] = [];
  const canQuit = state.staff.length > 0;
  const activeGladiators = state.gladiators.filter((g) => g.status === "active");
  // Never seize the last gladiator in the roster -- part of the same soft-lock floor
  // as the mood-break escape/death fixes: creditors can still take a staff member, or
  // any gladiator while there's more than one, but never the last one, since that
  // would zero the roster with no way back.
  const canSeize = activeGladiators.length > 1;

  if (!canQuit && !canSeize) {
    entries.push({
      category: "upkeep",
      text: "Creditors came looking for something to take, but with only one gladiator left and no staff to let go, there's nothing left to seize.",
    });
    return { state, entries };
  }

  const doQuit = canQuit && (!canSeize || chance(0.5));

  if (doQuit) {
    const leaving = pick(state.staff);
    entries.push({
      category: "staff",
      text: `The debt was the last straw. ${leaving.name} quit rather than keep working without reliable pay.`,
    });
    return { state: { ...state, staff: state.staff.filter((s) => s.id !== leaving.id) }, entries };
  }

  const weakest = [...activeGladiators].sort((a, b) => currentAbilityOf(a) - currentAbilityOf(b))[0];
  const price = instantSalePrice(currentAbilityOf(weakest));
  entries.push({
    category: "upkeep",
    text: `Creditors seized ${weakest.name} to cover the debt, sold for ${price}g.`,
  });
  return {
    state: {
      ...state,
      gold: state.gold + price,
      gladiators: state.gladiators.map((g) => (g.id === weakest.id ? { ...g, status: "sold" as const } : g)),
    },
    entries,
  };
}

/**
 * Called once per week, right after upkeep is deducted. No hard floor at zero gold:
 * a negative balance is allowed, and staying there escalates rather than being either
 * an impossible wall or an invisible non-issue. First week: a warning and a small
 * ludus-wide mood penalty. From week two: interest makes the balance worse each week
 * it's unresolved. From week four (and periodically after, if still unresolved): a
 * real consequence, a staff member quits or a gladiator is seized to cover the debt.
 */
export function tickWeeklyDebt(state: LudusState, currentDay: number): DebtTickResult {
  const entries: SummaryEntry[] = [];

  if (state.gold >= 0) {
    if (state.debtWeeksActive > 0) {
      entries.push({ category: "upkeep", text: "The ludus has climbed back out of debt." });
    }
    return { state: { ...state, debtWeeksActive: 0 }, entries };
  }

  const weeksActive = state.debtWeeksActive + 1;
  let working: LudusState = { ...state, debtWeeksActive: weeksActive };

  if (weeksActive === DEBT.moodPenaltyFromWeek) {
    entries.push({
      category: "upkeep",
      text: `The ludus is in debt at ${working.gold}g. Money troubles have everyone on edge.`,
    });
    working = {
      ...working,
      gladiators: working.gladiators.map((g) =>
        g.status === "active" ? addMoodModifier(g, "Money troubles in the ludus", DEBT.moodPenalty, currentDay, 7) : g
      ),
    };
  }

  if (weeksActive >= DEBT.interestFromWeek) {
    const interest = Math.round(Math.abs(working.gold) * DEBT.weeklyInterestRate);
    working = { ...working, gold: working.gold - interest };
    entries.push({
      category: "upkeep",
      text: `Debt of ${weeksActive} week(s) running is accruing interest: -${interest}g.`,
    });
  }

  const crossedSevere =
    weeksActive === DEBT.severeConsequenceFromWeek ||
    (weeksActive > DEBT.severeConsequenceFromWeek &&
      (weeksActive - DEBT.severeConsequenceFromWeek) % DEBT.severeConsequenceRepeatEveryWeeks === 0);

  if (crossedSevere) {
    const result = applySevereConsequence(working);
    working = result.state;
    entries.push(...result.entries);
  }

  return { state: working, entries };
}
