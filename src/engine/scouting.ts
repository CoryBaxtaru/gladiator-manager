import type { LudusState, RecruitCandidate, RecruitChannel, RecruiterTier } from "../types";
import { RECRUIT_CHANNELS, RECRUITER_TIERS, RECRUITMENT, POSITIVE_TRAITS } from "../config";
import { generateGladiator, maybeGenerateMakasimus, VOLUNTEER_BACKSTORY_TEMPLATES } from "./generator";
import { tierCostMultiplier } from "./economy";
import { nextId, pick, randInt, randFloat } from "./rng";

const PROCURATOR_NAMES = [
  "Marcus Trebius", "Appius Naso", "Cnaeus Silo", "Servius Pico", "Lucius Mercator",
  "Gaius Vendex", "Titus Lanio", "Quintus Praeco",
];

export function canSendRecruiter(state: LudusState): boolean {
  return state.recruiterTrip === null;
}

/** Rough market value of one candidate at a channel's baseline quality, used only to
 * fold an "acquisition budget" into the single upfront price -- no gold changes hands
 * again when the trip returns. */
function estimatedCandidateValue(channel: RecruitChannel, tierMultiplier: number): number {
  const cfg = RECRUIT_CHANNELS[channel];
  if (cfg.flatSigningFee) {
    return Math.round((cfg.signingFeeBase + cfg.signingFeeSpread / 2) * tierMultiplier);
  }
  const approxPotential = cfg.baseStat + 15;
  const base = cfg.baseStat * RECRUITMENT.basePriceMultiplier + approxPotential * 1.2;
  return Math.max(10, Math.round(base * cfg.priceMultiplier * tierMultiplier));
}

/** The single upfront price for sending a scout of this tier down this channel --
 * trip fee plus an estimate of what the batch he brings back would have cost to
 * acquire individually, all paid now, before he ever leaves. */
export function recruiterSendCost(state: LudusState, channel: RecruitChannel, tier: RecruiterTier): number {
  const cfg = RECRUIT_CHANNELS[channel];
  const tierCfg = RECRUITER_TIERS[tier];
  const tierMultiplier = tierCostMultiplier(state);
  const avgBatchSize = (cfg.batchMin + cfg.batchMax) / 2;
  const perCandidate = estimatedCandidateValue(channel, tierMultiplier);
  const raw = cfg.tripCost * tierMultiplier + avgBatchSize * perCandidate;
  return Math.round(raw * tierCfg.priceMultiplier);
}

function generateCandidate(channel: RecruitChannel, currentDay: number, tier: RecruiterTier, usedArenaNames: Set<string>, refundValue: number): RecruitCandidate {
  // Phase 12 Part O: an ultra-rare pull, checked before ordinary generation so it can
  // turn up from any channel at any procurator tier.
  const legendary = maybeGenerateMakasimus(currentDay);
  if (legendary) {
    usedArenaNames.add(legendary.name);
    return { id: nextId("rc"), gladiator: legendary, channel, refundValue };
  }

  const cfg = RECRUIT_CHANNELS[channel];
  const tierCfg = RECRUITER_TIERS[tier];
  // Phase 12 Part K: procurator tier's bonus is now proportional to the channel's own
  // baseline, so it stays meaningfully differentiated at every stage instead of a flat
  // amount that shrinks in relative terms as everything else scales (see
  // RECRUITER_TIERS's doc comment for the full diagnosis).
  const baseStat = cfg.baseStat * (1 + tierCfg.baseStatBonusFraction);
  const gemChance = cfg.gemChance + tierCfg.gemChanceBonus;

  const gladiator = generateGladiator(currentDay, {
    baseStatOverride: Math.round(baseStat),
    statSpreadOverride: cfg.statSpread,
    gemChanceOverride: gemChance,
    traitPoolOverride: cfg.traitBiasPositive ? POSITIVE_TRAITS : undefined,
    moodOverride: cfg.moodBonus > 0 ? 65 + cfg.moodBonus : undefined,
    recordOverride: cfg.recordBias
      ? (() => {
          const fights = randInt(2, 6);
          const wins = Math.round(fights * randFloat(0.55, 0.85));
          return { fights, wins, losses: fights - wins, nearDeaths: Math.random() < 0.15 ? 1 : 0 };
        })()
      : undefined,
    backstoryPoolOverride: channel === "volunteer_hall" ? VOLUNTEER_BACKSTORY_TEMPLATES : undefined,
    usedArenaNames,
  });
  usedArenaNames.add(gladiator.name);

  return { id: nextId("rc"), gladiator, channel, refundValue };
}

