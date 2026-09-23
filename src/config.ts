// Central tunable config. Balance the game by editing values here, not game logic.
import type { BuildingId, BuildingMaterial, FightTier, GladiatorStats, Origin, PersonalityTrait, PhysicalTrait, RecruitChannel, RecruiterTier, TrainingFocus } from "./types";

export const MOOD = {
  min: 0,
  max: 100,
  start: 65,
  minorBreakMax: 40,
  minorBreakMin: 25,
  majorBreakMax: 25,
  majorBreakMin: 10,
  extremeBreakMax: 10,
  hotStreakThreshold: 85,
  hotStreakBonus: 6,
  brooding_dailyDecay: -1,
  restFocusBonus: 5,
};

// recomputeMood() folds modifierSum * 0.15 into mood once per day a modifier stays
// active, so a modifier's real lifetime effect is magnitude * 0.15 * durationDays and
// its immediate effect (the day it's applied) is just magnitude * 0.15. These boost
// values are set so that immediate effect lands around +6 to +9 -- enough on its own
// to pull a gladiator back over a break threshold -- with the full multi-day total
// landing around +20 to +45. See docs/mood-action-tuning.md for the worked numbers.
export const MOOD_ACTIONS = {
  moraleEventCost: 120,
  moraleEventBoost: 60,
  moraleEventDurationDays: 5,
  moraleEventCooldownDays: 10,
  ritualBoost: 35,
  ritualDurationDays: 4,
  ritualCooldownDays: 6,
  bonusCutCostPerCA: 4,
  bonusCutBoost: 40,
  bonusCutDurationDays: 5,
  bonusCutCooldownDays: 8,
  // A free, trait-gated action for Prideful gladiators, parallel to the Devout ritual.
  prideBoastBoost: 35,
  prideBoastDurationDays: 4,
  prideBoastCooldownDays: 7,
  // A free, always-available emergency valve: no gold cost, so it never scales with
  // tier and is never the one thing a broke ludus can't afford. Weaker and shorter
  // than a Feast on purpose, it's a stopgap, not a replacement.
  encouragementBoost: 20,
  encouragementDurationDays: 3,
  encouragementCooldownDays: 4,
  // Phase 9 Part B additions, calibrated against the Feast numbers above rather than
  // a separate scale (moraleEventBoost 60 over 5 days = ~9 immediate, ~45 lifetime).
  // Free, no gold cost, ever tier-scaled: forces a couple of days of Rest training
  // focus (the existing manual "rest" option, see TRAINING) on top of its own boost,
  // so the real effect is genuinely losing training days, not just a number appearing.
  leaveBoost: 30,
  leaveDurationDays: 3,
  leaveRestDays: 2,
  leaveCooldownDays: 6,
  // Gold cost; effectiveness scales with the Quarters building level, tying an
  // existing building into this system in a way it currently isn't.
  bathsCostBase: 70,
  bathsBoostBase: 25,
  bathsBoostPerQuartersLevel: 6,
  bathsDurationDays: 4,
  bathsCooldownDays: 6,
  // Flat gold cost like the others, but the boost itself scales with showmanship, so
  // a crowd favorite gets more out of public praise than a quiet fighter does.
  recognitionCostBase: 90,
  recognitionBoostBase: 15,
  recognitionBoostPerShowmanship: 0.5,
  recognitionDurationDays: 4,
  recognitionCooldownDays: 7,
};

/**
 * Phase 9 Part B: automatic, not purchasable -- a small celebratory mood +
 * reputation bump for a fight-day win pulled off as a clean sweep, or as a Heavy
 * Underdog per WinChanceBadge's classify() bands (underdogWinRateMax kept in sync
 * with that 0.25 "Heavy Underdog" cutoff by hand). No cooldown: the trigger
 * condition itself is rare enough not to need spam control.
 */
export const BRONZE_CROWN = {
  underdogWinRateMax: 0.25,
  moodBoost: 40,
  moodDurationDays: 5,
  reputationBonus: 8,
};

export const BUILDING_MATERIAL_TIME: Record<
  BuildingMaterial,
  { baseTime: number; timeGrowth: number }
