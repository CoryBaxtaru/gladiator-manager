// Core data model types for Gladiator Ludus Manager

export type PersonalityTrait =
  | "Prideful"
  | "Stoic"
  | "Volatile"
  | "Bloodthirsty"
  | "Coward"
  | "Loyal"
  | "Greedy"
  | "Devout"
  | "Vain"
  | "Brooding"
  | "Athletic"
  | "Gluttonous";

/**
 * Physical build, assigned at generation and fixed for life -- a fact about the
 * gladiator's body, not something earned. Each carries a fixed attribute trade-off
 * (see PHYSICAL_TRAITS in config.ts).
 */
export type PhysicalTrait = "Tall" | "Short" | "Stocky" | "Wiry";

export type Origin =
  | "Thracian"
  | "Gaul"
  | "Nubian"
  | "Roman"
  | "Numidian"
  | "Germanic"
  | "Syrian"
  | "Greek"
  /**
   * Not part of the normal generation pool (see pickOrigin() in engine/names.ts) --
   * reserved for the ultra-rare Makasimus easter egg (Phase 12 Part O). No sprite art
   * exists for this origin, so he displays with the Greek portrait set (Caucasian
   * Iberia had real Hellenistic cultural ties) while his name and backstory are
   * explicit that he's from Iberia in the Caucasus, roughly modern Georgia -- not the
   * Iberian Peninsula.
   */
  | "Iberian";

export type GladiatorCondition =
  | "healthy"
  | "bruised"
  | "injured"
  | "gravely_injured";

export type GladiatorStatus = "active" | "dead" | "escaped" | "sold" | "retired";

export type TrainingFocus =
  | "attack"
  | "strength"
  | "defence"
  | "weaponSkill"
  | "endurance"
  | "showmanship"
  | "balanced"
  | "rest";

export interface MoodModifier {
  id: string;
  source: string;
  magnitude: number;
  /** currentDay on which this modifier expires and is removed */
  expiresOnDay: number;
}

/**
 * Phase 15 Part 3: `strength` split into three, replacing the single stat that used to
 * do double duty as "the 4th equally-weighted clash stat." Diagnosed first (see
 * engine/combat.ts's doc comments): the old strength was just another symmetric clash
 * axis, no different in kind from weaponSkill/endurance. The split gives each piece a
 * genuinely distinct job instead of three names for the same thing:
 * - `attack` takes over strength's old clash slot 1:1 (same symmetric roll-off, same
 *   composite weight) -- decides whether a clash is WON.
 * - `defence` is new: a passive per-clash modifier that reduces what the OPPONENT
 *   effectively rolls against this gladiator (see situationalBonus/opponent
 *   mitigation in combat.ts) -- decides how hard this gladiator is to beat.
 * - `strength` keeps its name but gets no clash at all -- it scales the STAKES once a
 *   result is already decided (the opponent's strength worsens injury/death odds on a
 *   loss, this gladiator's own strength adds a reward bonus on a decisive win). A
 *   third symmetric clash stat would have been redundant with attack; this isn't.
 */
export interface GladiatorStats {
  attack: number;
  strength: number;
  defence: number;
  weaponSkill: number;
  endurance: number;
  showmanship: number;
}

export type StatKey = keyof GladiatorStats;

/**
 * Phase 15 Part 2: a player-assignable equipment/style choice, reassignable like
 * training focus rather than fixed at generation like PhysicalTrait -- a ludus can
 * re-arm a fighter as its needs change, it's not a fact about his body. Each type
 * leans a fixed pair of stats (see WEAPON_TYPES in config.ts), a real build decision,
 * not flavor. Historically grounded arena archetypes.
 */
export type WeaponType = "murmillo" | "retiarius" | "thraex" | "dimachaerus" | "secutor";

/**
 * Phase 15 Part 2: a rare, discovered "he's earned a name for this" milestone -- once
 * earned it's permanent, same spirit as an earned personality trait. Requires a stat
 * threshold, a personality trait, AND (to make weapon choice and technique compose
 * instead of coincide) the matching weapon type. See SIGNATURE_TECHNIQUES in config.ts.
 */
export type SignatureTechniqueId =
  | "reapers_cast"
  | "iron_wall"
  | "twin_fury"
  | "butchers_mark"
  | "featherfoot";

export interface StatChangeMarker {
  stat: StatKey;
  delta: number;
  expiresOnDay: number;
}

export interface GladiatorRecord {
  fights: number;
  wins: number;
  losses: number;
  nearDeaths: number;
}

export type PotentialRevealState = "range" | "exact";

