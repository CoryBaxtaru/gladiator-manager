// Central tunable config. Balance the game by editing values here, not game logic.
import type { BuildingId, BuildingMaterial, FightTier, GladiatorStats, Origin, PersonalityTrait, PhysicalTrait, RecruitChannel, RecruiterTier, SignatureTechniqueId, StatKey, TrainingFocus, WeaponType } from "./types";

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

/**
 * Phase 16 Part D: persistent rivalries. A win/loss count against a specific rival
 * ludus only becomes a felt notice ("the crowd remembers") once it crosses one of
 * these -- fired the exact fight that hits each value, not every fight after, so it
 * reads as a milestone rather than a running commentary.
 */
export const RIVALRY = {
  noticeThresholds: [3, 5, 8, 12, 20, 30, 50],
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
  // Phase 15 Part 3: strength references remapped to attack/defence now that strength
  // itself carries no clash-winning weight -- each trait keeps its original flavor
  // text and trade-off shape, just pointed at whichever new stat the description
  // actually describes (reach/power -> attack, a stable low stance -> defence).
  Tall: { description: "Reach and power at the cost of stamina.", modifiers: { attack: 3, endurance: -3 } },
  Short: { description: "Stamina and a low center of gravity at the cost of reach.", modifiers: { defence: 3, endurance: 3 } },
  Stocky: { description: "Raw power at the cost of crowd-pleasing flair.", modifiers: { attack: 3, showmanship: -2 } },
  Wiry: { description: "Speed and technique at the cost of raw power.", modifiers: { weaponSkill: 3, attack: -2 } },
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

// Phase 15 Part 3: strength leans remapped to attack (the clash-winning half of the
// old stat) -- these were always about "hits harder/charges in," which is attack's job
// now, not the stakes-only strength that remains.
export const ORIGIN_STAT_LEAN: Record<Origin, Partial<Record<"attack" | "weaponSkill" | "endurance" | "showmanship", number>>> = {
  Thracian: { weaponSkill: 4, showmanship: 2 },
  Gaul: { attack: 5 },
  Nubian: { endurance: 4, showmanship: 1 },
  Roman: { weaponSkill: 3, endurance: 2 },
  Numidian: { endurance: 5 },
  Germanic: { attack: 4, endurance: 1 },
  Syrian: { weaponSkill: 3, showmanship: 3 },
  Greek: { showmanship: 4, weaponSkill: 2 },
  // Not used by ordinary generation (Makasimus's stats are hand-set, see
  // generator.ts's maybeGenerateMakasimus) -- present only so this remains a total
  // record over Origin.
  Iberian: { attack: 2, weaponSkill: 2 },
};

/**
 * Phase 15 Part 2: a player-assignable, reassignable equipment/style choice (unlike
 * PHYSICAL_TRAITS, which are a fixed fact about the body) -- a real build decision,
 * a fixed trade-off between two stats, same convention as physical traits so the two
 * read consistently on a gladiator's sheet. Historically grounded arena archetypes,
 * picked to spread across the stat pool rather than all leaning the same axis.
 */
export const WEAPON_TYPES: Record<WeaponType, { label: string; description: string; modifiers: Partial<GladiatorStats> }> = {
  murmillo: {
    label: "Murmillo",
    description: "Gladius and a heavy rectangular shield -- a wall built for holding the line, at the cost of a quick strike.",
    modifiers: { defence: 4, attack: -2 },
  },
  retiarius: {
    label: "Retiarius",
    description: "Net and trident, no shield, no helmet -- speed and reach with nothing between him and a blade.",
    modifiers: { attack: 4, defence: -3 },
  },
  thraex: {
    label: "Thraex",
    description: "A curved Thracian sica and a small shield -- technique over brute force.",
    modifiers: { weaponSkill: 3, endurance: -2 },
  },
  dimachaerus: {
    label: "Dimachaerus",
    description: "Two blades, no shield at all -- everything staked on ending it before he's touched.",
    modifiers: { attack: 5, defence: -4 },
  },
  secutor: {
    label: "Secutor",
    description: "Built to run down a fleeing net-fighter and finish it -- brute force over flair.",
    modifiers: { strength: 3, showmanship: -2 },
  },
};

/**
 * Phase 15 Part 2: a rare, discovered "he's earned a name for this" milestone -- a
 * real stat threshold AND an earned personality trait AND the matching weapon type,
 * so it composes with Part 2's own weapon-type bonuses instead of firing coincidentally
 * on a build that doesn't fit the flavor. Checked once a fight resolves (same moment as
 * the personality-trait-unlock check); once earned it's permanent, never lost. The
 * combat edge is deliberately small -- a milestone, not a new tier of power.
 */
export const SIGNATURE_TECHNIQUES: Record<
  SignatureTechniqueId,
  {
    label: string;
    description: string;
    weaponType: WeaponType;
    statKey: StatKey;
    minStatValue: number;
    trait: PersonalityTrait;
    /** Flat bonus applied in situationalBonus to the clash this technique favors. */
    clashBonus: { clash: "attack" | "weaponSkill" | "endurance" | "showmanship" | "composite"; bonus: number };
  }
> = {
  reapers_cast: {
    label: "The Reaper's Cast",
    description: "A net-throw perfected past reflex, into reputation. Every Attack clash carries a little more menace.",
    weaponType: "retiarius",
    statKey: "attack",
    minStatValue: 80,
    trait: "Bloodthirsty",
    clashBonus: { clash: "attack", bonus: 4 },
  },
  iron_wall: {
    label: "Iron Wall",
    description: "A shield discipline the crowd has started calling by name. Nothing gets through it easily.",
    weaponType: "murmillo",
    statKey: "defence",
    minStatValue: 80,
    trait: "Stoic",
    clashBonus: { clash: "endurance", bonus: 4 },
  },
  twin_fury: {
    label: "Twin Fury",
    description: "A dual-blade flurry too fast to fully follow. The crowd has never seen its like.",
    weaponType: "dimachaerus",
    statKey: "attack",
    minStatValue: 85,
    trait: "Prideful",
    clashBonus: { clash: "composite", bonus: 5 },
  },
  butchers_mark: {
    label: "Butcher's Mark",
    description: "A finishing style earned a reputation of its own -- and a name to go with it.",
    weaponType: "secutor",
    statKey: "strength",
    minStatValue: 80,
    trait: "Bloodthirsty",
    clashBonus: { clash: "composite", bonus: 4 },
  },
  featherfoot: {
    label: "Featherfoot",
    description: "Footwork sharp enough that the crowd started chanting for it by name.",
    weaponType: "thraex",
    statKey: "weaponSkill",
    minStatValue: 85,
    trait: "Athletic",
    clashBonus: { clash: "weaponSkill", bonus: 4 },
  },
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
  // Phase 15 Part 3: defence is a passive per-clash modifier, not a clash of its own --
  // it reduces what the OPPONENT effectively rolls against THIS gladiator, every
  // clash, same asymmetric "only the player's side is modeled this deeply" convention
  // already used for mood/trait/building bonuses in situationalBonus. Capped well
  // short of 100% so a heavily-armored fighter is much harder to beat clean, never
  // literally unbeatable.
  defenceMitigationPerPoint: 0.006,
  defenceMitigationMax: 0.4,
  baseInjuryChanceOnLoss: 0.35,
  // Death used to be gated behind this (chance of dying ONLY once already
  // gravely-injured) -- superseded by the direct DEATH_ON_DEFEAT roll, see its doc
  // comment for why the old chained version diluted to under 1% in practice.
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

/**
 * Phase 12 Part A diagnostic: the old death-on-defeat path chained THREE independent
 * rolls -- injury happens (~25-35% after infirmary/doctor), THEN severity rolls
 * "gravely_injured" (~15-32% of that, worse at high margin), THEN a separate death
 * roll off baseDeathChanceOnGraveInjury (~10-12% of THAT, reduced further by
 * infirmary/doctor). Multiplied out, the real chance of dying on an ordinary loss came
 * out under 1% in practice (roughly 0.3%-0.8% depending on infirmary/doctor level),
 * nowhere near the "12%" a reader would assume from the headline number -- the same
 * multiplicative-stacking failure mode this project already hit once with mood/
 * showmanship modifiers. Death is now a single, direct roll on any loss (not gated
 * behind injury-happens or severity first), with a real ~20% baseline that additive
 * modifiers can shift by double digits but can never chain down to near-zero. See
 * combat.ts's resolveFight and the new sponsor-or-let-die choice in applyCombatResultToGladiator.
 */
export const DEATH_ON_DEFEAT = {
  baseChance: 0.2,
  minChance: 0.05,
  maxChance: 0.6,
  infirmaryReductionPerLevel: 0.02,
  doctorSkillReduction: 0.0012,
  // A clean-sweep loss is worse odds than a narrow one.
  marginBonus: 0.15,
  // Prideful refuses to yield even in a losing fight -- raises death/injury risk, per
  // its own description; Coward flees/yields early -- survives more.
  pridefulBonus: 0.06,
  cowardReduction: 0.08,
};

/**
 * Phase 15 Part 3: strength's actual job -- stakes, not win-rate. A powerful OPPONENT
 * makes losing to him more dangerous (worse injuries, a real bump to death chance);
 * this gladiator's OWN strength makes his decisive wins pay out better (a "that was a
 * brutal, memorable win" bonus, scaled by margin so a narrow win doesn't trigger it).
 * Deliberately not double-applied to both directions on the same fighter -- only the
 * opponent's strength matters on a loss, only this gladiator's own strength matters on
 * a win, so the two effects can't stack on one person in one fight.
 */
export const STRENGTH_STAKES = {
  opponentSeverityPerPoint: 0.003, // added to the severity roll on a loss
  opponentDeathChancePerPoint: 0.0015, // added straight to DEATH_ON_DEFEAT's chance
  ownRewardBonusPerPoint: 0.003, // reputation/gold multiplier on a win, scaled by margin
};

/**
 * Phase 13 Part A diagnostic: the Phase 12 formula (CA * 8 * tierMultiplier) double-
 * counted tier the same way the Phase 11 reputation-loss bug did -- a gladiator's CA
 * already climbs as the tier does (roster development IS what lets a player reach a
 * tier), so multiplying by tierMultiplier on top charged for the same signal twice.
 * Reusing the Phase 5 economy-rebalance reference (docs/economy-rebalance.md): a
 * 5-gladiator CA-25 roster at Local tier targets ~205g/week income against a 186g/week
 * burn -- treasury stays in the low hundreds by design, it's not meant to pile up.
 * Income scales by tierMultiplier (basePurse does), so a comparable roster's target
 * income is roughly 205g at Local, ~510g at Provincial, ~1020g at Rival -- but the OLD
 * formula's cost at CA 25 was 200g / 500g / 1000g at those same tiers respectively
 * BEFORE even accounting for the CA a fighter actually reaches by the time a ludus is
 * playing at that tier (30+ at Rival per PROMOTION_READINESS), which pushed real costs
 * to 1200g+ against that same ~1020g/week income. Empirically (Round 6 playtest, Rival
 * tier): sponsoring was asked for 3 times, cost 960g/1520g/1080g against a treasury
 * that ranged 353g-993g the whole session -- unaffordable in all three real cases, for
 * fighters ranging from a barely-trained CA 24 recruit to a middling CA 38 veteran.
 *
 * Fix: drop the redundant tierMultiplier entirely -- CA alone already reflects
 * development, tier doesn't need to scale it again. Retuned costPerCA so a fighter's
 * cost lands well inside a typical same-tier treasury instead of consuming most or all
 * of it: CA 25 -> 250g, CA 38 -> 380g, CA 50 -> 500g, CA 70 -> 700g. Real money (roughly
 * 1-2 weeks of Local-tier burn even at the high end), but no longer unaffordable by
 * default regardless of who it is.
 */
export const SPONSOR_SURVIVAL = {
  costPerCA: 10,
};

/**
 * Phase 12 Part G: an injured gladiator carries a chance to flat-out miss a clash --
 * an automatic loss of that clash regardless of the stat comparison -- on top of the
 * existing flat stat penalty in situationalBonus (combat.ts). Scales with severity, and
 * feeds naturally into estimateWinChance/WinChanceBadge since it lives inside the same
 * resolveFight() every trial already runs.
 */
export const INJURY_MISS_CHANCE: Partial<Record<"bruised" | "injured" | "gravely_injured", number>> = {
  bruised: 0.04,
  injured: 0.1,
  gravely_injured: 0.22,
};

/**
 * Phase 12 Part I (exploratory): a stat pulled far ahead of a gladiator's other three
 * trains more slowly -- both from deliberate training and from combat-driven
 * showmanship gains -- so growth naturally rebalances toward an even spread rather than
 * compounding an existing skew. `tolerance` is how far a stat can lead the average of
 * the other three before any penalty applies; past that, effectiveness drops off but
 * never to zero (minMultiplier), so an extreme runaway stat still creeps, just slowly.
 */
export const STAT_SPREAD_PENALTY = {
  tolerance: 12,
  penaltyPerPoint: 0.03,
  minMultiplier: 0.15,
};

export const CLASH_LABELS: Record<"attack" | "weaponSkill" | "endurance" | "showmanship" | "composite", string> = {
  attack: "Attack clash",
  weaponSkill: "Weapon skill clash",
  endurance: "Endurance clash",
  showmanship: "Showmanship clash",
  composite: "Overall prowess clash",
};

/**
 * Phase 16 Part E: what each stat actually does mechanically, honestly, for the Squad
 * screen's stat tooltips and the Training screen's trainer descriptions -- Strength
 * especially, since Phase 15's Attack/Strength/Defence split left it with no clash of
 * its own, which reads as "why does this stat exist" without an explanation. Defence
 * is similarly easy to misread as a clash stat when it's a passive mitigation instead.
 */
export const STAT_DESCRIPTIONS: Record<StatKey, string> = {
  attack: "Wins or loses the Attack clash directly, and feeds into the blended Overall Prowess clash at the end of a fight.",
  strength:
    "Not rolled in any clash. A gladiator's own Strength earns a bigger gold/reputation payout on a decisive win. A tougher OPPONENT's Strength is what makes losing to him worse -- more severe injuries, higher death risk.",
  defence: "Never rolled for its own clash. Instead, passively reduces what an opponent effectively rolls against him in every single clash of the fight.",
  weaponSkill: "Wins or loses the Weapon Skill clash directly, and weighs heaviest in the blended Overall Prowess clash at the end of a fight.",
  endurance: "Wins or loses the Endurance clash directly, and also feeds into the blended Overall Prowess clash.",
  showmanship: "Wins or loses the Showmanship clash directly. Also grows on its own from winning fights and crowd-pleasing personality traits.",
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

/**
 * Phase 12 Part C: a second, self-directed Challenge mode alongside the lethal
 * ludus-vs-ludus death match above -- the player picks one of their own gladiators and
 * an opponent is generated scaled around THAT gladiator's own current ability (with
 * real random spread, not a fixed even matchup), rather than being limited to
 * challenging a specific higher-reputation rival ludus's champion. Non-lethal (reuses
 * the ordinary resolveFight path, same as a fight day), so it also
 * doubles as the primary fix for Part D: a way to arrange a winnable, appropriately-
 * scaled match for a freshly recruited gladiator well below the roster's current tier.
 */
export const SELF_CHALLENGE = {
  // Symmetric random spread around the gladiator's own CA -- sometimes favorable,
  // sometimes a real risk, never a guaranteed win.
  opponentSpread: 16,
  // The opponent's average is shaded a little below the gladiator's own CA so this
  // reads as "a winnable match you arranged", not just another coin flip.
  opponentCAOffset: -6,
  cooldownDays: 3,
};

export const ECONOMY = {
  startingGold: 1200,
  ludusOverheadPerBuildingLevel: 3,
  baseUpkeepPerCA: 0.35,
};

/**
 * Phase 10 Part A: a soft cap, not a hard block -- going over Barracks capacity
 * (see rosterCapacity() in engine/buildings.ts) is always allowed, it just costs more
 * to sustain, so a player who overextends feels it in the weekly upkeep bill rather
 * than being told no.
 */
export const ROSTER_OVER_CAPACITY_UPKEEP_MULTIPLIER = 1.5;

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
 * Phase 14 Part B diagnostic: weeklyInterestRate compounds directly on the current
 * negative balance with no cap, and the only counterweight is the severe consequence
 * above (seize a gladiator, or a staff member quits) -- which correctly refuses to
 * touch the last active gladiator (the same soft-lock floor used everywhere else) or
 * a staff roster that's already empty. Once BOTH are true, applySevereConsequence had
 * nothing left to seize and became a permanent no-op: nothing in the system ever
 * shrinks the balance again, while interest keeps compounding on it forever.
 *
 * That "nothing left to seize" moment, not any particular gold amount, is the actual
 * point of no return -- diagnosed against the Round 7 playtest, where it hit with the
 * balance only a few thousand gold negative, and 1500+ days of a single CA45 fighter
 * (an 86% win rate, ~300-500g a fight every 6 days) against ~325g/week in fixed
 * upkeep never closed the gap: once income-minus-upkeep is smaller than 6% of the
 * outstanding balance, the balance can only grow, and it had already compounded past
 * -2.5 MILLION gold with zero mathematical path back by the time the playtest report
 * was written. A magnitude threshold would have to be guessed and re-guessed for
 * every roster size; the seize-check already knows precisely when recovery stops
 * being possible, so bankruptcy triggers there instead of the old no-op.
 *
 * Bankruptcy is a real, felt reset, not an escape hatch: the debt is wiped, but
 * reputation is cut back to the current tier's own floor (the same "you've dropped to
 * just barely qualifying" feeling a bad losing streak already produces) and every
 * building loses a level, mirroring the loan-collateral consequence elsewhere. It can
 * happen more than once in a game, same as EU4's bankruptcy -- mismanage it again and
 * it hits again.
 */
export const BANKRUPTCY = {
  buildingLevelLoss: 1,
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
  // Phase 10 Part B: halved from 8. At 8, recruiter trips cost 2-30 WEEKS of a typical
  // roster's income (see docs/economy-rebalance.md's methodology) -- recruiting read as
  // a punishing setback rather than a considered investment. Retuned alongside the
  // channel priceMultipliers below to land in roughly 1-11 weeks depending on tier/channel.
  basePriceMultiplier: 4,
  gemPotentialBonus: 25,
  /** "Sell him on" a returned candidate instead of a plain release: a partial refund
   * of the per-candidate share of what the trip cost, softening the single-upfront-
   * payment model's risk without undoing it -- the ludus still doesn't get a full
   * refund, just isn't left with nothing for an unwanted candidate. */
  sellOnRefundFraction: 0.4,
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
    // Phase 10 Part B: 0.7 -> 0.6, alongside RECRUITMENT.basePriceMultiplier's halving.
    priceMultiplier: 0.6,
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
    // Phase 10 Part B: 1.8 -> 0.7. This was the worst offender -- Master tier alone
    // cost ~30 weeks of a typical roster's income at the old value.
    priceMultiplier: 0.7,
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
    // Phase 10 Part B: 120 -> 60. This channel's flat signing fee never routed through
    // RECRUITMENT.basePriceMultiplier, so halving that alone left it untouched --
    // needed its own retuning to land in the same 1-9 week range as the other channels.
    tripCost: 60,
    tripDurationDays: 4,
    batchMin: 2,
    batchMax: 4,
    baseStat: 20,
    statSpread: 16,
    gemChance: 0.09,
    priceMultiplier: 1,
    flatSigningFee: true,
    signingFeeBase: 50,
    signingFeeSpread: 40,
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
/**
 * Phase 12 Part K diagnostic: checked whether a separate promotion-tier-based scaling
 * of recruit quality exists alongside procurator tier -- it does not. generateCandidate
 * (scouting.ts) never reads state.unlockedTier or state.reputation; baseStat/gemChance
 * come ONLY from the channel (RECRUIT_CHANNELS) and procurator tier (here), flat for
 * the whole game. The only thing that scales with unlockedTier is COST
 * (tierCostMultiplier, via recruiterSendCost) -- so the reported "procurator tier feels
 * pointless" wasn't recruit quality secretly following promotion tier, it was the old
 * flat baseStatBonus (0/+6/+14) staying a small ABSOLUTE amount while its COST
 * multiplied 1x/1.9x/3.4x on top of the tier cost multiplier: at Colosseum tier, Master
 * cost several times more for a bonus that had shrunk to a rounding error against the
 * roster/opponent CA the player actually needed. Changed baseStatBonus to a fraction OF
 * the channel's own baseStat, so a tier's edge stays proportionally meaningful at every
 * stage instead of being a fixed number that's diluted by everything else that scales.
 * (Recruits themselves still don't scale with promotion tier at all -- a separate,
 * bigger balance question flagged in Part J's note, not decided here.)
 */
export const RECRUITER_TIERS: Record<RecruiterTier, { label: string; stars: number; priceMultiplier: number; baseStatBonusFraction: number; gemChanceBonus: number }> = {
  journeyman: { label: "Journeyman Procurator", stars: 2, priceMultiplier: 1, baseStatBonusFraction: 0, gemChanceBonus: 0 },
  seasoned: { label: "Seasoned Procurator", stars: 3.5, priceMultiplier: 1.9, baseStatBonusFraction: 0.22, gemChanceBonus: 0.04 },
  master: { label: "Master Procurator", stars: 5, priceMultiplier: 3.4, baseStatBonusFraction: 0.45, gemChanceBonus: 0.08 },
};

export const SPARRING = {
  // Only physical/combat stats are drilled in live sparring -- showmanship is
  // performance for a crowd, not something you train by hitting a partner. Phase 15
  // Part 3: attack/strength/defence all qualify the same way strength used to.
  statPool: ["attack", "strength", "defence", "weaponSkill", "endurance"] as const,
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

/**
 * Phase 15 Part 1: a fourth exit alongside die/escape/sold -- no gold changes hands
 * either way, he's not being hired, he's the ludus's own property repurposed. Eligible
 * once age-declined (same declineStartAge as the existing stat-decline system, a
 * fighter this old is already fading in the arena) OR, if the player wants to retire a
 * younger fighter early, once he's proven himself with enough career wins.
 *
 * trueSkill derives from his single best CURRENT stat (that's his specialty), scaled
 * DOWN rather than 1:1 -- deliberately a bargain, not a pure steal: being a great
 * fighter doesn't automatically make someone a great teacher, and a straight transfer
 * would make "retire your best fighter into staff" a dominant, no-cost strategy. Still
 * clearly worth doing (free plus meaningfully skilled), just not as strong as paying
 * full price for an equivalently-rated recruit would otherwise buy.
 */
export const RETIREMENT = {
  minAge: 32,
  provenWinsThreshold: 15,
  trueSkillTransferFraction: 0.75,
};

/**
 * Phase 12 Part B diagnostic: checked whether a trainer's trueSkill is ever mutated
 * after generateStaff() assigns it -- it isn't (grepped every reference; the only other
 * reads are display fuzz on ratingNoiseSeed, which sharpens the DISPLAYED guess as
 * reputation grows without touching the underlying true value, same mechanic as
 * Potential Ability's fuzzy display). So there was no drift bug to remove; a trainer's
 * true skill is already fixed for life at hire, same as an EU4 advisor. What WAS
 * missing: a trainer only ever helped his own single specialty stat, with no way for a
 * highly skilled one to do more. Coverage now scales with trueSkill -- a weak trainer
 * still covers just his specialty, a top one covers two or three stats, cycling
 * forward from his specialty through the fixed stat order below.
 */
export const TRAINER_STAT_COVERAGE_TIERS: { minSkill: number; statCount: number }[] = [
  { minSkill: 75, statCount: 3 },
  { minSkill: 50, statCount: 2 },
  { minSkill: 0, statCount: 1 },
];

export const SALE = {
  instantPriceMultiplierOfCA: 6,
  // Phase 12 Part H: auction is a real gamble around the instant-sell value, not a
  // strictly-better or strictly-worse option -- risk in both directions.
  auctionMinFraction: 0.55,
  auctionMaxFraction: 1.7,
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

/**
 * Phase 11 Part C: the reputation cap alone doesn't check readiness -- a win streak
 * against a softened early-tier matchup (see docs/difficulty-ramp.md) can hit it
 * without the player ever touching Training, Recruitment, or the Ludus screen.
 * Playtesting showed the same roster re-hitting the next cap 6-10 days after a
 * promotion, no roster growth or building investment in between. This gate requires
 * BOTH a minimum average building level and a minimum average active-roster Current
 * Ability, keyed by the tier being entered, alongside (not instead of) the existing
 * reputation cap -- reputation says "you've been winning", this says "you're actually
 * built for what's next." The "local" entry is unused (nextTierOf never returns it as
 * a target) but present so the lookup stays a total function.
 */
export const PROMOTION_READINESS: Record<FightTier, { minAvgBuildingLevel: number; minAvgRosterCA: number }> = {
  local: { minAvgBuildingLevel: 0, minAvgRosterCA: 0 },
  provincial: { minAvgBuildingLevel: 1.3, minAvgRosterCA: 18 },
  rival: { minAvgBuildingLevel: 2, minAvgRosterCA: 30 },
  colosseum: { minAvgBuildingLevel: 3, minAvgRosterCA: 42 },
};

/**
 * Phase 16 Part G: the readiness gate above only ever checks ONE moment -- the instant
 * a Promotion Fight is attempted. Nothing rechecked it afterward, so a ludus could
 * clear the bar once, then sell off buildings or coast on an aging roster forever at
 * the tier it bought with that one good stretch. This is the ongoing version: checked
 * weekly (see engine/tierNeglect.ts) against the SAME PROMOTION_READINESS numbers that
 * got the ludus into its current tier, but softened by sustainFraction -- a temporary
 * dip below the entry bar (a sold building, a rough training week) shouldn't cost a
 * gladiator; only genuinely coasting for graceWeeks straight does.
 *
 * The consequence is a rival poaching whichever active gladiator is worst-off relative
 * to the tier (mood-neglected first -- see mood.ts's riskTagFor -- else simply the
 * lowest Current Ability), never the roster's last fighter. A one-gladiator roster
 * (nothing poachable) falls back to a real demotion instead, so a min-maxed roster
 * can't sit at a tier it can't sustain with total impunity either way.
 */
export const TIER_NEGLECT = {
  sustainFraction: 0.7,
  graceWeeks: 4,
  warnAtWeek: 3,
  cooldownWeeksAfterConsequence: 8,
  poachingReputationPenalty: 10,
};

export const SAVE_SLOT_COUNT = 3;

export const TRAINING_FOCUS_LABELS: Record<TrainingFocus, string> = {
  attack: "Attack",
  strength: "Strength",
  defence: "Defence",
  weaponSkill: "Weapon Skill",
  endurance: "Endurance",
  showmanship: "Showmanship",
  balanced: "Balanced",
  rest: "Rest",
};

/**
 * Phase 12 Part L: a genuine capstone once the player has both reached Colosseum tier
 * AND maxed its reputation band -- a squad matching the size of the active roster,
 * each opponent significantly stronger than an ordinary Colosseum-tier fighter. Reuses
 * the ordinary (non-lethal) resolveFight path per gladiator, same reasoning as
 * Promotion Fight: the stakes come from the opponents' own strength and the occasion
 * framing, not from a separate permadeath rule bolted on top.
 */
export const COLOSSEUM_FINALE = {
  opponentCAMultiplier: 1.45,
  opponentStatSpread: 12,
  cooldownDays: 15,
  winGoldBonus: 4000,
  winReputationBonus: 40,
};

/**
 * Phase 12 Part O: an ultra-rare (1 in 10000) unique gladiator who can turn up from any
 * recruiting channel, at any procurator tier -- a small easter egg, not a balance
 * lever. Historically, "Iberia" in the Caucasus (roughly modern Georgia, distinct from
 * the Iberian Peninsula) was a real kingdom with attested contact with Rome; the name
 * "Makasimus" is a Latinized flourish rather than an attested Caucasian name, same
 * spirit as an arena name assigned on enrolment.
 */
export const MAKASIMUS = {
  chance: 1 / 10000,
  name: "Makasimus",
  minStat: 78,
  statSpread: 14,
  minPotential: 95,
};
