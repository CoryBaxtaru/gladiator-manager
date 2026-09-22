import type { Gladiator, LudusState, StatKey, SummaryEntry } from "../types";
import { SPARRING, POSITIVE_TRAITS, MAX_TRAITS_PER_GLADIATOR, PERSONALITY_TRAIT_UNLOCK } from "../config";
import { trainStat } from "./training";
import { addMoodModifier } from "./mood";
import { chance, pick } from "./rng";

export function canSpar(gladiator: Gladiator): boolean {
  return gladiator.status === "active" && gladiator.injuryDaysRemaining === 0;
}

export function setSparringPair(state: LudusState, gladiatorAId: string, gladiatorBId: string): LudusState {
  if (gladiatorAId === gladiatorBId) return state;
  const a = state.gladiators.find((g) => g.id === gladiatorAId);
  const b = state.gladiators.find((g) => g.id === gladiatorBId);
  if (!a || !b || a.status !== "active" || b.status !== "active") return state;

  return {
    ...state,
    gladiators: state.gladiators.map((g) => {
      if (g.id === gladiatorAId) return { ...g, sparringPartnerId: gladiatorBId };
      if (g.id === gladiatorBId) return { ...g, sparringPartnerId: gladiatorAId };
      // Breaking any prior pairing either of these two was in.
      if (g.sparringPartnerId === gladiatorAId || g.sparringPartnerId === gladiatorBId) {
        return { ...g, sparringPartnerId: null };
      }
      return g;
    }),
  };
}

export function clearSparring(state: LudusState, gladiatorId: string): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  const partnerId = gladiator?.sparringPartnerId;
  return {
    ...state,
    gladiators: state.gladiators.map((g) =>
      g.id === gladiatorId || (partnerId && g.id === partnerId) ? { ...g, sparringPartnerId: null } : g
    ),
  };
}

function sparringInjuryRoll(gladiator: Gladiator, currentDay: number): Gladiator {
  if (!chance(SPARRING.injuryChancePerDay)) return gladiator;
  const bruised: Gladiator = { ...gladiator, condition: gladiator.condition === "healthy" ? "bruised" : gladiator.condition };
  return addMoodModifier(bruised, "Bruised sparring", SPARRING.injuryMoodPenalty, currentDay, 3);
}

/** One gladiator may pick up a trait their partner holds, if they have an open slot. */
function traitTransferRoll(receiver: Gladiator, giver: Gladiator): { gladiator: Gladiator; entry: SummaryEntry | null } {
  if (receiver.personalityTraits.length >= MAX_TRAITS_PER_GLADIATOR) return { gladiator: receiver, entry: null };
  // No transferring a trait into a slot that hasn't been earned yet -- too young, or
  // hasn't won enough fights for the first slot to exist at all.
  const firstSlotEarned =
    receiver.personalityTraits.length > 0 ||
    (receiver.age > PERSONALITY_TRAIT_UNLOCK.youngAgeMax && receiver.record.wins >= PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone);
  if (!firstSlotEarned) return { gladiator: receiver, entry: null };
  if (!chance(SPARRING.traitTransferChancePerDay)) return { gladiator: receiver, entry: null };

  const candidates = giver.personalityTraits.filter(
    (t) => POSITIVE_TRAITS.includes(t) && !receiver.personalityTraits.includes(t)
  );
  if (candidates.length === 0) return { gladiator: receiver, entry: null };

  const learned = pick(candidates);
  const updated: Gladiator = { ...receiver, personalityTraits: [...receiver.personalityTraits, learned] };
  return {
    gladiator: updated,
    entry: {
      category: "training",
      text: `${receiver.name} picked up a touch of ${giver.name}'s ${learned} from sparring together.`,
    },
  };
}

export interface SparringResult {
  a: Gladiator;
  b: Gladiator;
  entries: SummaryEntry[];
}

/** Runs one day of a sparring pair: each trains a random combat stat at full solo effectiveness,
 * plus a shared trait-transfer roll and an independent injury roll per side. */
export function applySparringTraining(a: Gladiator, b: Gladiator, state: LudusState, currentDay: number): SparringResult {
  const entries: SummaryEntry[] = [];

  if (!canSpar(a) || !canSpar(b)) {
    return { a, b, entries };
  }

  const statA: StatKey = pick(SPARRING.statPool);
  const statB: StatKey = pick(SPARRING.statPool);

  let updatedA = trainStat(a, statA, state, statA);
  let updatedB = trainStat(b, statB, state, statB);

  updatedA = sparringInjuryRoll(updatedA, currentDay);
  updatedB = sparringInjuryRoll(updatedB, currentDay);

  const transferToA = traitTransferRoll(updatedA, updatedB);
  updatedA = transferToA.gladiator;
  if (transferToA.entry) entries.push(transferToA.entry);

  const transferToB = traitTransferRoll(updatedB, updatedA);
  updatedB = transferToB.gladiator;
  if (transferToB.entry) entries.push(transferToB.entry);

  return { a: updatedA, b: updatedB, entries };
}
