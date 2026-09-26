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

**Last completed: Phase 16** (working backlog: eight parts, A through H). All landed,
each as its own commit, each verified live -- either through the real UI/save the way
Phase 15 was, or (for the two engine-heavy parts, D and G) through direct engine-level
simulation scripts plus a live browser check of the resulting UI, since a full natural
playthrough to reach those states isn't practical in one sitting. See `git log` for the
individual commit messages, which carry the full reasoning per part; this section is
the summary.

- **Part A -- technique announcement coverage**: the Phase 15 gap is closed. A shared
  `techniqueAnnouncementFor()` helper (`engine/combat.ts`) is now reused by Promotion
  Fights, ludus death matches, self-challenges, and the Colosseum finale, the same
  diff-before/after pattern the ordinary fight-day path already used. All four surface
  the announcement text in their result modal.
- **Part B -- mood/escape-risk indicator**: the underlying `riskTagFor()` thresholds
  already existed (`engine/mood.ts`), but the "Unsettled"/"Flight Risk" tag only ever
  showed in the single-gladiator detail panel -- checking the whole roster meant
  clicking into every gladiator one at a time. Now every card in the Squad screen's
  roster list shows it directly. This was flagged as the single most-requested
  playtest fix; treat it as done, not just attempted.
- **Part C -- persistent milestone log**: `state.history` is still a rolling 60-day
  window. Added a separate, 300-entry-capped `state.milestones` log for deaths,
  escapes, retirements, promotions, demotions, poachings, and signature-technique
  unlocks, derived by diffing before/after `LudusState` (`engine/milestones.ts`)
  rather than instrumenting every call site individually. Wired in once, centrally, by
  wrapping `GameContext`'s `setState` itself -- every existing action gets it for free.
  Shown as a permanent "Milestones" list above the existing day-by-day log on the
  History screen.
