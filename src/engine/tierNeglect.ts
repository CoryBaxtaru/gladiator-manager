import type { Gladiator, LudusState, SummaryEntry } from "../types";
import { PROMOTION_READINESS, REPUTATION_BANDS_BY_TIER, REPUTATION_TIER_LABELS, TIER_NEGLECT } from "../config";
import { computeStanding, previousTierOf } from "./promotion";
import { riskTagFor } from "./mood";
import { currentAbilityOf } from "./rating";
import { pick } from "./rng";

export interface TierNeglectTickResult {
  state: LudusState;
  entries: SummaryEntry[];
}

function onCooldown(state: LudusState): boolean {
  return state.tierNeglectCooldownUntilDay !== null && state.currentDay < state.tierNeglectCooldownUntilDay;
}

/** Never the roster's last fighter -- same soft-lock convention as every other forced
 * removal in this game (mood-break escapes/deaths, the bankruptcy circuit breaker).
 * Prefers whoever is already flagged mood-neglected (see mood.ts's riskTagFor, the
 * worst mood first) since that's a visible warning sign the player had a chance to
 * act on; falls back to simply the lowest Current Ability in the roster (under-
 * trained relative to the tier) when nobody is currently flagged. */
function poachableGladiator(active: Gladiator[]): Gladiator | null {
  if (active.length <= 1) return null;
  const flagged = active.filter((g) => riskTagFor(g) !== null);
  if (flagged.length > 0) {
    return [...flagged].sort((a, b) => a.mood - b.mood)[0];
  }
  return [...active].sort((a, b) => currentAbilityOf(a) - currentAbilityOf(b))[0];
}

/** A rival capable of doing the poaching: strictly higher reputation than the player
 * (a school with the standing to lure a fighter away). Prefers a rival the player
 * already has a real rivalry with (see engine/rivalLudi.ts's recordRivalryResult) so
 * the moment reads as a grudge, not a coincidence of naming; falls back to a random
 * eligible rival when no rivalry history exists yet. */
function poachingRival(state: LudusState) {
  const eligible = state.rivalLudi.filter((l) => l.reputation > state.reputation);
  if (eligible.length === 0) return null;
  const withHistory = eligible.filter((l) => l.record.wins + l.record.losses > 0);
  const pool = withHistory.length > 0 ? withHistory : eligible;
  return pick(pool);
}

/**
 * Phase 16 Part G: called once per week, right alongside the other weekly ticks. If
 * the ludus's average building level or average roster Current Ability has sat below
 * TIER_NEGLECT.sustainFraction of its own current tier's entry bar for
 * TIER_NEGLECT.graceWeeks straight, a consequence fires: a rival poaches whichever
 * active gladiator is worst-off, or -- if the roster is down to one fighter and
 * nothing can be poached -- the ludus is demoted a tier outright. Local tier has no
 * entry bar to sustain (PROMOTION_READINESS.local is the unused zero entry), so this
 * is a complete no-op there.
 */
export function tickTierNeglect(state: LudusState): TierNeglectTickResult {
  const entries: SummaryEntry[] = [];
  const reset = (s: LudusState) => (s.tierNeglectWeeksBelowStandard === 0 ? { state: s, entries } : { state: { ...s, tierNeglectWeeksBelowStandard: 0 }, entries });

  if (state.unlockedTier === "local") {
    return reset(state);
  }

  // A fresh cooldown after a consequence is a full, uncounted grace period -- the
  // sustain clock doesn't quietly keep running underneath it, so the player always
  // gets the full warnAtWeek/graceWeeks runway again once it lifts, not an instant
  // second consequence from weeks that piled up while nothing could fire anyway.
  if (onCooldown(state)) {
    return reset(state);
  }

  const required = PROMOTION_READINESS[state.unlockedTier];
  const { avgBuildingLevel, avgRosterCA } = computeStanding(state);
  const belowStandard =
    avgBuildingLevel < required.minAvgBuildingLevel * TIER_NEGLECT.sustainFraction ||
    avgRosterCA < required.minAvgRosterCA * TIER_NEGLECT.sustainFraction;

  if (!belowStandard) {
    return reset(state);
  }

  const weeksBelow = state.tierNeglectWeeksBelowStandard + 1;
  let working: LudusState = { ...state, tierNeglectWeeksBelowStandard: weeksBelow };

  if (weeksBelow === TIER_NEGLECT.warnAtWeek) {
    entries.push({
      category: "event",
      text: `${working.ludusName} is falling behind what ${REPUTATION_TIER_LABELS[working.unlockedTier]} expects -- buildings and roster both look thin for the standing it's fighting at. A rival may make a move if this keeps up.`,
    });
    return { state: working, entries };
  }

  if (weeksBelow < TIER_NEGLECT.graceWeeks) {
    return { state: working, entries };
  }

  // The consequence fires. Reset the counter and start the cooldown regardless of
  // which branch below actually applies.
  working = {
    ...working,
    tierNeglectWeeksBelowStandard: 0,
    tierNeglectCooldownUntilDay: working.currentDay + TIER_NEGLECT.cooldownWeeksAfterConsequence * 7,
  };

  const active = working.gladiators.filter((g) => g.status === "active");
  const target = poachableGladiator(active);

  if (target) {
    const rival = poachingRival(working);
    const rivalName = rival?.name ?? "a rival ludus";
    const reason = riskTagFor(target) !== null ? "left to rot on a neglected mood" : "left undertrained for the tier he's fighting at";
    const penalty = Math.min(working.reputation, TIER_NEGLECT.poachingReputationPenalty);

    working = {
      ...working,
      reputation: working.reputation - penalty,
      gladiators: working.gladiators.map((g) =>
        g.id === target.id ? { ...g, status: "poached" as const, statusChangedOnDay: working.currentDay } : g
      ),
    };
    entries.push({
      category: "event",
      text: `${target.name}, ${reason}, was lured away by ${rivalName} -- your ludus wasn't giving him a reason to stay. ${working.ludusName} loses standing over it.`,
    });
    return { state: working, entries };
  }

  // Nothing poachable (down to one active gladiator): demote instead, so a
  // min-maxed single-fighter roster can't sit at a tier it can't sustain forever.
  const oldTier = working.unlockedTier;
  const lowerTier = previousTierOf(oldTier);
  if (!lowerTier) {
    return { state: working, entries };
  }
  // Floored at the tier being dropped INTO's own ceiling, not just below the old
  // tier's floor -- otherwise reputation could land in the gap between the two
  // bands, above the tier it's now nominally fighting at.
  const newReputation = Math.min(working.reputation, REPUTATION_BANDS_BY_TIER[lowerTier].max);
  working = {
    ...working,
    unlockedTier: lowerTier,
    reputation: Math.max(0, newReputation),
  };
  entries.push({
    category: "event",
    text: `${working.ludusName} could not keep up what ${REPUTATION_TIER_LABELS[oldTier]} demanded and has been dropped back to ${REPUTATION_TIER_LABELS[lowerTier]}.`,
  });
  return { state: working, entries };
}
