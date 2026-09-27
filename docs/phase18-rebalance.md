# Phase 18: progression/economy rebalance

Round 9 (a full, undirected playthrough to a real Praetorian Guard attempt) found:
promotion readiness display could show a bar as cleared when it wasn't; sponsoring a
dying gladiator only ever produced a 1hp revive with no real cost ceiling; a player
could reach Colosseum tier on essentially the starting roster; Master-tier recruiting
was flagged as "effectively unreachable until too late to matter"; the Praetorian Guard
sat at 50-70 CA instead of the intended 70-90; and mood management tools sat idle for
an entire winning run. This is the diagnostic behind every number changed to address
those findings, run in `scratchpad/phase18_sim.js` (a standalone reimplementation of the
real `config.ts`/`engine/{training,scouting,rating}.ts` formulas -- in-browser dynamic
`import()` of the app's own TypeScript modules doesn't work in this Vite dev setup, so
this is the standing method for deriving numbers straight from the live formulas rather
than guessing).

## Part A: promotion readiness display rounded in the player's favor

`PromotionScreen.tsx` displayed `avgBuildingLevel.toFixed(1)` and
`Math.round(avgRosterCA)` against their thresholds. Both round toward the nearer value,
which can round UP past a threshold the true value hasn't actually cleared (confirmed
twice in Round 9: "1.3 / 1.3" shown while the real value was 1.2857; "42 / 42" shown at
41.37). The promotion check itself always used the true unrounded value and correctly
refused the attempt either way -- this was a display-only lie, not an exploit. Fixed by
flooring the CURRENT value in both rows (`Math.floor(x*10)/10` for building level,
`Math.floor(x)` for roster CA) so the display can only ever under-report progress,
never falsely show a bar as met.

## Part B: sponsor-or-die was a bare revival with a flat, decaying-relevance cost

**Full recovery.** `resolveFateDecision` used to just clear `awaitingFateDecision`,
leaving the gladiator at whatever `gravely_injured`/10-days state the fatal fight had
already set -- "saved" but still crippled for the same 10 days an ordinary near-death
would cost. Now sets `condition: "healthy"`, `injuryDaysRemaining: 0` on a successful
sponsorship: the gold cost is the real cost of the choice, there's no need for a second,
lingering one on top.

**Cost formula.** Round 9: fired roughly a dozen times in one run, always affordable,
treasury still climbed to 33k. `SPONSOR_SURVIVAL.costPerCA` alone (a flat CA*10) has no
way to notice either the ludus's actual wealth or that one specific fighter keeps
needing bailing out. Considered three levers (CA, treasury, tier, repeat-use -- the
prompt's own menu) and picked two, deliberately skipping a tier multiplier:

- Re-adding a tier multiplier was rejected on purpose. That's exactly the double-
  counting bug `SPONSOR_SURVIVAL`'s own Phase 13 diagnostic already fixed once (CA
  already climbs with tier as a roster develops; multiplying by tier again double-counts
  the same signal) -- it's what made the pre-Phase-13 formula unaffordable specifically
  at high tiers, the opposite problem from the one being fixed now.
- **Treasury size** (`treasuryFraction: 0.05`): cost is now `max(CA*10, gold*0.05)`.
  This is the lever that actually answers "gold climbed to 33k and it was still
  trivial" -- it reacts to the ludus's real coffers, not its fight tier, so a cash-poor
  Colosseum-tier ludus isn't punished for its tier alone, but a rich one genuinely feels
  it (a 33k treasury alone puts the floor at 1650g, well above what a mid-40s CA fighter
  costs on the CA term).
- **Repeat use** (`repeatMultiplierPerPriorSponsor: 0.6`, keyed by a new per-gladiator
  `timesSponsored` counter): directly targets "fired a dozen times, always affordable."
  A first rescue of a given fighter stays at the base price; leaning on the SAME fighter
  repeatedly gets 60% more expensive each additional time (2nd sponsorship 1.6x, 3rd
  2.2x, ...), so it stops being a free pattern for one death-prone gladiator without
  punishing a single rare rescue.

