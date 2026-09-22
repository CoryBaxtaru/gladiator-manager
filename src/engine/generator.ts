// Gladiator generation: names, origins, backstories, starting stats, CA/PA.
import type { Gladiator, GladiatorRecord, GladiatorStats, Origin, PersonalityTrait, PhysicalTrait } from "../types";
import { MOOD, ORIGIN_STAT_LEAN, RECRUITMENT, STAFF, PERSONALITY_TRAIT_UNLOCK, ALL_PERSONALITY_TRAITS } from "../config";
import { nextId, pick, pickN, randInt, randFloat, chance } from "./rng";
import { generateFighterName, originDescriptor, pickOrigin } from "./names";
import { averageStats } from "./rating";

// Phase 8 Part G: roughly 50 additional variants across the same eight established
// categories (war captive, debt slavery, disgraced soldier, volunteer for glory,
// escaped criminal, born slave, noble fallen, unlicensed pit fighter), so a full
// roster stops reading as the same eight sentences with the origin word swapped out.
// Every template still takes the origin as a plain substitution, so the spread across
// all eight origins is automatic regardless of which template gets picked.
const BACKSTORY_TEMPLATES: ((origin: string) => string)[] = [
  // War captive
  (o) => `A war captive from ${o} lands, sold into slavery after the legions crushed his people's resistance.`,
  (o) => `Taken in chains when his ${o} village fell, marched to the slave markets in a column of the defeated.`,
  (o) => `A ${o} warrior captured on the losing side of a border skirmish, spared the sword only to be sold instead.`,
  (o) => `Surrendered rather than die on a ${o} battlefield already lost, and has regretted the choice every day since.`,
  (o) => `A hostage of ${o} nobility, handed over as part of a treaty and never reclaimed.`,
  (o) => `Captured raiding a frontier post, of ${o} blood, and given the arena instead of the cross.`,
  // Debt slavery
  (o) => `Fell into debt after a poor harvest and sold himself into slavery rather than watch his family starve, of ${o} stock.`,
  (o) => `Inherited his father's debts along with his ${o} name, and the creditors took the only collateral he had left.`,
  (o) => `A ${o} tenant farmer ruined by a bad year and a worse landlord, sold to settle what he owed.`,
  (o) => `Gambled on a shipment that never arrived and paid for it with his freedom, of ${o} birth.`,
  (o) => `A ${o} craftsman whose workshop burned down owing more than it was worth, and so did he.`,
  (o) => `Sold by his own family to cover a dowry debt, a ${o} son nobody could afford to keep.`,
  // Disgraced soldier
  (o) => `A disgraced former soldier of ${o} descent, stripped of rank after a battlefield disaster, now fighting for a second chance.`,
  (o) => `Cashiered from the auxiliaries for striking an officer, a ${o} veteran with nowhere left to march.`,
  (o) => `A ${o} legionary who broke ranks under fire once, and has spent every fight since trying to prove it was the only time.`,
  (o) => `Survived a rout that killed the rest of his unit, of ${o} origin, and was never quite trusted again.`,
  (o) => `A ${o} officer's son who failed the family's standard on his first campaign and can't go home until he's earned it back.`,
  (o) => `Discharged without honors after a court-martial he still insists was unjust, a ${o} soldier with a grudge and a sword arm.`,
  // Volunteer for glory
  (o) => `Volunteered for the arena chasing glory and coin, much to the horror of his ${o} family.`,
  (o) => `A ${o} farmhand who walked into a ludus and asked to be trained, tired of a life nobody would remember.`,
  (o) => `Signed his freedom away for a signing bonus and a shot at fame, a ${o} gambler betting on himself for once.`,
  (o) => `A ${o} blacksmith's apprentice who traded the forge for the sand, convinced he was always meant for something louder.`,
  (o) => `Walked out of a comfortable ${o} household to chase the roar of the crowd, and hasn't looked back since.`,
  (o) => `A ${o} second son with no inheritance coming, who decided the arena was a faster way to a name of his own.`,
  // Escaped criminal
  (o) => `An escaped criminal of ${o} origin, recaptured and sentenced to the sword rather than the mines.`,
  (o) => `A ${o} smuggler caught one shipment too many, given the arena as the last alternative to the quarries.`,
  (o) => `Broke out of a work gang twice before they finally sold him to a lanista, of ${o} stock.`,
  (o) => `A ${o} thief who picked the wrong pocket at the wrong forum and has been running from the consequences ever since.`,
  (o) => `Convicted of arson he still swears he didn't commit, a ${o} man with nothing left to lose in the ring.`,
  (o) => `A ${o} highway bandit run down after a season of robbing the wrong road, offered the sand instead of the noose.`,
  // Born slave
  (o) => `Born a slave of ${o} lineage, trained from youth with no memory of any other life.`,
  (o) => `Raised in the ludus kitchens before he was old enough to hold a blade, a ${o} boy who grew up around the sand.`,
  (o) => `A ${o} household slave sold on when his master's estate was broken up and divided among creditors.`,
  (o) => `Born to a mother who died in the arena infirmary, of ${o} blood, and never knew any household but this one.`,
  (o) => `A ${o} slave since birth who watched his father fight in this same ring a generation before him.`,
  (o) => `Traded between three households before he turned twelve, a ${o} boy nobody bothered to name properly until now.`,
  // Noble fallen
  (o) => `A ${o} noble fallen on hard times, gambled away his estate and now gambles with his life instead.`,
  (o) => `Stripped of his ${o} family's lands after backing the losing side of a succession dispute.`,
  (o) => `A ${o} lord's heir disowned for a scandal the family won't discuss, left with a fine sword and nothing else.`,
  (o) => `Squandered a ${o} inheritance on bad investments and worse company, and sold the last of it for a place in a ludus.`,
  (o) => `A ${o} magistrate's son ruined by his father's enemies, who chose the arena over quiet poverty.`,
  (o) => `Once betrothed into ${o} nobility until the match collapsed along with his family's fortune.`,
  // Unlicensed pit fighter
  (o) => `An unlicensed pit fighter of ${o} background, discovered brawling in a back-alley betting ring.`,
  (o) => `A ${o} dockworker who settled debts with his fists in unlicensed rings until a scout finally noticed.`,
  (o) => `Fought for coin in cellar matches no magistrate ever sanctioned, of ${o} birth, until a lanista bought out his debts.`,
  (o) => `A ${o} street brawler with a local reputation and no formal training, sharpened into something more useful here.`,
  (o) => `Ran with a gang of unlicensed fighters on the ${o} waterfront before the whole operation was broken up and sold off.`,
  (o) => `A ${o} miner who settled a dispute with his fists badly enough that the arena seemed the safer option.`,
];