export interface Gladiator {
  id: string;
  /** Display name. Normally the arena name -- that is what the crowd knows him by. */
  name: string;
  /**
   * The name he was born with, authentic to his culture. Optional so saves written
   * before the name rework still load; fall back to `name` when absent.
   */
  birthName?: string;
  /** The single Latin or Greek name assigned on enrolment. */
  arenaName?: string;
  age: number;
  origin: Origin;
  backstory: string;
  /** Body-type archetype, fixed at generation. See PHYSICAL_TRAITS in config.ts. */
  physicalTrait: PhysicalTrait;
  personalityTraits: PersonalityTrait[];
  mood: number;
  moodModifiers: MoodModifier[];
  /**
   * Current Ability is NOT stored here -- it's derived live from `stats` (clamped to
   * potentialAbility) via currentAbilityOf() in engine/rating.ts, everywhere it's
   * displayed or used. See Phase 8 Part D: a separately-tracked number could drift out
   * of sync with the attributes it's supposed to represent.
   */
  potentialAbility: number;
  potentialRevealed: PotentialRevealState;
  stats: GladiatorStats;
  condition: GladiatorCondition;
  record: GladiatorRecord;
  weeklyUpkeep: number;
  status: GladiatorStatus;
  /** currentDay a death or escape happened, so the Roster list can keep showing him
   * greyed out for a grace period instead of vanishing the instant it occurs. Null
   * otherwise. */
  statusChangedOnDay: number | null;
  trainingFocus: TrainingFocus;
  /** days remaining unavailable due to injury */
  injuryDaysRemaining: number;
  /** true while a "hot streak" temporary bonus is active */
  hotStreakUntilDay: number | null;
  hireDay: number;
  recentStatChanges: StatChangeMarker[];
  lastMoraleEventDay: number | null;
  lastRitualDay: number | null;
  lastBonusCutDay: number | null;
  lastPrideBoastDay: number | null;
  lastEncouragementDay: number | null;
  lastLeaveDay: number | null;
  lastBathsDay: number | null;
  lastRecognitionDay: number | null;
  /** Cooldown gate for the self-directed Reputation Challenge mode (Phase 12 Part C). */
  lastSelfChallengeDay: number | null;
  /**
   * Set when an ordinary (non-death-match) defeat would have killed him (see
   * DEATH_ON_DEFEAT in config.ts) -- instead of resolving silently, he's held here,
   * gravely wounded but still nominally active, until the player chooses to sponsor
   * his survival for a gold cost or let him die (Phase 12 Part A). Optional so saves
   * written before this existed still load; absent/false both read as "no decision
   * pending".
   */
  awaitingFateDecision?: boolean;
  /** Phase 15 Part 2: player-assignable, reassignable any time from Training. Optional
   * so pre-existing saves default sensibly (see saveManager's normalizeState) rather
   * than crash. */
  weaponType?: WeaponType;
  /** Phase 15 Part 2: null until earned, permanent once set. Optional for the same
   * pre-existing-save reason as weaponType. */
  signatureTechnique?: SignatureTechniqueId | null;
  /**
   * Fixed random offset assigned at generation, used to fuzz the displayed Potential
   * Ability star rating the same way a trainer's displayed rating is fuzzed. Optional
   * so saves written before this existed still load (falls back to a stable value
   * derived from id).
   */
  potentialNoiseSeed?: number;
  /** id of the gladiator currently paired with for sparring, if any. Always mutual. */
  sparringPartnerId: string | null;
}

export type BuildingId =
  | "training_yard"
  | "barracks"
  | "infirmary"
  | "armory"
  | "arena"
  | "quarters"
  | "gate";

export type BuildingMaterial =
  | "wood"
  | "wood_clay"
  | "stone"
  | "stone_marble";

export interface Building {
  level: number;
  material: BuildingMaterial;
  baseCost: number;
  costGrowth: number;
  upkeepPerLevel: number;
}

export interface BuildQueueItem {
  buildingId: BuildingId;
  targetLevel: number;
  startedOnDay: number;
  completesOnDay: number;
}

/**
 * What the player puts on the line when arranging a sponsorship (Phase 8 Part H):
 * a specific building, which drops a level if the debt goes unresolved too long, or a
 * cut of future fight purses redirected to the sponsor until it's repaid. Ties the
 * default consequence to something the player actually cares about losing, instead of
 * the old flat reputation penalty that could bottom out at zero cost.
 */
export type SponsorshipCollateral = { type: "building"; buildingId: BuildingId } | { type: "purseCut" };

export type FightTier = "local" | "provincial" | "rival" | "colosseum";

export interface CombatLogRound {
  round: number;
  text: string;
}

export type FightOutcome = "win" | "loss" | "draw";

