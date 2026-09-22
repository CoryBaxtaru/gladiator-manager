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
  | "Greek";

export type GladiatorCondition =
  | "healthy"
  | "bruised"
  | "injured"
  | "gravely_injured";

export type GladiatorStatus = "active" | "dead" | "escaped" | "sold" | "retired";

export type TrainingFocus =
  | "strength"
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

export interface GladiatorStats {
  strength: number;
  weaponSkill: number;
  endurance: number;
  showmanship: number;
}

export type StatKey = keyof GladiatorStats;

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
}

export interface RecruiterTrip {
  id: string;
  tier: RecruiterTier;
  /** Flavor only -- the scout sent isn't a persistent hired Staff member. */
  recruiterName: string;
  channel: RecruitChannel;
  sentOnDay: number;
  returnsOnDay: number;
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
  rivalLudusName: string;
  combat?: CombatResult;
  reputationTransferred?: number;
  goldDelta?: number;
}

/** Result of a Promotion Fight attempt (see engine/promotion.ts). */
export interface PromotionOutcome {
  won: boolean;
  combat: CombatResult;
  newTier: FightTier | null;
  cooldownUntilDay: number | null;
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
}
