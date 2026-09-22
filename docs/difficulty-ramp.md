# Provincial-to-Rival difficulty cliff (phase 6)

Both playtest runs independently stalled at the same tier transition. This
documents the diagnostic done before any opponent numbers changed.

## The two curves

**Opponent CA by tier** (`rivalLudi.ts` `rosterStrengthForTier`, each of 4
stats independently `base + randInt(0, spread)` plus a small origin lean,
20,000-trial simulation of the real formula):

| Tier | base/spread (before) | avg opponent CA |
|---|---|---|
| local | 15/20 | 25.9 |
| provincial | 30/20 | 40.9 |
| rival | 45/20 | 55.9 |
| colosseum | 65/20 | 75.8 |

A flat **+15 CA per tier step**, applied the instant reputation crosses the
threshold.

**Player roster CA over time**, simulating the two channels that actually
grow it with no extra investment (Training Yard left at Lv1, no trainer
hired, single-stat focus, since nothing in the game tells a new player to
prioritize either): daily solo training (`~0.20` chance/day of +1 to one of 4
stats, so `+0.05` CA/day) and showmanship gained on wins only
(`~2.4` points on a win, `/4` into CA, and only fires when winning):

| Day | CA at 30% win rate | CA at 55% win rate (the phase-5 calibration target) | CA at 100% win rate |
|---|---|---|---|
| 19 | 24.8 | 25.3 | 26.1 |
| 25 | 25.3 | 25.9 | 27.0 |
| 43 | 26.8 | 27.8 | 29.7 |
| 67 | 28.7 | 30.3 | 33.3 |

Starting roster average CA on day 1: **23.3**.

## The gap

| Transition | Typically reached | Opponent avg CA | Player avg CA (55% win rate) | Gap |
|---|---|---|---|---|
| Local -> Provincial | day 19-25 | 40.8 | 25.4 | **~15 CA** |
| Provincial -> Rival | day 43-49 | 55.9 | 28.0 | **~28 CA** |

So the opponent curve assumes a roster that's picked up a 5th gladiator and
upgraded the Training Yard well beyond what either playtest run did, or what
anything in the game tells a player to do. Nothing about this is a "stretch";
it's a wall, and it compounds tier over tier since the gap at Rival is nearly
double the gap at Provincial.

## The fix

Two changes together, not just a number tweak:

1. **A difficulty ramp** (`engine/fightday.ts`, `DIFFICULTY_RAMP` in
   `config.ts`): right at the reputation floor for a new tier, a fight day
   matchup has up to a 70% chance of being pulled from the tier *below*
   instead (the tier the player has already proven they can handle), fading
   to 0% by halfway through the new tier's reputation band. A gladiator
   entering Provincial at 65 reputation mostly still fights Local-strength
   opponents at first; by ~105 reputation (halfway to 145) every matchup is
   full Provincial strength. This turns the instant step-jump into an actual
   ramp across roughly the first half of each tier.
2. **A gentler base curve**: `rosterStrengthForTier` base values reduced from
   15/30/45/65 to 15/27/40/56, narrowing the steady-state gap in the back
   half of each tier too, without flattening tier progression into
   meaninglessness.
3. **A win-chance signal before committing**: the same Monte Carlo win-chance
   estimate already built for Challenges is now shown on the regular Fight
   Day selection screen for every eligible gladiator, so a player has real
   information before sending someone out, not just a losing streak after
   the fact.