export interface CombatResult {
  fightId: string;
  gladiatorId: string;
  gladiatorName: string;
  opponentName: string;
  rivalLudusName: string;
  tier: FightTier;
  outcome: FightOutcome;
  /** clashes won minus clashes lost, magnitude drives reward/injury/mood scaling */
  margin: number;
  log: CombatLogRound[];
  goldReward: number;
  /** Can be negative on a loss: a decisive defeat now costs real reputation, not just
   * a smaller gain, distinct from the gold consolation which stays positive. */
  reputationReward: number;
  injury: GladiatorCondition | null;
  died: boolean;
  showmanshipGain: number;
  isDeathMatch: boolean;
}

/** An ephemeral matchup built for a fight day, not stored in game state. */
export interface FightMatchup {
  id: string;
  gladiatorId: string;
  tier: FightTier;
  opponentName: string;
  opponentPowerLevel: number;
  opponentStats: GladiatorStats;
  rivalLudusName: string;
}

export type RecruitChannel = "slave_market" | "auction_house" | "volunteer_hall";

/**
 * A recruiting expedition's quality tier, separate from channel: channel shapes WHAT
 * kind of fighter turns up, tier shapes HOW GOOD one is within that profile. Always
 * purchasable from the Recruitment screen, unlike the old staff-pool-gated recruiter.
 */
export type RecruiterTier = "journeyman" | "seasoned" | "master";

export interface RecruitCandidate {
  id: string;
  gladiator: Gladiator;
  channel: RecruitChannel;
  /** Partial refund for "sell him on" instead of a plain release -- a share of what
   * this candidate's slot in the batch cost, see engine/scouting.ts. */
  refundValue: number;
}

export interface RecruiterTrip {
  id: string;
  tier: RecruiterTier;
  /** Flavor only -- the scout sent isn't a persistent hired Staff member. */
  recruiterName: string;
  channel: RecruitChannel;
  sentOnDay: number;
  returnsOnDay: number;
  /** What was actually paid upfront to send this trip -- carried through so the batch
   * it returns can offer a partial refund ("sell him on") per candidate. */
  costPaid: number;
}

export interface SummaryEntry {
  category: "training" | "building" | "upkeep" | "mood" | "fight" | "event" | "recruitment" | "staff";
  text: string;
}

export interface DaySummary {
  day: number;
  entries: SummaryEntry[];
  combatResults: CombatResult[];
}

export type StaffRole = "trainer" | "doctor";

export interface Staff {
  id: string;
  role: StaffRole;
  name: string;
  /** only meaningful for trainers */
  specialty: Exclude<TrainingFocus, "balanced" | "rest"> | null;
  trueSkill: number;
  /** fixed random offset assigned at generation, shrinks toward zero as reputation grows */
  ratingNoiseSeed: number;
  weeklySalary: number;
  hireDay: number;
  /**
   * Phase 15 Part 1: set when this trainer is a retired gladiator repurposed onto
   * staff rather than recruited from the hiring pool -- purely a record for flavor/UI
   * ("this trainer used to fight"), doesn't change how he functions. Optional so
   * ordinary recruited staff (the overwhelming majority) don't carry a meaningless
   * null around; absent reads as "recruited normally."
   */
  retiredGladiatorName?: string;
}

export interface StaffCandidate {
  id: string;
  staff: Staff;
  hireCost: number;
}

export interface RivalGladiator {
  id: string;
  name: string;
  origin: Origin;
  currentAbility: number;
  stats: GladiatorStats;
  potentialAbility: number;
  potentialNoiseSeed: number;
  physicalTrait: PhysicalTrait;
  personalityTraits: PersonalityTrait[];
  backstory: string;
}

export interface RivalLudus {
  id: string;
  name: string;
  tier: FightTier;
  reputation: number;
  facilityLevel: number;
  roster: RivalGladiator[];
}

export type SaleType = "instant" | "auction";

export interface DeathMatchCooldown {
  rivalLudusId: string;
  cooldownUntilDay: number;
}

/** An incoming challenge from a rival ludus, awaiting the player's accept/decline. */
export interface PendingDeathMatchChallenge {
  id: string;
  rivalLudusId: string;
  rivalLudusName: string;
  offeredOnDay: number;
}

