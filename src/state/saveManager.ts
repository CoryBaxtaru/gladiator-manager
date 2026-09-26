import type { GladiatorStats, LudusState } from "../types";
import { SAVE_SLOT_COUNT } from "../config";
import { tierForReputation } from "../engine/rivalLudi";
import { generateRomanCitizenName } from "../engine/names";

export const AUTOSAVE_KEY = "gladiator-manager-autosave-v2";

/**
 * Phase 15 Part 3 migration: a save from before the Attack/Strength/Defence split has
 * stats missing `attack`/`defence` entirely (or, for a rival fighter with no stats at
 * all, nothing to derive from beyond currentAbility). Neither gets reset to zero:
 * `attack` and `defence` both derive from the old `strength` value, which is exactly
 * the stat Attack took over 1:1 -- Defence didn't exist as a concept before, and a
 * fighter's old raw power is a reasonable stand-in for it until training reshapes him.
 * A save already in the new shape passes through untouched.
 */
function migrateStats(stats: Partial<GladiatorStats> | undefined, fallbackAbility: number): GladiatorStats {
  const base = stats ?? {};
  const strength = base.strength ?? fallbackAbility;
  return {
    attack: base.attack ?? strength,
    strength,
    defence: base.defence ?? strength,
    weaponSkill: base.weaponSkill ?? fallbackAbility,
    endurance: base.endurance ?? fallbackAbility,
    showmanship: base.showmanship ?? fallbackAbility,
  };
}

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
    // Phase 10 Part B: refundValue is new -- a candidate pool resolved before this
    // change has no per-candidate cost share to compute it from, so it defaults to 0
    // ("sell him on" just isn't worth anything for that already-in-flight batch).
    recruitPool: (state.recruitPool ?? []).map((c) => ({
      ...c,
      channel: c.channel ?? "slave_market",
      refundValue: c.refundValue ?? 0,
      gladiator: {
        ...c.gladiator,
        stats: migrateStats(c.gladiator.stats, c.gladiator.stats?.weaponSkill ?? 20),
        weaponType: c.gladiator.weaponType ?? "murmillo",
        signatureTechnique: c.gladiator.signatureTechnique ?? null,
      },
    })),
    // Phase 8 Part A: recruiters are no longer hired staff sent on a trip, they're a
    // one-off expedition paid for upfront. A trip in flight from before this change has
    // no tier to migrate to, so it's cleared rather than guessed at -- the player can
    // just send a fresh one, and any gold already spent is sunk either way.
    // Phase 10 Part B: costPaid is new -- same fallback reasoning, defaults to 0 if
    // missing (only possible for a trip already in flight the moment this shipped).
    recruiterTrip:
      state.recruiterTrip && "tier" in state.recruiterTrip
        ? { ...state.recruiterTrip, costPaid: state.recruiterTrip.costPaid ?? 0 }
        : null,
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
    praetorianCooldownUntilDay: state.praetorianCooldownUntilDay ?? null,
    praetorianVictories: state.praetorianVictories ?? 0,
    // Phase 13 Part B: new field -- a save from before this existed just has no
    // locked-in draws yet, which is exactly the state a fresh one starts in anyway.
    selfChallengeDraws: state.selfChallengeDraws ?? {},
    bankruptcyCount: state.bankruptcyCount ?? 0,
    // Phase 16 Part C: new field -- a save from before this existed just starts its
    // permanent milestone log empty, same as a fresh game.
    milestones: state.milestones ?? [],
    // Phase 16 Part G: new fields -- a save from before this existed just starts the
    // sustain check fresh, same as a save that's currently in good standing.
    tierNeglectWeeksBelowStandard: state.tierNeglectWeeksBelowStandard ?? 0,
    tierNeglectCooldownUntilDay: state.tierNeglectCooldownUntilDay ?? null,
    // Saves from before Phase 8 Part F never had a chosen ludus name -- fall back to
    // the same "{founder}'s Ludus" pattern they always displayed.
    ludusName: state.ludusName ?? `${state.founderName}'s Ludus`,
    // Every save ever created before Phase 9 Part A had this exact hardcoded
    // placeholder (founderName was never actually generated) -- give it a real
    // freedman-lanista name now that the title is surfaced prominently in the UI.
    founderName: state.founderName === "Retired Legionary" ? generateRomanCitizenName({ freedman: true }) : state.founderName,
    gladiators: state.gladiators.map((g) => ({
      ...g,
      sparringPartnerId: g.sparringPartnerId ?? null,
      lastPrideBoastDay: g.lastPrideBoastDay ?? null,
      lastEncouragementDay: g.lastEncouragementDay ?? null,
      lastLeaveDay: g.lastLeaveDay ?? null,
      lastBathsDay: g.lastBathsDay ?? null,
      lastRecognitionDay: g.lastRecognitionDay ?? null,
      lastSelfChallengeDay: g.lastSelfChallengeDay ?? null,
      // Saves from before Phase 8 Part E had no body-type archetype; a fixed
      // deterministic fallback (rather than a fresh random roll on every load) so it
      // doesn't reshuffle a fighter's build/CA each time the save is reopened.
      physicalTrait: g.physicalTrait ?? "Tall",
      statusChangedOnDay: g.statusChangedOnDay ?? null,
      stats: migrateStats(g.stats, g.stats?.weaponSkill ?? 20),
      // Same "fixed, deterministic" reasoning as physicalTrait above -- a random pick
      // here would reroll on every load of a save that's never been written back out.
      weaponType: g.weaponType ?? "murmillo",
      signatureTechnique: g.signatureTechnique ?? null,
    })),
    rivalLudi: (state.rivalLudi ?? []).map((ludus) => ({
      ...ludus,
      // Phase 16 Part D: new field -- a save from before this existed has no rivalry
      // history yet, same as a fresh game's rival ludi.
      record: ludus.record ?? { wins: 0, losses: 0 },
      roster: ludus.roster.map((fighter) => ({
        ...fighter,
        stats: migrateStats(fighter.stats, fighter.currentAbility),
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
