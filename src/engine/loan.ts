import type { LudusState, SponsorshipCollateral, SummaryEntry } from "../types";
import { LOAN } from "../config";

/** Only one sponsorship can be outstanding at a time: it must be fully repaid before
 * another can be arranged. That's what makes this "limited use" rather than a
 * repeatable tap. */
export function canTakeLoan(state: LudusState): boolean {
  return state.loanPrincipal <= 0;
}

/** Sized by reputation: a ludus with more standing can attract a bigger sponsor. */
export function loanAmount(state: LudusState): number {
  return Math.round(LOAN.baseAmount + state.reputation * LOAN.amountPerReputation);
}

/** Arranges the sponsorship: gold in hand now, a real principal owed that starts
 * accruing interest and garnishing future income until it's repaid, against whatever
 * collateral the player put up. Not free money. */
export function takeLoan(state: LudusState, collateral: SponsorshipCollateral): LudusState {
  if (!canTakeLoan(state)) return state;
  const amount = loanAmount(state);
  return {
    ...state,
    gold: state.gold + amount,
    loanPrincipal: amount,
    loanTakenOnDay: state.currentDay,
    loanCollateral: collateral,
    loanPurseCutFraction: 0,
  };
}

export interface LoanTickResult {
  state: LudusState;
  entries: SummaryEntry[];
}

function applyCollateralConsequence(state: LudusState): { state: LudusState; entries: SummaryEntry[] } {
  const collateral = state.loanCollateral;
  if (!collateral) return { state, entries: [] };

  if (collateral.type === "building") {
    const building = state.buildings[collateral.buildingId];
    if (building.level <= 1) {
      return {
        state,
        entries: [
          {
            category: "upkeep",
            text: `The sponsor's patience is wearing thin, but the ${building.material} ${collateral.buildingId.replace("_", " ")} is already at its minimum and can't be stripped any further.`,
          },
        ],
      };
    }
    const newLevel = Math.max(1, building.level - LOAN.buildingLevelLossOnDefault);
    return {
      state: {
        ...state,
        buildings: { ...state.buildings, [collateral.buildingId]: { ...building, level: newLevel } },
      },
      entries: [
        {
          category: "upkeep",
          text: `The sponsorship has gone unresolved too long. The building put up as collateral is stripped down a level to cover it.`,
        },
      ],
    };
  }

  // Purse cut: escalates each time this triggers, rather than a one-off hit.
  const newFraction = Math.min(
    LOAN.purseCutMaxFraction,
    state.loanPurseCutFraction > 0 ? state.loanPurseCutFraction + LOAN.purseCutIncreasePerDefault : LOAN.purseCutStartFraction
  );
  return {
    state: { ...state, loanPurseCutFraction: newFraction },
    entries: [
      {
        category: "upkeep",
        text: `The sponsorship has gone unresolved too long. The sponsor now takes ${Math.round(newFraction * 100)}% of every future fight purse until it's repaid.`,
      },
    ],
  };
}

/**
 * Called once per week alongside the ordinary debt tick. Interest compounds on the
 * outstanding principal every week it's unpaid. Whenever gold is positive, a share of
 * it is automatically garnished toward the sponsorship first, before the player gets
 * to spend it. Left unpaid too long, the consequence lands on whatever was put up as
 * collateral -- a building loses a level, or the purse-cut fraction climbs -- not a
 * flat number that can bottom out at zero cost.
 */
export function tickWeeklyLoan(state: LudusState, currentDay: number): LoanTickResult {
  const entries: SummaryEntry[] = [];
  if (state.loanPrincipal <= 0 || state.loanTakenOnDay === null) {
    return { state, entries };
  }

  let working = state;

  const interest = Math.round(working.loanPrincipal * LOAN.weeklyInterestRate);
  working = { ...working, loanPrincipal: working.loanPrincipal + interest };
  entries.push({ category: "upkeep", text: `Interest accrues on the sponsorship: +${interest}g owed.` });

  if (working.gold > 0) {
    const garnish = Math.min(working.gold, Math.round(working.gold * LOAN.garnishFraction), working.loanPrincipal);
    if (garnish > 0) {
      working = { ...working, gold: working.gold - garnish, loanPrincipal: working.loanPrincipal - garnish };
      entries.push({ category: "upkeep", text: `${garnish}g of available gold was garnished toward the sponsorship.` });
    }
  }

  if (working.loanPrincipal <= 0) {
    entries.push({ category: "upkeep", text: "The sponsorship has been fully repaid." });
    return { state: { ...working, loanPrincipal: 0, loanTakenOnDay: null, loanCollateral: null, loanPurseCutFraction: 0 }, entries };
  }

  const weeksOutstanding = Math.floor((currentDay - working.loanTakenOnDay!) / 7);
  const defaulted =
    weeksOutstanding === LOAN.defaultAfterWeeks ||
    (weeksOutstanding > LOAN.defaultAfterWeeks &&
      (weeksOutstanding - LOAN.defaultAfterWeeks) % LOAN.defaultRepeatEveryWeeks === 0);

  if (defaulted) {
    const result = applyCollateralConsequence(working);
    working = result.state;
    entries.push(...result.entries);
  }

  return { state: working, entries };
}

/**
 * Skims the purse-cut collateral's redirect fraction off a fight-day gold reward
 * before it reaches the player's pocket, applying it straight to the principal.
 * A no-op unless a purse-cut sponsorship with a nonzero fraction is active.
 */
export function applyPurseCut(state: LudusState, grossGold: number): { netGold: number; loanPrincipal: number; entry: SummaryEntry | null } {
  if (state.loanPrincipal <= 0 || state.loanCollateral?.type !== "purseCut" || state.loanPurseCutFraction <= 0 || grossGold <= 0) {
    return { netGold: grossGold, loanPrincipal: state.loanPrincipal, entry: null };
  }
  const cut = Math.min(grossGold, Math.round(grossGold * state.loanPurseCutFraction), state.loanPrincipal);
  return {
    netGold: grossGold - cut,
    loanPrincipal: state.loanPrincipal - cut,
    entry: cut > 0 ? { category: "upkeep", text: `The sponsor's cut took ${cut}g from this week's fight purses.` } : null,
  };
}