const VOLUNTEER_BACKSTORY_TEMPLATES: ((origin: string) => string)[] = [
  (o) => `A free ${o} citizen who volunteered for the arena chasing glory rather than coin.`,
  (o) => `Signed his own contract at the Volunteer Hall, a free man of ${o} birth looking to make a name for himself.`,
  (o) => `A ${o} veteran of the legions who volunteered rather than face a quiet retirement.`,
  (o) => `A ${o} merchant's son bored of the ledger books, who signed up looking for a life with some risk in it.`,
  (o) => `Volunteered after watching a Colosseum bout from the cheap seats, a free ${o} man who decided he'd rather be down on the sand.`,
  (o) => `A ${o} athlete past his prime in the games, who found the arena paid better than the stadium ever did.`,
  (o) => `Signed the oath of his own free will to clear a rival's name from every tavern story in his ${o} hometown.`,
  (o) => `A free ${o} widower with grown children and nothing left to lose, who chose the arena over an empty house.`,
  (o) => `Talked his way into a contract on a dare, a ${o} nobleman's son who has since discovered he's rather good at this.`,
  (o) => `A ${o} sailor between ships who signed on for one season and stayed for the applause.`,
];

const DEFAULT_GEM_CHANCE = 0.12;

function generateStats(origin: Origin, base: number, spread: number): GladiatorStats {
  const lean = ORIGIN_STAT_LEAN[origin];
  return {
    strength: Math.max(1, base + randInt(0, spread) + (lean.strength ?? 0)),
    weaponSkill: Math.max(1, base + randInt(0, spread) + (lean.weaponSkill ?? 0)),
    endurance: Math.max(1, base + randInt(0, spread) + (lean.endurance ?? 0)),
    showmanship: Math.max(1, base + randInt(0, spread) + (lean.showmanship ?? 0)),
  };
}

