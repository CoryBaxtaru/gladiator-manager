// Historically grounded name generation, driven by src/data/gladiator-name-pools.json.
//
// The central fact behind this module: almost no gladiator fought under his birth
// name. Gladiators were slaves, war captives or auctorati, and the epigraphic record
// shows them bearing a single Latin or Greek ARENA name regardless of where they came
// from. Flamma, the best-documented gladiator we have, is recorded on his epitaph as
// "natione Syrus" -- a Syrian called "Flame".
//
// So every fighter gets two names: a birth name authentic to his culture, and an arena
// name assigned on enrolment. See docs/gladiator-name-pools.md for provenance,
// confidence flags and the per-culture caveats.

import type { Origin } from "../types";
import rawPools from "../data/gladiator-name-pools.json";
import { chance, pick } from "./rng";

// ---------------------------------------------------------------------------
// Shape of the data file (only the parts this module reads)
// ---------------------------------------------------------------------------

interface CompoundGenerator {
  prefixes?: string[];
  suffixes?: string[];
  divineElements?: string[];
}

interface GroupData {
  label: string;
  birthNames?: Record<string, unknown>;
  compoundGenerator?: CompoundGenerator;
  originTags?: string[];
}

interface AttestedGladiator {
  name: string;
  type?: string;
  place?: string;
  note?: string;
}

interface NamePools {
  groups: Record<string, GroupData>;
  arenaNames: {
    attestedGladiators: AttestedGladiator[];
    byTheme: Record<string, string[]>;
  };
  lanistae: {
    triaNomina: {
      praenomina: { full: string; abbr: string }[];
      nomina: string[];
      cognomina: string[];
      freedmanCognomina: { greekCognomina: string[] };
    };
  };
  ludusNames: {
    attested: { name: string; place?: string; note?: string }[];
    locationPattern: { examples: string[] };
    ethnicOrFunctionPattern: { examples: string[] };
  };
}

const POOLS = rawPools as unknown as NamePools;

// ---------------------------------------------------------------------------
// Origin wiring
// ---------------------------------------------------------------------------

export const ORIGINS: Origin[] = [
  "Thracian",
  "Gaul",
  "Roman",
  "Numidian",
  "Germanic",
  "Nubian",
  "Syrian",
  "Greek",
];

const GROUP_KEY: Record<Origin, string> = {
  Thracian: "thracian",
  Gaul: "gallic",
  Roman: "roman",
  Numidian: "numidian",
  Germanic: "germanic",
  Nubian: "nubian",
  Syrian: "syrian",
  Greek: "greek",
};

/**
 * Ordinary people's names. This is the default pool -- a man who ends up in a ludus
 * was almost never a king.
 */
const COMMONER_BUCKETS: Record<Origin, string[]> = {
  Thracian: ["compoundsAttested", "simpleAttested", "geticDacianCommonAttested"],
  Gaul: ["commonersAttested"],
  Roman: [], // Romans use the tria nomina builder below
  Numidian: ["commonersAttested", "punicAttested"],
  Germanic: ["attested"],
  Nubian: ["commonersAttested", "postMeroiticRulersAttested"],
  Syrian: ["palmyreneAttested", "judaeanAttested"],
  Greek: ["civiliansAttested"],
};

/**
 * Status-loaded names: kings, dynasts, chieftains. Authentic, but naming a slave
 * Rhoemetalces or Amanishakheto reads like a galley-slave called "Prince Augustus".
 * Kept rare, and good for a fighter whose whole story is that he was somebody once.
 */
const ELITE_BUCKETS: Record<Origin, string[]> = {
  Thracian: ["dynasticAttested", "geticDacianEliteAttested"],
  Gaul: ["chieftainsAttested"],
  Roman: [],
  Numidian: ["royalAttested"],
  Germanic: [],
  Nubian: ["royalAttested"],
  Syrian: ["dynasticAttested"],
  Greek: [],
};

