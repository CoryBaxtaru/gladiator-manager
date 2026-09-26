# Handoff: Gladiator Ludus Manager

Written for a fresh session picking this project up with no memory of prior work. Read
this first, then `README.md` for dev commands, then the specific `docs/*.md` files
referenced below if you need to go deeper on a particular system.

## What this is

A browser-based management sim (React + TypeScript + Vite, no backend, save lives in
`localStorage`) where you run a Roman gladiatorial school (*ludus*). Core loop: recruit
and train fighters, manage their mood and health, send them to fight days every 6 days,
climb a reputation ladder through four tiers (Local → Provincial → Rival → Colosseum),
and try to win optional, player-timed Promotion Fights to actually unlock each next tier
rather than just reaching its reputation threshold. Live at
https://corybaxtaru.github.io/gladiator-manager/, deployed manually to the `gh-pages`
branch (not automatic -- see `README.md`).

## Where things stand

**Last completed: Phase 15** (Retirement into staff, signature techniques + weapon
types, and the Attack/Strength/Defence stat split). Three parts, all landed and
verified live against a real save carried over from the Phase 14 Round 7 playtest:

- **Retirement into staff** (Part 1): a fourth exit alongside die/escape/sold. A
  gladiator who's aged out (`RETIREMENT.minAge`, 32) or proven himself
  (`RETIREMENT.provenWinsThreshold`, 15 career wins) can be repurposed onto staff as a
  trainer instead of sold -- no gold changes hands either way, framed in the UI as
  "steps down from the sand," not a transaction. `trueSkill` derives from his single
  best effective stat scaled down by `RETIREMENT.trueSkillTransferFraction` (0.75): a
  real bargain, deliberately not a 1:1 steal, since "a great fighter isn't automatically
  a great teacher." Specialty is whichever stat that was. See `engine/staff.ts`'s
  `canRetire`/`retireGladiatorToStaff` and the "Retire to Staff" button on the Squad
  screen. Peer mentorship (a Round 7 report idea aimed at the same problem) was
  deliberately dropped, per instruction, in favor of this.
- **Weapon types + signature techniques** (Part 2): gladiators now carry a
  reassignable `weaponType` (murmillo/retiarius/thraex/dimachaerus/secutor, see
  `WEAPON_TYPES` in config.ts), each a fixed two-stat trade-off applied through
  `effectiveStats()` the same way physical traits are -- a real build choice, picked on
  the Squad screen's new "Combat Style" block. Signature techniques
  (`SIGNATURE_TECHNIQUES`) are rare, permanent milestones requiring a specific weapon
  type AND a stat threshold AND an earned personality trait all at once, checked
  alongside the personality-trait-unlock check in `combat.ts`'s
  `applyCombatResultToGladiator`; the ordinary fight-day path (`tick.ts`) diffs
  before/after and announces it by name in that day's summary the moment it fires
  (verified live -- see below). The Promotion Fight / death match / Colosseum finale
  paths still unlock a technique correctly but don't carry the same dedicated
  announcement text; a player would discover it there via the Squad screen instead.
  Worth wiring the same announcement into those paths if it comes up again.