> = {
  wood: { baseTime: 3, timeGrowth: 1.3 },
  wood_clay: { baseTime: 5, timeGrowth: 1.4 },
  stone: { baseTime: 10, timeGrowth: 1.5 },
  stone_marble: { baseTime: 21, timeGrowth: 1.6 },
};

export const BUILDING_DEFAULTS: Record<
  BuildingId,
  { material: BuildingMaterial; baseCost: number; costGrowth: number; upkeepPerLevel: number; label: string; description: string }
> = {
  training_yard: {
    material: "stone",
    baseCost: 500,
    costGrowth: 1.7,
    upkeepPerLevel: 15,
    label: "Training Yard",
    description: "Boosts training effectiveness for all gladiators.",
  },
  barracks: {
    material: "wood_clay",
    baseCost: 300,
    costGrowth: 1.6,
    upkeepPerLevel: 10,
    label: "Barracks",
    description: "Increases roster capacity.",
  },
  infirmary: {
    material: "stone",
    baseCost: 400,
    costGrowth: 1.65,
    upkeepPerLevel: 12,
    label: "Infirmary",
    description: "Reduces injury severity and death risk.",
  },
  armory: {
    material: "stone",
    baseCost: 450,
    costGrowth: 1.7,
    upkeepPerLevel: 12,
    label: "Armory",
    description: "Grants a combat roll bonus.",
  },
  arena: {
    material: "stone_marble",
    baseCost: 800,
    costGrowth: 1.9,
    upkeepPerLevel: 20,
    label: "Arena",
    description: "Home-fight bonus, hosting income, and reputation gain.",
  },
  quarters: {
    material: "wood",
    baseCost: 200,
    costGrowth: 1.5,
    upkeepPerLevel: 8,
    label: "Quarters",
    description: "Improves daily mood recovery.",
  },
  gate: {
    material: "wood",
    baseCost: 250,
    costGrowth: 1.5,
    upkeepPerLevel: 8,
    label: "Gate & Walls",
    description: "Resists escape attempts and sabotage.",
  },
};

/** Reputation required to queue upgrades past this building level. */
export const BUILDING_LEVEL_REPUTATION_GATE: Record<BuildingId, (level: number) => number> = {
  training_yard: (level) => (level > 5 ? (level - 5) * 40 : 0),
  barracks: () => 0,
  infirmary: (level) => (level > 5 ? (level - 5) * 30 : 0),
  armory: (level) => (level > 5 ? (level - 5) * 40 : 0),
  arena: (level) => (level > 3 ? (level - 3) * 100 : 0),
  quarters: () => 0,
  gate: (level) => (level > 5 ? (level - 5) * 20 : 0),
};

export const OVEREXTENSION = {
  /** rolling window in days during which build starts are counted */
  windowDays: 10,
  /** number of build starts within the window that triggers the debuff */
  triggerCount: 3,
  /** how many days the debuff lasts once triggered */
  debuffDurationDays: 6,
  moodDecayPerDay: -3,
  trainingEffectMultiplier: 0.7,
};

export const IMBALANCE = {
  /** spread (max level - min level) below which no penalty applies */
  tolerance: 3,
  /** mood penalty per point of spread above tolerance */
  moodPenaltyPerLevel: -1.5,
};

export const TRAITS: Record<
  PersonalityTrait,
  { description: string }
> = {
  Prideful: { description: "Big mood penalty from losses/being benched; refuses to yield in a losing fight (raises death/injury risk but higher showmanship gain on wins)." },
  Stoic: { description: "Mood swings are dampened in both directions." },
  Volatile: { description: "Mood swings are exaggerated; more likely to trigger breaks at both extremes." },
  Bloodthirsty: { description: "Mood boost from brutal/decisive wins; mood penalty from being ordered to yield or spare an opponent." },
  Coward: { description: "Higher chance to flee/yield early in a losing fight (survives more, but reputation/showmanship penalty)." },
  Loyal: { description: "Resistant to defection/escape events; mood boosts from long tenure in the ludus." },
  Greedy: { description: "Wants a cut of winnings; mood penalty if the ludus is clearly profiting off him while he stays poor." },
  Devout: { description: "Mood boosts from pre-fight rituals/omens; mood penalty from missing them." },
  Vain: { description: "Extra fame/reputation from flashy wins regardless of fight quality; mood penalty from 'boring' wins." },
  Brooding: { description: "Slow mood decay baseline over time unless actively managed." },
  Athletic: { description: "A hidden endurance bonus -- built for the long grind of a fight." },
  Gluttonous: { description: "A hidden endurance penalty -- carries more weight than is good for him in the arena." },
};