/** How often a birth name is synthesised from attested name-elements rather than taken whole. */
const PROCEDURAL_CHANCE: Record<Origin, number> = {
  Thracian: 0.35, // large closed set of elements; recombination is linguistically sound
  Gaul: 0.3,
  Germanic: 0.35,
  Syrian: 0.2, // Abd- / Zabd- / Taim- plus a divine element
  Numidian: 0, // script only partly deciphered; recombination would be guesswork
  Nubian: 0, // the generator's Amani- element is royal-only -- see the data file's warning
  Roman: 0,
  Greek: 0,
};

/** Chance a fighter draws from the elite pool instead of the commoner pool. */
const ELITE_CHANCE = 0.08;

/** Chance a Gaulish name uses the "-rix" (king) suffix. Above ~15% it reads as parody. */
const GAULISH_RIX_CHANCE = 0.15;

// ---------------------------------------------------------------------------
// Pool assembly
// ---------------------------------------------------------------------------

function dedupe(names: string[]): string[] {
  return [...new Set(names)];
}

function bucketsFor(origin: Origin, buckets: string[]): string[] {
  const group = POOLS.groups[GROUP_KEY[origin]];
  if (!group?.birthNames) return [];
  const out: string[] = [];
  for (const key of buckets) {
    const value = group.birthNames[key];
    if (Array.isArray(value)) out.push(...(value as string[]));
  }
  return dedupe(out);
}

function buildRecord<T>(fn: (origin: Origin) => T): Record<Origin, T> {
  const out = {} as Record<Origin, T>;
  for (const origin of ORIGINS) out[origin] = fn(origin);
  return out;
}

const COMMONER_NAMES: Record<Origin, string[]> = buildRecord((o) => bucketsFor(o, COMMONER_BUCKETS[o]));
const ELITE_NAMES: Record<Origin, string[]> = buildRecord((o) => bucketsFor(o, ELITE_BUCKETS[o]));

/**
 * Arena names: every single-word name a real gladiator is recorded under, plus the
 * themed Latin/Greek buckets (force, fire, animals, myth, luck, beauty, irony).
 * Multi-word entries are dropped -- those are freeborn citizens with a full tria
 * nomina, handled separately.
 */
const ARENA_NAMES: string[] = dedupe([
  ...POOLS.arenaNames.attestedGladiators.map((g) => g.name).filter((n) => !n.includes(" ")),
  ...Object.values(POOLS.arenaNames.byTheme).flat(),
]);

const TRIA = POOLS.lanistae.triaNomina;

// ---------------------------------------------------------------------------
// Procedural compounds
// ---------------------------------------------------------------------------

/** "Aulu-" + "-zenis" -> "Auluzenis"; "Abd-" + "Bel" -> "Abdbel". */
function joinCompound(prefix: string, suffix: string): string {
  const head = prefix.replace(/-+$/, "");
  const tail = suffix.replace(/^-+/, "");
  if (!head || !tail) return head + tail;
  return head + tail.charAt(0).toLowerCase() + tail.slice(1);
}