## Parts C/D/E: one connected pass (recruitment, promotion CA, Guard band)

### Diagnosis first

**Recruit quality per channel x procurator tier** (20,000-trial simulation of the real
generation formula, raw stat average, tierMultiplier=1):

| Channel | Tier | avg CA | p10 | p90 | gem chance |
|---|---|---|---|---|---|
| Slave Market | Journeyman | 25.9 | 22.3 | 29.3 | 24% |
| Slave Market | Master | 31.9 | 28.5 | 35.3 | 32% |
| Auction House | Journeyman | 39.9 | 38.2 | 41.5 | 5% |
| Auction House | Seasoned | 46.9 | 45.2 | 48.5 | 9% |
| Auction House | Master | 54.9 | 53.2 | 56.5 | 13% |
| Volunteer Hall | Journeyman | 28.9 | 26.3 | 31.5 | 9% |
| Volunteer Hall | Master | 37.9 | 35.3 | 40.5 | 17% |

**Finding: `baseStatBonusFraction` was never the problem.** Master genuinely shifts the
whole distribution up, not just the gem tail (Auction House p10 goes 38.2 -> 53.2) --
paying for a better recruiter already visibly raises the floor, per the prompt's own
ask. Left unchanged.

**Weekly net income by tier** (reference roster, ~58% win rate, the same target used in
the original economy-rebalance.md pass): because `recruiterSendCost` scales linearly
with `tierCostMultiplier` (same as fight income) but weekly upkeep does NOT scale with
it, net income grows much faster than tier alone across a run:

| Tier | income/wk | burn/wk | net/wk |
|---|---|---|---|
| Local | 205g | 186g | **19g** |
| Provincial | 513g | 223g | 291g |
| Rival | 1232g | 326g | 906g |
| Colosseum | 2874g | 472g | 2402g |

**Weeks of net income to afford a Master-tier Auction House trip, OLD priceMultiplier
(3.4x):** Provincial 17.6wk, Rival 11.3wk, Colosseum 8.5wk. Provincial and Rival stays
don't typically run 12-18 weeks -- by the time Master was affordable, a player had
usually already moved past the tier it was meant to matter in. This, not recruit
quality, was the actual "Master tier is unreachable until too late" mechanism.

**Training growth curve** (balanced focus, real `trainStat`/`statSpreadMultiplier`
formulas, 300-trial average):

| Yard | Mood | Trainer | CA @ day 200 | CA @ day 400 | CA @ day 600 |
|---|---|---|---|---|---|
| 0 | 65 | none | 27.0 | 30.0 | 32.9 |
| 3 | 65 | none | 29.9 | 36.0 | 42.1 |
| 6 | 65 | none | 33.0 | 41.9 | 51.2 |
| 6 | 90 | skill 70 | 49.2 | 74.5 | 90 (capped) |
| 10 | 65 | none | 37.0 | 50.1 | 62.9 |
| 10 | 90 | skill 70 | 54.2 | 84.4 | 90 (capped) |