export const ALL_PERSONALITY_TRAITS: PersonalityTrait[] = Object.keys(TRAITS) as PersonalityTrait[];

/**
 * Phase 8 Part E: physical build is a fact about the body, assigned at generation and
 * fixed for life -- unlike personality, which is now earned (see PERSONALITY_TRAITS
 * below). Each archetype is a fixed, visible trade-off between two attributes.
 */
export const PHYSICAL_TRAITS: Record<PhysicalTrait, { description: string; modifiers: Partial<GladiatorStats> }> = {
  Tall: { description: "Reach and power at the cost of stamina.", modifiers: { strength: 3, endurance: -3 } },
  Short: { description: "Stamina and a low center of gravity at the cost of reach.", modifiers: { strength: -3, endurance: 3 } },
  Stocky: { description: "Raw power at the cost of crowd-pleasing flair.", modifiers: { strength: 3, showmanship: -2 } },
  Wiry: { description: "Speed and technique at the cost of raw power.", modifiers: { weaponSkill: 3, strength: -2 } },
};

/**
 * Personality traits that affect attributes directly rather than only mood, labeled
 * with the same green/red convention as PHYSICAL_TRAITS. A subset of PersonalityTrait
 * -- most personality traits (Prideful, Stoic, etc.) have no attribute modifier here.
 */
export const ATTRIBUTE_PERSONALITY_TRAITS: Partial<Record<PersonalityTrait, { modifiers: Partial<GladiatorStats> }>> = {
  Athletic: { modifiers: { endurance: 4 } },
  Gluttonous: { modifiers: { endurance: -4 } },
};

/**
 * Personality is now earned, not assigned at generation (Phase 8 Part E): a gladiator
 * roughly this age or younger hasn't fought enough to have developed any, and even an
 * older one starts blank unless generated with prior fight history (recruit channels
 * with a record bias). The first slot unlocks once career wins cross the milestone;
 * further slots (up to MAX_TRAITS_PER_GLADIATOR) only come from the existing sparring
 * trait-transfer chance.
 */
export const PERSONALITY_TRAIT_UNLOCK = {
  youngAgeMax: 18,
  firstSlotWinMilestone: 2,
};

export const ORIGIN_STAT_LEAN: Record<Origin, Partial<Record<"strength" | "weaponSkill" | "endurance" | "showmanship", number>>> = {
  Thracian: { weaponSkill: 4, showmanship: 2 },
  Gaul: { strength: 5 },
  Nubian: { endurance: 4, showmanship: 1 },
  Roman: { weaponSkill: 3, endurance: 2 },
  Numidian: { endurance: 5 },
  Germanic: { strength: 4, endurance: 1 },
  Syrian: { weaponSkill: 3, showmanship: 3 },
  Greek: { showmanship: 4, weaponSkill: 2 },
};

// Clash-based combat: a fight is a fixed set of stat-vs-stat comparisons (a "card
// battle" format) rather than dice-and-wounds rounds. Each side's effective value per
// clash is base stat + modifiers +/- a bounded random variance, so the better stat
// wins most of the time but upsets stay possible. Most clashes won decides the fight;
// an even split is a draw (only reachable if clashCount is changed to an even number).
export const COMBAT = {
  clashVariance: 0.13, // +/- 13% bounded random swing per clash
  homeArenaBonusPerLevel: 0.5,
  armoryBonusPerLevel: 0.4,
  baseInjuryChanceOnLoss: 0.35,
  baseDeathChanceOnGraveInjury: 0.12,
  narrowLossInjuryMarginBonus: 0.2, // added to injury chance at a full clean-sweep loss
  drawInjuryChanceMultiplier: 0.4,
  winMoodBase: 8,
  winMoodPerMargin: 10,
  lossMoodBase: 6,
  lossMoodPerMargin: 8,
  // Phase 8 Part B: was base 1 / perMargin 3, averaging ~2 showmanship per win --
  // roughly 10x the effective daily rate of deliberately training any other stat
  // (see docs/showmanship-balance.md), which let showmanship silently outgrow every
  // other attribute over a normal playthrough regardless of training focus. Retuned
  // down so a win's "crowd-pleasing" bump is a genuine bonus, not the dominant growth
  // channel; trait multipliers below are unchanged and now read as meaningfully bigger
  // relative to this smaller base, matching their "showier" identity.
  winShowmanshipBase: 0,
  winShowmanshipPerMargin: 1,
  winRewardBaseMultiplier: 0.7,
  winRewardPerMarginMultiplier: 0.5,
  // A loss now costs real reputation, not just a smaller gain, scaled by how decisive
  // it was: a narrow loss barely stings, a clean sweep hurts. Distinct from the gold
  // consolation payout, which stays as-is.
  lossRepPenaltyBaseMultiplier: 0.3,
  lossRepPenaltyPerMarginMultiplier: 0.7,
  // Prideful fights harder when losing (see situationalBonus) and now also wins bigger:
  // extra reputation and an extra mood boost on a win, to balance out its real downside
  // on a loss/bench instead of being lose-lose with no counterplay.
  pridefulWinReputationMultiplier: 1.35,
  pridefulWinMoodBonus: 10,
};