- **Part D -- persistent rivalries**: rival ludi were already generated once at game
  start with a stable `id` and never regenerated -- that identity just wasn't being
  used for anything. `RivalLudus` now carries a `record: {wins, losses}` from the
  player's perspective, updated by `engine/rivalLudi.ts`'s `recordRivalryResult()` for
  every fight-day, Promotion Fight, or ludus death match matchup against one (self-
  challenges and the Colosseum finale don't involve a real rival, so untouched).
  Crossing a threshold in `RIVALRY.noticeThresholds` surfaces a felt notice ("Ludus X
  has beaten you N times now. The crowd remembers.") in the day summary and in the
  Promotion/Death Match result modals; the Ludi Rankings screen shows every rival's
  record and flags a losing one with a "Bitter Rival" tag.
- **Part E -- staff role explanations**: Trainer and Doctor already had per-role
  descriptions on the Training screen (added Phase 12-13) -- confirmed live, no gap
  there, and the doctor-visit copy already correctly framed it as cheapening the paid
  visit rather than passively speeding recovery. The real remaining blind spot: Phase
  15's Attack/Strength/Defence split left Strength with no clash of its own and
  Defence as a passive mitigation, and nothing ever explained that mechanically.
  Added `STAT_DESCRIPTIONS` (config.ts) as a tooltip on every stat row in the Squad
  screen, plus an extra note on a Strength/Defence trainer's card specifically.
- **Part F -- tier-transition difficulty signal**: the Fight Day selection screen
  already had a per-fighter `WinChanceBadge` (added Phase 12-13, same estimator
  Challenges uses) -- confirmed live, no gap there either. The real remaining gap:
  right at a tier transition, `fightday.ts`'s `pickMatchTier` quietly blends in the
  tier below near a new tier's reputation floor, so a freshly-promoted player could see
  a suspiciously easy "Heavy Favorite" with no way to tell if that's real progress.
  The selection screen now tags exactly which fighters got a blended, below-tier
  matchup ("vs Local Arena") plus a one-line explanation the first time it applies.
- **Part G -- demotion/poaching (the oldest open item)**: `PROMOTION_READINESS` was
  only ever checked once, at the moment a Promotion Fight was attempted -- nothing
  rechecked it afterward. `engine/tierNeglect.ts` adds the ongoing half: checked
  weekly against the same readiness numbers, softened by `TIER_NEGLECT.sustainFraction`
  (0.7) so a temporary dip costs nothing, with a warning one week ahead of any real
  consequence. The consequence: a rival poaches whichever active gladiator is
  worst-off (mood-neglected first, reusing Part B's `riskTagFor`; otherwise the lowest
  Current Ability), preferring a rival the ludus already has a real rivalry with (Part
  D's records) so it reads as a grudge. A one-gladiator roster has nothing poachable,
  so it falls back to a real demotion a tier down instead -- the mechanism always has
  a consequence available. New `"poached"` `GladiatorStatus` and `"poaching"`/
  `"demotion"` milestone categories. This was a deliberate design call, not something
  flagged back for a decision -- see the Part G commit message for the full reasoning
  on why poaching-with-demotion-fallback was chosen over demotion alone.
- **Part H -- real square favicon**: blocked in Phase 14 for lack of an image tool.
  `pip install Pillow` worked cleanly this session. `favicon.svg` is now a real
  128x128 crop of the existing banner logo's marble "L" and gold laurel wreath (with a
  hint of the red ribbon), wrapped as an embedded `<image>` inside the SVG since the
  source has no separate vector medallion to pull from directly.

**A note on this backlog's own accuracy**: Parts E and F turned out to be already
mostly built (Phase 12-13, well before this phase) -- the "Known open items" list
below had gone stale without anyone re-checking the live app against it. Don't trust
that list at face value in a future phase either; open the actual screen first, THEN
decide what (if anything) is missing. Both parts above describe what was actually
found and what was actually still missing, not what the prompt assumed going in.

**Verification this phase**: builds clean (`npm run build`) and lints clean (`npm run
lint`, same handful of pre-existing/deliberate warnings as before -- see that command's
output for what's expected) after every part. Live-verified in a real browser
(Playwright against the dev server) for B, D (rivalry notice thresholds + Rankings
"Bitter Rival" tag), F (forced a save to the Provincial floor and confirmed the tier-
blend tag/copy), G (forced a save to Provincial with gutted buildings, ran real weekly
ticks through the actual UI, watched the week-3 warning and week-4 poaching fire, and
confirmed the day summary, Squad screen, and permanent Milestones log all agree), and
H (rendered the new favicon.svg directly). Also ran a full smoke pass on a completely
fresh game across every tab, and a separate pass loading a save with every Phase 16
field stripped out (simulating a genuine pre-Phase-16 save) -- zero console/page
errors in either case, confirming the migration defaults in `saveManager.ts` hold.

**Previously completed: Phase 15** (Retirement into staff, signature techniques + weapon
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
  (verified live -- see below). At the time, the Promotion Fight / death match /
  Colosseum finale paths unlocked a technique correctly but didn't carry the same
  dedicated announcement text -- fixed in Phase 16 Part A, see "Where things stand"
  above.
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

**Not re-verified this phase** (carried over from Phase 14/15, no reason to expect
regression, just not re-clicked-through): sponsor-or-die cost tuning, self-challenge
opponent locking, bruised-gladiator eligibility, the bankruptcy circuit breaker,
retirement into staff, and the weapon-type/signature-technique/stat-split combo from
Phase 15. See those phases' own history in `git log` if you need the detail.

**Phase-by-phase history**: `git log --oneline` -- every phase has landed as one
commit with a descriptive message covering what it did and why; that's the canonical
record, not duplicated here. Deep-dive docs for specific systems live in `docs/`
(`economy-rebalance.md`, `difficulty-ramp.md`, `mood-action-tuning.md`,
`gladiator-name-pools.md`, `name-system-handoff.md`) -- read the relevant one before
touching that system, they contain the diagnostic work, not just the conclusion.

## Known open items (not yet acted on)

Every item that was on this list going into Phase 16 (demotion/poaching, the mood/
escape-risk indicator, the ludus history log, staff role explanations, the tier-
transition difficulty signal, the real square favicon, and signature-technique
announcement coverage) was resolved this phase -- see "Where things stand" above for
what actually shipped for each. Two of them (staff role explanations, the tier-
transition signal) turned out to already be mostly built from Phase 12-13 and just
needed a fresh look plus the one genuine remaining gap closed; don't assume this list
is exhaustive or current without checking the live app first, the same way this phase
had to.

Nothing carried over unbuilt. New items noticed while working through Phase 16,
not yet acted on:

- **Tier-neglect tuning is unverified against a real long playthrough**: Part G's
  numbers (`TIER_NEGLECT` in config.ts -- 0.7 sustain fraction, 4-week grace period,
  8-week cooldown, 10 reputation penalty per poaching) were chosen by reasoning from
  the existing `PROMOTION_READINESS` numbers, not tuned against actual play. Verified
  correct and firing as designed (direct engine simulation plus a live browser run),
  but never felt by a player across a real multi-week save where building/roster
  investment naturally fluctuates. Watch for it firing too readily (a player who just
  had a rough recruiting week getting punished) or not readily enough (still too easy
  to coast) in the next real playtest round, and retune `TIER_NEGLECT` accordingly --
  the mechanism itself shouldn't need to change, just the numbers.
- **Poaching's target selection doesn't consider the poached gladiator's actual combat
  value to the roster**: it picks strictly the worst-off (mood-neglected first, else
  lowest Current Ability), which is the right read of "who did you neglect" but can
  occasionally take a low-CA gladiator the player was deliberately still developing
  (e.g. a high-Potential prospect who just hasn't trained up yet) rather than one who's
  actually expendable. Not wrong, but worth a look if playtesting turns up poaching
  feeling like it's targeting the wrong fighter.
- **`GladiatorHoverCard.tsx` and `state/GameContext.tsx` export non-component values
  from component files**: pre-existing oxlint warnings (`react/only-export-components`),
  not introduced this phase, not touched. Harmless (doesn't break Fast Refresh in any
  way that matters for this project), but would be a quick, isolated cleanup if a
  future session is already in either file.
- **`FightDaySelectionModal.tsx`'s two `useMemo` calls have empty dependency arrays on
  purpose** (a deliberate mount-once preview, see the comment right above them) --
  oxlint flags this as a missing-deps warning every time. Not a bug, just a case the
  linter can't express "intentionally empty" for; leave as is rather than silencing it
  in a way that could hide a real future regression.
