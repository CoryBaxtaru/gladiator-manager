import type { LudusState, MilestoneCategory, MilestoneEntry } from "../types";
import { SIGNATURE_TECHNIQUES, REPUTATION_TIER_LABELS } from "../config";
import { nextId } from "./rng";

const MAX_MILESTONES = 300;

/**
 * Phase 16 Part C: diffs a before/after LudusState pair (a single tick or a single
 * player action) and returns the significant events that happened between them --
 * deaths, escapes, retirements, tier promotions, bankruptcies, newly-earned signature
 * techniques. Diff-based rather than instrumenting every engine call site individually
 * (promotion fights, death matches, self-challenges, the Colosseum finale, and the
 * ordinary day tick all touch gladiator status/tier/bankruptcyCount through different
 * code paths) so nothing can slip through a path that forgets to log it explicitly --
 * the same reasoning combat.ts's techniqueAnnouncementFor already uses for the
 * fight-specific case this generalizes.
 */
function deriveNewMilestones(before: LudusState, after: LudusState): { category: MilestoneCategory; text: string }[] {
  const out: { category: MilestoneCategory; text: string }[] = [];
  const beforeById = new Map(before.gladiators.map((g) => [g.id, g]));

  for (const g of after.gladiators) {
    const prior = beforeById.get(g.id);
    if (!prior) continue;
    if (prior.status === "active" && g.status !== "active") {
      if (g.status === "dead") {
        out.push({ category: "death", text: `${g.name} has died.` });
      } else if (g.status === "escaped") {
        out.push({ category: "escape", text: `${g.name} escaped the ludus.` });
      } else if (g.status === "retired") {
        out.push({ category: "retirement", text: `${g.name} retired from the sand to join the staff.` });
      }
    }
    if (!prior.signatureTechnique && g.signatureTechnique) {
      const technique = SIGNATURE_TECHNIQUES[g.signatureTechnique];
      out.push({ category: "technique", text: `${g.name} earned the signature technique "${technique.label}."` });
    }
  }

  if (after.unlockedTier !== before.unlockedTier) {
    out.push({ category: "promotion", text: `The ludus was promoted -- now fighting at ${REPUTATION_TIER_LABELS[after.unlockedTier]}.` });
  }
  if (after.bankruptcyCount > before.bankruptcyCount) {
    out.push({ category: "bankruptcy", text: "The ludus went bankrupt. Creditors picked it clean." });
  }

  return out;
}

/** Appends any newly-derived milestones from this state transition, capped so the
 * permanent log doesn't grow forever across a very long save. Returns `after`
 * unchanged (same reference) when nothing significant happened, so callers can skip
 * a state update entirely in that common case. */
export function withMilestones(before: LudusState, after: LudusState): LudusState {
  const found = deriveNewMilestones(before, after);
  if (found.length === 0) return after;
  const day = after.currentDay;
  const newEntries: MilestoneEntry[] = found.map((f) => ({ id: nextId("ms"), day, ...f }));
  return { ...after, milestones: [...after.milestones, ...newEntries].slice(-MAX_MILESTONES) };
}