export const CLASH_LABELS: Record<"strength" | "weaponSkill" | "endurance" | "showmanship" | "composite", string> = {
  strength: "Strength clash",
  weaponSkill: "Weapon skill clash",
  endurance: "Endurance clash",
  showmanship: "Showmanship clash",
  composite: "Overall prowess clash",
};

/**
 * The single source of truth for how gold scales with reputation tier, used both for
 * fight purses (income) and one-time action costs (spending), so the two stay tied to
 * the same scale instead of drifting apart. Reuses the FightTier already used to gate
 * fights and building levels rather than inventing a second tier system.
 *
 * basePurseLocal is calibrated by simulation (see docs/economy-rebalance.md): a 5
 * gladiator roster at CA ~25, all buildings level 1, no staff, fighting every fight
 * day at a ~55-58% win rate against same-tier opponents, nets ~108% of its weekly
 * burn (186g) at Local tier with this value.
 */
export const FIGHT_ECONOMY = {
  basePurseLocal: 58,
  tierMultiplier: { local: 1, provincial: 2.5, rival: 5, colosseum: 10 } as Record<FightTier, number>,
  drawFraction: 0.35,
  lossFraction: 0.15,
};

export const DEATH_MATCH = {
  reputationTransferPercent: 0.12,
  minReputationTransfer: 15,
  goldWagerPurseMultiplier: 4, // a death match wager is a high-stakes multiple of a normal tier purse
  cooldownDays: 20,
  // Halved from 0.015: backing down from an incoming challenge now has a real cost
  // (see declineReputationPenalty* below), so the event itself needs to stay rare
  // enough that the penalty doesn't turn into a frequent, unavoidable rep drain.
  rivalChallengeDailyChance: 0.008,
  // Decline chance for the challenged side, based on the challenger's best gladiator's
  // CA versus the challenged roster's average CA. Never 0 or 1, so a bold accept or an
  // unexpected decline both stay possible at any skill gap.
  declineBaseline: 1,
  declineRatioWeight: 0.6,
  declineFloor: 0.05,
  declineCeiling: 0.92,
  // Backing down from an INCOMING challenge (the rival ludus challenged the player,
  // not the other way around) now costs real reputation -- a smaller, softer cost
  // than actually losing the death match (reputationTransferPercent/minReputationTransfer
  // above), but no longer free. Scales off the player's own current reputation, same
  // convention as the loss-transfer formula.
  declineReputationPenaltyPercent: 0.05,
  minDeclineReputationPenalty: 5,
};

export const ECONOMY = {
  startingGold: 1200,
  ludusOverheadPerBuildingLevel: 3,
  baseUpkeepPerCA: 0.35,
};

/**
 * No hard floor at zero gold: a negative balance is allowed, and staying there gets
 * progressively worse rather than being either an impossible wall or a non-issue.
 * debtWeeksActive counts consecutive weekly upkeep payments that left gold negative,
 * and resets to 0 the first week gold closes non-negative again.
 */
export const DEBT = {
  moodPenaltyFromWeek: 1,
  moodPenalty: -6,
  interestFromWeek: 2,
  weeklyInterestRate: 0.06,
  severeConsequenceFromWeek: 4,
  severeConsequenceRepeatEveryWeeks: 3,
};

