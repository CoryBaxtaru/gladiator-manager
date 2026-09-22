import type { LudusState } from "../types";
import { SAVE_SLOT_COUNT } from "../config";
import { tierForReputation } from "../engine/rivalLudi";

export const AUTOSAVE_KEY = "gladiator-manager-autosave-v2";

/**
 * Fills in fields that didn't exist when a save was written, so older saves keep
 * loading instead of crashing on missing arrays or missing per-gladiator stats.
 * Extend this whenever LudusState's shape grows.
 */
function normalizeState(state: LudusState): LudusState {
  const normalized: LudusState = {
    ...state,
    deathMatchCooldowns: state.deathMatchCooldowns ?? [],
    pendingDeathMatchChallenge: state.pendingDeathMatchChallenge ?? null,
    recruitPool: (state.recruitPool ?? []).map((c) => ({ ...c, channel: c.channel ?? "slave_market" })),
    // Phase 8 Part A: recruiters are no longer hired staff sent on a trip, they're a
    // one-off expedition paid for upfront. A trip in flight from before this change has
    // no tier to migrate to, so it's cleared rather than guessed at -- the player can
    // just send a fresh one, and any gold already spent is sunk either way.
    recruiterTrip: state.recruiterTrip && "tier" in state.recruiterTrip ? state.recruiterTrip : null,
    staff: state.staff.filter((s) => s.role === "trainer" || s.role === "doctor"),
    debtWeeksActive: state.debtWeeksActive ?? 0,
    loanPrincipal: state.loanPrincipal ?? 0,
    loanTakenOnDay: state.loanTakenOnDay ?? null,
    // Saves from before Phase 8 Part H had no collateral concept -- a loan already in
    // flight defaults to the purse-cut framing (no building to guess at) so it keeps
    // behaving sensibly rather than crashing on a missing field.
    loanCollateral: state.loanCollateral ?? (state.loanPrincipal > 0 ? { type: "purseCut" } : null),
    loanPurseCutFraction: state.loanPurseCutFraction ?? 0,
    // Saves from before Promotion Fights existed already had a tier they were fighting
    // at, derived straight from reputation back then -- carry that forward as their
    // starting unlockedTier rather than suddenly capping a save mid-tier.
    unlockedTier: state.unlockedTier ?? tierForReputation(state.reputation),
    promotionCooldownUntilDay: state.promotionCooldownUntilDay ?? null,
    history: state.history ?? [],
    // Saves from before Phase 8 Part F never had a chosen ludus name -- fall back to
    // the same "{founder}'s Ludus" pattern they always displayed.
    ludusName: state.ludusName ?? `${state.founderName}'s Ludus`,
    gladiators: state.gladiators.map((g) => ({
      ...g,
      sparringPartnerId: g.sparringPartnerId ?? null,
      lastPrideBoastDay: g.lastPrideBoastDay ?? null,
      lastEncouragementDay: g.lastEncouragementDay ?? null,
      // Saves from before Phase 8 Part E had no body-type archetype; a fixed
      // deterministic fallback (rather than a fresh random roll on every load) so it
      // doesn't reshuffle a fighter's build/CA each time the save is reopened.
      physicalTrait: g.physicalTrait ?? "Tall",
      statusChangedOnDay: g.statusChangedOnDay ?? null,
    })),
    rivalLudi: (state.rivalLudi ?? []).map((ludus) => ({
      ...ludus,
      roster: ludus.roster.map((fighter) => ({
        ...fighter,
        stats:
          fighter.stats ??
          {
            strength: fighter.currentAbility,
            weaponSkill: fighter.currentAbility,
            endurance: fighter.currentAbility,
            showmanship: fighter.currentAbility,
          },
        potentialAbility: fighter.potentialAbility ?? Math.min(99, fighter.currentAbility + 15),
        potentialNoiseSeed: fighter.potentialNoiseSeed ?? 0,
        physicalTrait: fighter.physicalTrait ?? "Tall",
        personalityTraits: fighter.personalityTraits ?? [],
        backstory: fighter.backstory ?? "A fighter of unknown history.",
      })),
    })),
  };
  return normalized;
}

function slotKey(slot: number): string {
  return `gladiator-manager-slot-${slot}`;
}

export interface SaveSlotMeta {
  slot: number;
  day: number;
  gold: number;
  reputation: number;
  founderName: string;
  ludusName: string;
  savedAt: string;
}

interface StoredSlot {
  state: LudusState;
  savedAt: string;
}

export function listSaveSlots(): (SaveSlotMeta | null)[] {
  const slots: (SaveSlotMeta | null)[] = [];
  for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) {
        slots.push(null);
        continue;
      }
      const parsed = JSON.parse(raw) as StoredSlot;
      slots.push({
        slot,
        day: parsed.state.currentDay,
        gold: parsed.state.gold,
        reputation: parsed.state.reputation,
        founderName: parsed.state.founderName,
        ludusName: parsed.state.ludusName ?? `${parsed.state.founderName}'s Ludus`,
        savedAt: parsed.savedAt,
      });
    } catch {
      slots.push(null);
    }
  }
  return slots;
}

export function saveToSlot(slot: number, state: LudusState): void {
  const payload: StoredSlot = { state, savedAt: new Date().toISOString() };
  localStorage.setItem(slotKey(slot), JSON.stringify(payload));
}

export function loadFromSlot(slot: number): LudusState | null {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSlot;
    return normalizeState(parsed.state);
  } catch {
    return null;
  }
}

export function deleteSlot(slot: number): void {
  localStorage.removeItem(slotKey(slot));
}

export function saveAutosave(state: LudusState): void {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
}

export function loadAutosave(): LudusState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as LudusState);
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

export function clearAllSaveData(): void {
  clearAutosave();
  for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) deleteSlot(slot);
}