const ALL_PHYSICAL_TRAITS: PhysicalTrait[] = ["Tall", "Short", "Stocky", "Wiry"];

export interface GenerateOptions {
  /** force a "gem" (low CA, high PA) roll */
  forceGem?: boolean;
  /** coarse presets kept for existing callers (starting squad, generic recruitment) */
  tier?: "weak" | "average" | "gem";
  /** fine-grained overrides, used by channel-based scouting */
  baseStatOverride?: number;
  statSpreadOverride?: number;
  gemChanceOverride?: number;
  traitPoolOverride?: PersonalityTrait[];
  moodOverride?: number;
  recordOverride?: Partial<GladiatorRecord>;
  backstoryPoolOverride?: ((origin: string) => string)[];
  /** Arena names already carried by gladiators on the player's current roster, so this one doesn't collide. */
  usedArenaNames?: Set<string>;
}

const TIER_STAT_PRESETS: Record<"weak" | "average" | "gem", { base: number; spread: number }> = {
  weak: { base: 15, spread: 15 },
  average: { base: 25, spread: 20 },
  gem: { base: 20, spread: 15 },
};

export function generateGladiator(currentDay: number, options: GenerateOptions = {}): Gladiator {
  const origin = pickOrigin();
  // Two names: the one he was born with, and the one the crowd knows him by.
  const { birthName, arenaName } = generateFighterName(origin, options.usedArenaNames);
  const backstoryPool = options.backstoryPoolOverride ?? BACKSTORY_TEMPLATES;
  const backstory = pick(backstoryPool)(originDescriptor(origin));

  const physicalTrait = pick(ALL_PHYSICAL_TRAITS);

  const gemChance = options.gemChanceOverride ?? DEFAULT_GEM_CHANCE;
  const isGem = options.forceGem ?? chance(gemChance);

  const tierPreset = TIER_STAT_PRESETS[options.tier ?? (isGem ? "gem" : "weak")];
  const base = options.baseStatOverride ?? tierPreset.base;
  const spread = options.statSpreadOverride ?? tierPreset.spread;
  const stats = generateStats(origin, base, spread);
  const initialAbility = averageStats(stats);

  let potentialAbility: number;
  if (isGem) {
    potentialAbility = Math.min(99, initialAbility + RECRUITMENT.gemPotentialBonus + randInt(10, 30));
  } else {
    potentialAbility = Math.min(99, initialAbility + randInt(5, 25));
  }

  const age = randInt(17, 34);
  const weeklyUpkeep = Math.max(6, Math.round(8 + initialAbility * 0.3));

  const record: GladiatorRecord = {
    fights: 0,
    wins: 0,
    losses: 0,
    nearDeaths: 0,
    ...options.recordOverride,
  };

  // Personality is earned, not handed out at generation (Phase 8 Part E): too young,
  // or simply hasn't fought enough yet, means a blank slate. A recruit who already
  // carries fight history (a record override from certain channels) can arrive with
  // that first slot already earned; nobody starts with more than one.
  const traitPool = options.traitPoolOverride ?? ALL_PERSONALITY_TRAITS;
  const hasEarnedFirstTrait =
    age > PERSONALITY_TRAIT_UNLOCK.youngAgeMax && record.wins >= PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone;
  const personalityTraits = hasEarnedFirstTrait ? pickN(traitPool, 1) : [];

  return {
    id: nextId("g"),
    name: arenaName,
    birthName,
    arenaName,
    age,
    origin,
    backstory,
    physicalTrait,
    personalityTraits,
    mood: options.moodOverride ?? MOOD.start,
    moodModifiers: [],
    potentialAbility,
    potentialRevealed: "range",
    stats,
    condition: "healthy",
    record,
    weeklyUpkeep,
    status: "active",
    statusChangedOnDay: null,
    trainingFocus: "strength",
    injuryDaysRemaining: 0,
    hotStreakUntilDay: null,
    hireDay: currentDay,
    recentStatChanges: [],
    lastMoraleEventDay: null,
    lastRitualDay: null,
    lastBonusCutDay: null,
    lastPrideBoastDay: null,
    lastEncouragementDay: null,
    potentialNoiseSeed: randFloat(-STAFF.ratingNoiseMax, STAFF.ratingNoiseMax),
    sparringPartnerId: null,
  };
}

export { VOLUNTEER_BACKSTORY_TEMPLATES };