/**
 * A deliberate lever, not free money: taking a loan is real debt with its own
 * compounding interest, separate from the ordinary negative-gold debt above. Only one
 * loan can be outstanding at a time (it must be fully repaid before another is taken),
 * which is what makes it "limited use" rather than an infinite tap. While gold is
 * positive, a share of it is automatically garnished toward the loan each week; if it
 * goes unpaid too long, the consequence is reputation, not gold, since the loan is
 * borrowed against the ludus's standing rather than its coffers.
 */
/**
 * Phase 8 Part H: reframed from a generic bank loan into seeking a patron/sponsor,
 * with a real collateral choice made at the time it's arranged (see
 * SponsorshipCollateral in types.ts). The old default consequence was a flat,
 * reputation-capped penalty that could hit zero and become genuinely free money --
 * replaced with a consequence tied to whatever was actually put up as collateral, so
 * it always costs something real.
 */
export const LOAN = {
  baseAmount: 150,
  amountPerReputation: 1.5,
  weeklyInterestRate: 0.08,
  // Halved from 0.5: at 50%, a player who simply fought every fight day as normal
  // cleared a typical sponsorship in ~4-4.5 weeks, comfortably inside defaultAfterWeeks
  // below -- so the collateral choice never actually mattered for anyone playing at a
  // normal pace (confirmed in playtesting). At 25%, repayment takes roughly twice as
  // long, so a normal-size sponsorship now has a real chance of crossing the default
  // threshold and the collateral choice made at signup has real stakes again.
  garnishFraction: 0.25,
  defaultAfterWeeks: 5,
  defaultRepeatEveryWeeks: 5,
  /** Building collateral: dropped by this many levels (floored at 1) each time the
   * sponsorship crosses a default threshold. */
  buildingLevelLossOnDefault: 1,
  /** Purse-cut collateral: the redirect fraction starts here on the first default and
   * climbs by purseCutIncreasePerDefault on every repeat, capped at purseCutMaxFraction. */
  purseCutStartFraction: 0.25,
  purseCutIncreasePerDefault: 0.15,
  purseCutMaxFraction: 0.65,
};

/** Selling a building level back refunds only part of what it cost, so it's a real
 * emergency lever (survive a cash crunch by deliberately downgrading) and not a way to
 * launder gold by upgrading then immediately reselling. */
export const BUILDING_SELL_REFUND_FRACTION = 0.4;

export const RECRUITMENT = {
  basePriceMultiplier: 8,
  gemPotentialBonus: 25,
};

export const POSITIVE_TRAITS: PersonalityTrait[] = ["Loyal", "Devout", "Stoic", "Vain", "Bloodthirsty", "Athletic"];
export const MAX_TRAITS_PER_GLADIATOR = 3;

/**
 * Active scouting replaces the old auto-refreshing pool: sending a hired recruiter to
 * a channel costs an upfront fee and takes days, then returns a small batch generated
 * to that channel's profile. Each channel trades cost/speed against how much you learn
 * up front, per the phase 4 spec:
 *  - Slave Market: cheap, high variance, mostly raw stock, where gems mostly hide.
 *  - Auction House: expensive, low variance, higher floor, a track record.
 *  - Volunteer Hall: a flat signing fee instead of a price, positive-trait-leaning,
 *    happier on arrival, since these are free men who chose this.
 */
export const RECRUIT_CHANNELS: Record<
  RecruitChannel,
  {
    label: string;
    description: string;
    tripCost: number;
    tripDurationDays: number;
    batchMin: number;
    batchMax: number;
    baseStat: number;
    statSpread: number;
    gemChance: number;
    priceMultiplier: number;
    flatSigningFee: boolean;
    signingFeeBase: number;
    signingFeeSpread: number;
    traitBiasPositive: boolean;
    moodBonus: number;
    recordBias: boolean;
  }
