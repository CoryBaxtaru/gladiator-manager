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
branch (not automatic — see `README.md`).

## Where things stand

**Last completed: Phase 14** (commit `4a975d1`). It fixed two things found in the Phase
13 fixes' own follow-up playtest (Round 7) and added the game's logo:

- Promotion Fight copy no longer claims a loss is safe — it reuses the same
  `applyCombatResultToGladiator` path as an ordinary fight, so it's carried the same
  real death risk since Phase 12 and the copy hadn't caught up.
- A **bankruptcy circuit breaker** in `engine/debt.ts`: once a ludus has no gladiator
  left to seize and no staff left to dismiss, the debt-consequence system used to become
  a permanent no-op while interest kept compounding with no cap — verified in Round 7 to
  reach -2.59 million gold with zero mathematical way back. Now that exact moment
  triggers bankruptcy instead: debt wiped to 0, reputation cut to the current tier's
  floor, every building loses a level. Real setback, not an escape hatch. Can recur
  (`bankruptcyCount` on `LudusState`).
- The game's logo is in (Main Menu title-screen placement, compact TopBar mark, browser
  tab title). No real square favicon yet — see open items.

**Confirmed working via live playtest** (Round 7, the fullest playtest to date — 3
promotion-cycle attempt, 2 of 3 completed before the debt spiral above ended the run):
- Sponsor-or-die (Phase 12 Part A, retuned in Phase 13): cost now tracks treasury
  health correctly — checked a real range from 4% of treasury (arguably too cheap once
  wealthy) up to 87% (a genuinely hard call) rather than being unaffordable regardless
  of who it is, which was the Phase 12 launch bug.
- Self-directed challenge opponent locking (Phase 13 Part B): re-confirmed twice, same
  opponent survives backing out and reopening the preview, same day.
- Bruised-gladiator fight eligibility (Phase 13 Part C): correctly wired, but rarely
  *observed* firing in ordinary fight days — bruised recovery (2 days) is shorter than
  the 6-day fight-day interval, so a bruised fighter is usually back to fully healthy
  before the next one anyway. It's real, just structurally hard to catch outside a
  self-directed challenge or a same-week sparring injury. Not a bug, just a coverage
  note for whoever plays it next.
- The bankruptcy fix above: verified live against the actual Round 7 save state, not
  just in isolation.

**Phase-by-phase history**: `git log --oneline` — every phase has landed as one
commit with a descriptive message covering what it did and why; that's the canonical
record, not duplicated here. Deep-dive docs for specific systems live in `docs/`
(`economy-rebalance.md`, `difficulty-ramp.md`, `mood-action-tuning.md`,
`gladiator-name-pools.md`, `name-system-handoff.md`) — read the relevant one before
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
- **Real square favicon**: blocked in Phase 14 — no image-processing tool was available
  in that session (no ImageMagick, no Python+PIL, no sharp/canvas installed), and the
  source logo (`public/branding/ludus-logo.png`, 1820×864, ~2.4MB) is a wide banner, not
  a croppable square icon. Needs either a separately-prepared square asset, or a session
  with real image-editing capability.

## Phase 15 brief (the next task)

Two parts: wrap up the prior session cleanly (this document is that), then start the
next real design phase. Verbatim brief for Parts 1–3 below.

### Part 1: Retirement into staff

Gladiators currently have exactly three exits: die, escape, sold. Add a fourth: a
gladiator who's aged out or hit a real ceiling (age threshold, or player-initiated
retirement on a proven veteran) can convert into a trainer on the player's own staff
instead.

- This costs nothing to execute. He's not being hired, he's still the ludus's property,
  being repurposed rather than freed, so no gold changes hands either way. Frame the
  copy accordingly, not as a purchase.
- Specialty and `trueSkill` should derive from his own record (best stat, career CA).
  Use your judgment on how a converted gladiator compares to a recruited staff member
  of the same nominal tier — worth a deliberate look at whether he should be a bargain
  (free, but maybe capped lower than a paid specialist) or a genuine steal, your call
  once you see the numbers.
- Since this now exists, drop peer mentorship entirely, don't build it (it was proposed
  in the Round 7 report as a gameplay idea, never built — it aimed at the same
  "capped-out veteran has nothing left to do" problem this solves more directly).

### Part 2: Signature techniques + weapon-type stat bonuses

Build the signature-techniques idea from the Round 7 report (rare, discovered "he's
earned a name for this" quirks at extreme stat/trait combinations, announced as a
milestone, giving a small permanent combat edge), and extend it with a second, related
idea:

- Weapon type should give its own stat bonuses, not just flavor. If gladiators can be
  assigned or trained toward a weapon type (whatever the game currently supports,
  spear/gladius/net-and-trident/etc.), each type should lean into different stats, so
  weapon choice is a real build decision, not cosmetic.
- These two systems should compose sensibly — a signature technique tied to a
  stat/trait combo that a given weapon type naturally leans into should feel earned,
  not coincidental.

### Part 3: Open design call — split Strength into Attack/Strength/Defence?

Current stats are `strength`, `weaponSkill`, `endurance`, `showmanship`, resolved in
combat as `relevantStat + situationalModifiers + roll` against an opponent's
equivalent. The question on the table: should `strength` split into three (Attack,
Strength, Defence), or something leaner like just Attack + Defence replacing the single
Strength? Diagnose before deciding, don't just pick a number of stats up front:

- Look at what `relevantStat` actually resolves to today and where `strength`
  currently pulls weight in the combat formula.
- The concern with three stats: Strength as a third, separate axis next to Attack and
  Defence risks being redundant unless it does something the other two don't (e.g.,
  affects injury severity dealt, damage variance, or a stagger/knockback mechanic,
  rather than hit/dodge chance). If you can't find it real work to do that Attack and
  Defence don't already cover, don't add it just to add it.
- Weapon-type bonuses (Part 2) and this stat question should land together. If a
  weapon type is going to lean into stats, decide the final stat shape first so that
  doesn't need reworking twice.
- Whatever you land on, this touches squad screens, training allocation, and every
  combat calculation, so treat it as a real migration (existing gladiators need sane
  derived values, not resets to zero) and report what you changed and why, not just
  that you changed it.

### After all three

Re-run a short playtest specifically on what's new here (does staff-conversion actually
feel like a real veteran send-off, does a signature technique milestone feel earned
when it fires, does the weapon-type/stat decision hold up in an actual fight) before
returning to any of the still-open items above.