function generateBatch(channel: RecruitChannel, currentDay: number, tier: RecruiterTier, rosterArenaNames: Set<string>, costPaid: number): RecruitCandidate[] {
  const cfg = RECRUIT_CHANNELS[channel];
  const size = randInt(cfg.batchMin, cfg.batchMax);
  const usedArenaNames = new Set(rosterArenaNames);
  const refundValue = Math.round((costPaid / size) * RECRUITMENT.sellOnRefundFraction);
  return Array.from({ length: size }, () => generateCandidate(channel, currentDay, tier, usedArenaNames, refundValue));
}

/** Sends a scouting expedition: always purchasable, no staff pool or availability roll
 * involved. The full cost (trip fee + expected acquisition cost) is paid now; the
 * return trip is keep-or-release only. */
export function sendRecruiter(state: LudusState, channel: RecruitChannel, tier: RecruiterTier): LudusState {
  if (!canSendRecruiter(state)) return state;
  const cfg = RECRUIT_CHANNELS[channel];
  const cost = recruiterSendCost(state, channel, tier);
  if (state.gold < cost) return state;

  return {
    ...state,
    gold: state.gold - cost,
    recruiterTrip: {
      id: nextId("trip"),
      tier,
      recruiterName: pick(PROCURATOR_NAMES),
      channel,
      sentOnDay: state.currentDay,
      returnsOnDay: state.currentDay + cfg.tripDurationDays,
      costPaid: cost,
    },
  };
}

/** Called once per day tick. If a trip has completed, resolve it into a fresh candidate pool. */
export function tickRecruiterTrip(state: LudusState): { state: LudusState; returned: boolean } {
  const trip = state.recruiterTrip;
  if (!trip || state.currentDay < trip.returnsOnDay) return { state, returned: false };

  const rosterArenaNames = new Set(state.gladiators.filter((g) => g.status === "active").map((g) => g.name));
  const batch = generateBatch(trip.channel, state.currentDay, trip.tier, rosterArenaNames, trip.costPaid);

  return {
    state: {
      ...state,
      recruiterTrip: null,
      recruitPool: batch,
    },
    returned: true,
  };
}

/** Keeps a returned candidate -- already paid for, so this just adds him to the roster. */
export function recruitGladiator(state: LudusState, candidateId: string): LudusState {
  const candidate = state.recruitPool.find((c) => c.id === candidateId);
  if (!candidate) return state;
  return {
    ...state,
    gladiators: [...state.gladiators, candidate.gladiator],
    recruitPool: state.recruitPool.filter((c) => c.id !== candidateId),
  };
}

export function passRecruitCandidate(state: LudusState, candidateId: string): LudusState {
  return { ...state, recruitPool: state.recruitPool.filter((c) => c.id !== candidateId) };
}

/** "Sell him on" -- release a returned candidate for a partial refund instead of
 * letting him go for nothing. See RECRUITMENT.sellOnRefundFraction. */
export function sellOnCandidate(state: LudusState, candidateId: string): LudusState {
  const candidate = state.recruitPool.find((c) => c.id === candidateId);
  if (!candidate) return state;
  return {
    ...state,
    gold: state.gold + candidate.refundValue,
    recruitPool: state.recruitPool.filter((c) => c.id !== candidateId),
  };
}