> = {
  slave_market: {
    label: "Slave Market",
    description: "Cheap and unpredictable. Mostly raw, unproven stock, but this is where a hidden gem most often turns up.",
    tripCost: 80,
    tripDurationDays: 3,
    batchMin: 3,
    batchMax: 4,
    baseStat: 14,
    statSpread: 22,
    gemChance: 0.24,
    priceMultiplier: 0.7,
    flatSigningFee: false,
    signingFeeBase: 0,
    signingFeeSpread: 0,
    traitBiasPositive: false,
    moodBonus: 0,
    recordBias: false,
  },
  auction_house: {
    label: "Auction House",
    description: "Expensive, but you know what you're getting. Higher current ability and a track record, few surprises.",
    tripCost: 260,
    tripDurationDays: 6,
    batchMin: 2,
    batchMax: 3,
    baseStat: 34,
    statSpread: 10,
    gemChance: 0.05,
    priceMultiplier: 1.8,
    flatSigningFee: false,
    signingFeeBase: 0,
    signingFeeSpread: 0,
    traitBiasPositive: false,
    moodBonus: 0,
    recordBias: true,
  },
  volunteer_hall: {
    label: "Volunteer Hall",
    description: "Free citizens chasing glory rather than property bought at a price. A signing fee instead of a purchase, and they tend to arrive in better spirits.",
    tripCost: 120,
    tripDurationDays: 4,
    batchMin: 2,
    batchMax: 4,
    baseStat: 20,
    statSpread: 16,
    gemChance: 0.09,
    priceMultiplier: 1,
    flatSigningFee: true,
    signingFeeBase: 90,
    signingFeeSpread: 60,
    traitBiasPositive: true,
    moodBonus: 15,
    recordBias: false,
  },
};

/**
 * Phase 8 Part A: a recruiter is no longer hired staff subject to the general pool's
 * availability rolls -- it's always purchasable from the Recruitment screen as a
 * one-off expedition. Tier is a separate axis from channel: channel shapes WHAT
 * profile of fighter turns up (see RECRUIT_CHANNELS), tier shapes HOW GOOD one is
 * within that profile, priced entirely upfront (trip fee + acquisition cost folded
 * into one number, see recruiterSendCost in engine/scouting.ts) so the return trip is
 * a pure keep-or-release choice with no more gold changing hands.
 */
// Phase 9 Part A: "Procurator" is flavor naming, not a historical claim the way
// "doctor" is attested for a trainer -- a reasonable general Roman term for someone
// handling business on another's behalf, standing in for the old generic "recruiter".
export const RECRUITER_TIERS: Record<RecruiterTier, { label: string; stars: number; priceMultiplier: number; baseStatBonus: number; gemChanceBonus: number }> = {
  journeyman: { label: "Journeyman Procurator", stars: 2, priceMultiplier: 1, baseStatBonus: 0, gemChanceBonus: 0 },
  seasoned: { label: "Seasoned Procurator", stars: 3.5, priceMultiplier: 1.9, baseStatBonus: 6, gemChanceBonus: 0.04 },
  master: { label: "Master Procurator", stars: 5, priceMultiplier: 3.4, baseStatBonus: 14, gemChanceBonus: 0.08 },
};

export const SPARRING = {
  // Only physical/combat stats are drilled in live sparring -- showmanship is
  // performance for a crowd, not something you train by hitting a partner.
  statPool: ["strength", "weaponSkill", "endurance"] as const,
  traitTransferChancePerDay: 0.0044, // compounds to roughly 3% over a 7-day week
  injuryChancePerDay: 0.05,
  injuryMoodPenalty: -4,
};

/**
 * Display labels only. The single source of truth for WHICH tier a given reputation
 * falls into is REPUTATION_BANDS_BY_TIER + tierForReputation() (engine/rivalLudi.ts) --
 * every screen that needs to know the active tier, including this one, resolves it
 * through that function so the tier shown never lags the tier fight days/economy
 * actually use. (Previously this table had its own, slightly different thresholds,
 * which was exactly why the top bar could show a tier one fight day before the fight
 * day itself agreed.)
 */
export const REPUTATION_TIER_LABELS: Record<FightTier, string> = {
  local: "Local Arena Bouts",
  provincial: "Provincial Games",
  rival: "Rival Ludus Challengers",
  colosseum: "The Colosseum (Imperial Games)",
};

/** Reputation at which the star display maxes out at 5. */
export const REPUTATION_STAR_SCALE_MAX = 500;