function synthesiseName(origin: Origin): string | null {
  const gen = POOLS.groups[GROUP_KEY[origin]]?.compoundGenerator;
  if (!gen?.prefixes?.length) return null;

  const tails = gen.suffixes?.length ? gen.suffixes : gen.divineElements;
  if (!tails?.length) return null;

  let suffix = pick(tails);
  // Throttle the Gaulish "-rix": it means "king", and on every third fighter it stops
  // reading as a name and starts reading as a joke.
  if (origin === "Gaul" && suffix.endsWith("rix") && !chance(GAULISH_RIX_CHANCE)) {
    const others = tails.filter((s) => !s.endsWith("rix"));
    if (others.length > 0) suffix = pick(others);
  }
  return joinCompound(pick(gen.prefixes), suffix);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FighterName {
  /** The name he was born with, authentic to his culture. */
  birthName: string;
  /** The single Latin or Greek name he fights under. */
  arenaName: string;
}

export function pickOrigin(): Origin {
  return pick(ORIGINS);
}

/** A full Roman citizen name: praenomen + nomen + cognomen. */
export function generateRomanCitizenName(options: { freedman?: boolean; abbreviate?: boolean } = {}): string {
  const praenomen = pick(TRIA.praenomina);
  const nomen = pick(TRIA.nomina);
  // The most authentic lanista profile: the trade was legally infamis, so many were
  // freedmen -- Latin praenomen, former owner's nomen, own Greek slave name as cognomen.
  const cognomen = options.freedman ? pick(TRIA.freedmanCognomina.greekCognomina) : pick(TRIA.cognomina);
  const first = options.abbreviate ? praenomen.abbr : praenomen.full;
  return `${first} ${nomen} ${cognomen}`;
}

/** The birth name a fighter of this origin would have carried. */
export function generateBirthName(origin: Origin): string {
  if (origin === "Roman") return generateRomanCitizenName();

  if (chance(PROCEDURAL_CHANCE[origin])) {
    const synthetic = synthesiseName(origin);
    if (synthetic) return synthetic;
  }

  const elite = ELITE_NAMES[origin];
  if (elite.length > 0 && chance(ELITE_CHANCE)) return pick(elite);

  const commoners = COMMONER_NAMES[origin];
  if (commoners.length > 0) return pick(commoners);

  return pick(ARENA_NAMES);
}

/**
 * The single name he fights under. Deliberately not tied to origin -- that is how the
 * record looks. `used` excludes names already carried by gladiators on the player's
 * current roster, so the crowd never has to cheer for two "Hector"s at once; if the
 * whole pool is somehow already taken, falls back to an unfiltered pick rather than
 * failing.
 */
export function generateArenaName(used: Set<string> = new Set()): string {
  const available = ARENA_NAMES.filter((n) => !used.has(n));
  return available.length > 0 ? pick(available) : pick(ARENA_NAMES);
}

export function generateFighterName(origin: Origin, usedArenaNames: Set<string> = new Set()): FighterName {
  return { birthName: generateBirthName(origin), arenaName: generateArenaName(usedArenaNames) };
}

/**
 * The tribe or region a Roman would actually have named, rather than the broad
 * origin label. "A war captive from Cherusci lands" beats "from Germanic lands".
 */
export function originDescriptor(origin: Origin): string {
  const tags = POOLS.groups[GROUP_KEY[origin]]?.originTags;
  if (tags?.length) return pick(tags);
  return origin;
}

// ---------------------------------------------------------------------------
// Ludus names
// ---------------------------------------------------------------------------

/** "Cornelius" -> "Ludus Cornelianus". Drop the -ius, add -ianus. */
export function ludusNameForOwner(nomen: string): string {
  return `Ludus ${nomen.replace(/ius$/, "ianus")}`;
}

/** Every ludus name the generator can draw on: real schools, owner-named and place-named. */
export const LUDUS_NAME_POOL: string[] = dedupe([
  ...POOLS.ludusNames.attested.map((l) => l.name).filter((n) => n.startsWith("Ludus ")),
  ...POOLS.ludusNames.locationPattern.examples,
  ...POOLS.ludusNames.ethnicOrFunctionPattern.examples,
  ...TRIA.nomina.map(ludusNameForOwner),
]);

export function generateLudusName(used: Set<string> = new Set()): string {
  const available = LUDUS_NAME_POOL.filter((n) => !used.has(n));
  return available.length > 0 ? pick(available) : pick(LUDUS_NAME_POOL);
}

/**
 * A gladiator's name picks up his school as a suffix: "Hilarus Neronianus" means
 * "Hilarus of the Neronian ludus". Only the adjectival owner-forms work this way --
 * "Ludus Magnus" yields nothing.
 */
export function ludusEpithet(ludusName: string): string | null {
  const word = ludusName.replace(/^Ludus\s+/, "");
  return /anus$/.test(word) ? word : null;
}