export interface DeathMatchOutcome {
  declined: boolean;
  /** Only meaningful when declined is true: who backed down -- the rival declining
   * the player's own issued challenge, or the player declining an incoming one. The
   * two read very differently ("they backed down" vs "you backed down") and only the
   * latter now costs reputation. */
  declinedBy?: "player" | "rival";
  rivalLudusName: string;
  combat?: CombatResult;
  reputationTransferred?: number;
  goldDelta?: number;
  /**
   * "ludus" (default when absent, for back-compat with existing callers) is the
   * original lethal ludus-vs-ludus death match. "self" is the Phase 12 Part C
   * self-directed mode: a non-lethal, self-arranged bout for a specific gladiator
   * against a generated opponent scaled to his own level, used to shift the result
   * modal's framing (no "the loser dies" language) since it reuses the same outcome
   * shape rather than duplicating the whole result-display path.
   */
  mode?: "ludus" | "self";
  /** Phase 16 Part A: set when this bout is also the exact fight a signature technique
   * was earned in, same named-moment treatment the ordinary fight-day path already gets. */
  techniqueAnnouncement?: string | null;
}

/** Result of a Promotion Fight attempt (see engine/promotion.ts). */
export interface PromotionOutcome {
  won: boolean;
  combat: CombatResult;
  newTier: FightTier | null;
  cooldownUntilDay: number | null;
  /** Phase 16 Part A: see DeathMatchOutcome.techniqueAnnouncement. */
  techniqueAnnouncement?: string | null;
}

export interface LudusState {
  gold: number;
  reputation: number;
  currentDay: number;
  buildings: Record<BuildingId, Building>;
  buildQueue: BuildQueueItem[];
  overextendedUntil: number | null;
  recentBuildStarts: number[];
  gladiators: Gladiator[];
  staff: Staff[];
  staffPool: StaffCandidate[];
  staffPoolRefreshedOnDay: number;
  rivalLudi: RivalLudus[];
  nextFightDay: number;
  deathMatchCooldowns: DeathMatchCooldown[];
  pendingDeathMatchChallenge: PendingDeathMatchChallenge | null;
  recruitPool: RecruitCandidate[];
  recruiterTrip: RecruiterTrip | null;
  /** Consecutive weeks the weekly upkeep payment has left gold negative. Resets to 0
   * the first week it closes non-negative again. See engine/debt.ts. */
  debtWeeksActive: number;
  /** Outstanding sponsorship balance, 0 when none is active. A separate debt from the
   * ordinary negative-gold state above, with its own interest and consequence. See
   * engine/loan.ts. */
  loanPrincipal: number;
  loanTakenOnDay: number | null;
  /** What was put up when the sponsorship was arranged -- determines what actually
   * happens if it goes unresolved too long. Null whenever no sponsorship is active. */
  loanCollateral: SponsorshipCollateral | null;
  /** Only meaningful when loanCollateral is a purse cut: the fraction of every future
   * fight purse redirected straight to the sponsor. Starts at 0 and escalates each
   * time the sponsorship goes unresolved past a default threshold. */
  loanPurseCutFraction: number;
  /** The highest tier the player has actually been promoted into via a Promotion
   * Fight win. This, not raw reputation, is what matchmaking/economy/purses use --
   * reputation can cross a tier's threshold and even sit there for a long time without
   * this changing. See engine/promotion.ts. */
  unlockedTier: FightTier;
  /** Set after a lost promotion attempt; no new attempt against that tier's champion
   * until currentDay passes this. */
  promotionCooldownUntilDay: number | null;
  lastSummary: DaySummary | null;
  /** A rolling log of past day summaries, most recent last, capped in engine/tick.ts,
   * so the player can look back at what happened rather than losing it the moment a
   * Week Summary modal is dismissed. */
  history: DaySummary[];
  founderName: string;
  /** Chosen by the player at game start (Phase 8 Part F), pre-filled with a generated
   * suggestion but editable -- no longer only ever derived from the founder's name. */
  ludusName: string;
  /** Phase 12 Part L: the Colosseum capstone encounter. Set after a lost attempt, same
   * cooldown convention as promotionCooldownUntilDay. Null when no attempt has failed
   * recently. */
  praetorianCooldownUntilDay: number | null;
  /** How many times the Emperor's Praetorian Guard has been defeated -- the closest
   * thing the game has to tracking "endings" reached, without blocking a repeat run. */
  praetorianVictories: number;
  /**
   * Phase 13 Part B: once a self-directed Challenge opponent is generated for a
   * gladiator, it's locked in here for the day it was drawn rather than rerolled on
   * every preview open -- closing and reopening the preview the same day shows the
   * same opponent; a new one is only drawn once a new day has passed (or the
   * cooldown lapses and the entry is cleared). Keyed by gladiator id.
   */
  selfChallengeDraws: Record<string, { opponent: RivalGladiator; generatedOnDay: number }>;
  /**
   * Phase 14 Part B: how many times this ludus has gone bankrupt -- the debt-spiral
   * circuit breaker in engine/debt.ts. Purely a record of disgrace, doesn't gate
   * anything, same spirit as praetorianVictories.
   */
  bankruptcyCount: number;
}