export const POTENTIAL_STAR_TIERS: { minStars: number; minPotential: number; label: string }[] = [
  { minStars: 5, minPotential: 85, label: "Colosseum Legend" },
  { minStars: 4, minPotential: 70, label: "Rising Champion" },
  { minStars: 3, minPotential: 55, label: "Provincial Contender" },
  { minStars: 2, minPotential: 40, label: "Local Circuit Fighter" },
  { minStars: 1, minPotential: 0, label: "Arena Fodder" },
];

/**
 * Phase 8 Part C: a death or escape used to vanish the gladiator from the Roster list
 * the instant it happened, easy to miss entirely between sessions. Now he stays
 * visible, greyed out and non-interactive, for at least this many days after, so the
 * player has a real chance to notice and still open his profile before he's gone.
 */
export const ROSTER_DEATH_GRACE_DAYS = 1;

export const TRAINING = {
  yardBaseRate: 0.15,
  yardLevelBonus: 0.05,
  lowMoodThreshold: 40,
  lowMoodMultiplier: 0.6,
  highMoodThreshold: 85,
  highMoodMultiplier: 1.25,
  trainerBonusPerSkillPoint: 0.006,
  balancedFocusMultiplier: 0.6,
  overtrainingChance: 0.08,
  overtrainingYardMinusQuartersThreshold: 3,
  statChangeIndicatorDays: 4,
  peakAge: 28,
  declineStartAge: 32,
  weeklyDeclineChance: 0.15,
};

export const STAFF = {
  hireCostPerSkillPoint: 12,
  salaryPerSkillPoint: 0.6,
  trueSkillMin: 25,
  trueSkillMax: 95,
  ratingNoiseMax: 2,
  poolSize: 3,
  refreshIntervalDays: 10,
  doctorRecoveryDaysPerSkillPoint: 0.02,
  doctorInjuryChanceReductionPerSkillPoint: 0.0015,
};

export const SALE = {
  instantPriceMultiplierOfCA: 6,
};

export const FIGHT_DAY = {
  intervalDays: 6,
  ludiPerTier: 3,
  rosterSizeMin: 5,
  rosterSizeMax: 8,
};

export const REPUTATION_BANDS_BY_TIER: Record<"local" | "provincial" | "rival" | "colosseum", { min: number; max: number }> = {
  local: { min: 5, max: 55 },
  provincial: { min: 65, max: 145 },
  rival: { min: 155, max: 345 },
  colosseum: { min: 355, max: 550 },
};

/**
 * See docs/difficulty-ramp.md for the diagnostic behind this: opponent CA jumped a
 * flat +15 per tier the instant reputation crossed the threshold, while organic player
 * CA growth (daily training + win showmanship, with no Training Yard upgrade or extra
 * recruit, since nothing tells a new player to prioritize either) only manages 2-5
 * points over the ~20-25 days it takes to reach that threshold, a 15-28 CA point gap.
 * Right at the floor of a new tier's reputation band, matchmaking leans on the tier
 * below instead of the new one; that blend fades out over bandFraction of the band, so
 * the jump is a ramp across roughly its first half rather than a wall at its start.
 */
export const DIFFICULTY_RAMP = {
  bandFraction: 0.5,
  maxBlendChance: 0.7,
};

/**
 * Tier-up is no longer automatic: crossing a tier's reputation threshold caps further
 * gain there and unlocks an optional Promotion Fight against the top-ranked rival
 * ludus's best gladiator in the player's CURRENT tier -- a deliberate high-stakes match
 * the player chooses when to attempt, not the moment they qualify. A win unlocks the
 * next tier for real (reputation freed from the cap, plus a real-occasion bonus on top
 * of the normal win formula); a loss costs reputation through the same margin-scaled
 * loss formula every other fight uses (the opponent's own strength already makes this
 * meaningful, no separate number needed) and starts a cooldown, so a lost attempt is a
 * setback to regroup from, not a dead end.
 */
export const PROMOTION = {
  cooldownDays: 12,
  winGoldBonusMultiplier: 2,
  winReputationBonus: 15,
};

export const SAVE_SLOT_COUNT = 3;

export const TRAINING_FOCUS_LABELS: Record<TrainingFocus, string> = {
  strength: "Strength",
  weaponSkill: "Weapon Skill",
  endurance: "Endurance",
  showmanship: "Showmanship",
  balanced: "Balanced",
  rest: "Rest",
};