**Finding:** with genuinely no investment (yard 0, no trainer -- the same "a new player
did nothing extra" baseline `difficulty-ramp.md` used) a roster still organically drifts
from ~24 to ~33 CA over 600 days. The OLD Colosseum bar (42) sat inside that
no-investment drift band -- reachable by essentially not playing the training/building
systems at all, exactly what Round 9 found (roster CA 41.37 against a 42 requirement).

### The fix

**Part C -- recruiter tier pricing.** `RECRUITER_TIERS.priceMultiplier`: seasoned
1.9 -> 1.3, master 3.4 -> 1.4 (journeyman unchanged at 1). Same Auction House trip now
costs roughly 6.7/4.3/3.3 weeks (seasoned) and 7.3/4.7/3.5 weeks (master) at
Provincial/Rival/Colosseum -- a real, usable-more-than-once investment at the tier it's
meant for, instead of one that only clears once that tier is nearly over.

**Part D -- promotion CA thresholds.** `PROMOTION_READINESS.minAvgRosterCA`:
Provincial 18 -> 20, Rival 30 -> 40, Colosseum 42 -> 55. Set above the no-investment
drift line at every tier (which tops out around 33-42 by lategame with zero training
investment) so clearing one now requires either sustained training investment (yard
level + trainer + focus discipline reaching ~42+ by day 400, ~70+ with a trainer) or
recruiting a stronger roster in (Master-tier Auction House alone already clears 53+),
never just waiting. Building-level thresholds (`minAvgBuildingLevel`) are untouched --
Phase 17 Part A already fixed the neglect-sustain math there and this pass doesn't
revisit it.

**Part E -- Praetorian Guard band.** `COLOSSEUM_FINALE.opponentCAMultiplier`: 1.45 ->
1.3. The multiplier itself was never really the problem -- Round 9 sent 30-48 CA
fighters (the old, too-low Colosseum floor) and got a 50-70 CA Guard, exactly what
1.45x predicts. With Part D's new 55-CA Colosseum floor plus the further training a
player does before maxing Colosseum reputation to unlock this finale, a realistic
top-fighter CA sent here lands around 55-70; 1.3x of that range is 71.5-91, squarely in
the intended 70-90 band, without needing to touch the Guard's own stats in isolation.

## Part F: mood management had no organic pressure during a winning stretch

**Diagnosis.** `recomputeMood`'s baseline was 0 for every gladiator except Brooding
(-1/day); with no active modifier, mood simply holds forever, it never drifts on its
own. A win's mood boost (`COMBAT.winMoodBase`/`winMoodPerMargin`, active 5 days) comfortably
outlasts the 6-day fight-day cycle, so a mostly-winning roster self-sustains at 90-100
indefinitely -- confirmed exactly what Round 9 reported (mood 90-100 all run, toolkit
only touched near an actual loss). The only other things that move mood at all are
combat outcomes and a handful of explicit debuffs (overextension, building imbalance,
sparring injury, debt, escape attempts) -- all reactive to something already going
wrong, never a standing, recurring pressure.

**Decision: this needed a real second pressure source**, not "working as intended."
A winning ludus having happy gladiators is fine; a management toolkit that's provably
dead UI for 90%+ of a competent run is not the system it's meant to be. Added
`MOOD.baselineDailyDecay: -0.3` applied to every gladiator (Brooding's -1/day stacks on
top of it, unchanged). Chosen over new workload/tenure/overcrowding-specific tracking
because roster-over-capacity upkeep and building-imbalance mood penalties already model
that exact pressure -- a third mechanic for it would just duplicate what's there.
Magnitude: small enough that any real winning streak still nets positive mood (a win's
~5-day boost is 3-6x this per active day), but a genuinely idle, benched, or losing
stretch now visibly erodes mood into the management range within a few weeks (~12 weeks
of total neglect from a healthy 65 down to the 40 "Unsettled" line) instead of holding
flat forever.

## What wasn't touched, and why

- `PROMOTION_READINESS.minAvgBuildingLevel` -- Phase 17 Part A already fixed its
  reachability math; this pass only found problems on the CA side.
- `RECRUITER_TIERS.baseStatBonusFraction` / `gemChanceBonus` -- already delivers a real
  floor raise, not just occasional gems; the diagnosis found the COST curve broken, not
  the quality curve.
- Rivalries and Flight Risk's warning window -- out of scope per Phase 17's own
  instruction, untouched again here.
- A tier multiplier on sponsor-or-die cost -- deliberately rejected, see Part B above.

## Next step

This changes how long a run takes and how hard promotion actually is -- needs a real
playtest to confirm it plays differently, not just that the numbers changed.