- **Attack/Strength/Defence split** (Part 3): the old single `strength` stat is now
  three. **Attack** took over strength's old clash slot 1:1 (same composite weight,
  same clash). **Defence** is new: a passive per-clash modifier that reduces what the
  opponent effectively rolls against this gladiator, every clash (`COMBAT.
  defenceMitigationPerPoint`/`defenceMitigationMax`), asymmetric and player-side-only,
  reusing the precedent already established by `situationalBonus`. **Strength** is
  new and deliberately has no clash of its own -- it's a pure stakes stat
  (`STRENGTH_STAKES` in config.ts): an opponent's strength worsens injury severity and
  death chance on a loss, and a gladiator's own strength adds a margin-scaled
  reward bonus on a decisive win. This shape (3-way, not the leaner Attack+Defence
  option also on the table) was chosen specifically because Strength was found real,
  non-redundant work to do (stakes/severity, not win-rate) -- see `types.ts`'s
  `GladiatorStats` doc comment and `config.ts`'s `STRENGTH_STAKES` comment for the full
  reasoning. `averageStats()` (rating.ts, the CA/PA basis) is now an unweighted average
  of all six stats, Strength included at full weight alongside the other five, on the
  reasoning that giving it a smaller weight would need its own justification this
  project doesn't have.
  **Migration**: an old save's gladiators/rival roster/recruit-pool candidates get
  `attack = defence = (old strength value)` the first time they're loaded
  (`saveManager.ts`'s `migrateStats`), not a reset to zero; `weaponType` defaults to
  `"murmillo"` (fixed, not random, so it doesn't reroll every load of a save that's
  never been resaved -- same reasoning as the existing `physicalTrait` migration
  fallback).

**Confirmed working via a live playtest against a real carried-over save** (the actual
Round 7 save, `Ludus Numisianus`, day 1884, loaded through the new migration path with
no manual fixture needed):
- The migration itself: a real 227-fight, 197-win veteran (`Glaucus`) loaded with
  `attack = defence = 45` derived correctly from his old `strength: 45`, weaponSkill/
  endurance/showmanship untouched, weaponType defaulted to Murmillo.
- Retirement: retired `Glaucus` through the actual UI (not a data hack) -- roster count
  dropped, he appeared as "Retired" in the grace-period list with the right flavor
  copy, and a new "Trainer, Showmanship" staff entry appeared immediately with a
  correctly-derived trueSkill and weekly salary.
- Signature techniques + weapon types + the stat split all at once, in one real fight:
  a test gladiator built with Retiarius + Attack 85 + Bloodthirsty won a fight day and
  the day summary announced `Reaperius has earned a name for it: "The Reaper's Cast."`
  exactly as designed, the clash log correctly read "Attack clash" (not "Strength"),
  and the technique badge persisted on the Squad screen afterward. This is the
  strongest evidence the three systems compose the way Part 3's brief asked for.
- Trainer specialty coverage cycling (`SPECIALTY_CYCLE` in `staff.ts`) confirmed
  working with the new 6-stat order: a 5-star Strength-specialty trainer correctly
  covered Strength, Defence, Weapon Skill (cycling forward through the new order).

**Not re-verified this phase** (carried over from Phase 14, no reason to expect
regression, just not re-clicked-through): sponsor-or-die cost tuning, self-challenge
opponent locking, bruised-gladiator eligibility, the bankruptcy circuit breaker. See
Phase 14's own history in `git log` if you need the detail.

**Phase-by-phase history**: `git log --oneline` -- every phase has landed as one
commit with a descriptive message covering what it did and why; that's the canonical
record, not duplicated here. Deep-dive docs for specific systems live in `docs/`
(`economy-rebalance.md`, `difficulty-ramp.md`, `mood-action-tuning.md`,
`gladiator-name-pools.md`, `name-system-handoff.md`) -- read the relevant one before
touching that system, they contain the diagnostic work, not just the conclusion.

## Known open items (not yet acted on)

Raised across various playtests, never built, still on the table:

- **Demotion / poaching**: deliberately not built in an earlier phase for lack of
  historical grounding; a death-match/challenge system was built instead as the
  alternative. If this comes up again, it's a decision to flag back to the user, not
  something to decide unilaterally.
- **Mood/escape-risk indicator**: the mood-break/escape system (pre-dates all of the
  above) has claimed gladiators in playtests with no proactive warning beyond the
  existing risk tag on the Squad screen. Worth a harder look at whether that's enough.
- **Ludus history log**: no persistent narrative record beyond the rolling 60-entry day
  summary history already in `LudusState.history`.
- **Staff role explanations**: hiring screen could use clearer upfront framing of what
  a trainer vs. doctor actually does before you pay for one.
- **Tier-transition difficulty signal**: nothing currently tells a player *why* a fight
  suddenly got harder right after a promotion, beyond the readiness gate's own numbers.
- **Real square favicon**: blocked in Phase 14 -- no image-processing tool was available
  in that session (no ImageMagick, no Python+PIL, no sharp/canvas installed), and the
  source logo (`public/branding/ludus-logo.png`, 1820×864, ~2.4MB) is a wide banner, not
  a croppable square icon. Needs either a separately-prepared square asset, or a session
  with real image-editing capability.
- **Signature-technique announcement coverage**: only the ordinary fight-day path
  announces a newly-earned technique by name in the day summary (see Phase 15 above).
  Promotion Fights, death matches, and the Colosseum finale still unlock one correctly,
  just silently -- the player finds out via the Squad screen instead of a named moment.
  Not urgent, but worth wiring the same announcement text into those three paths if a
  future session is already touching that code.
