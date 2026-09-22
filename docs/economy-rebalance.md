# Gold economy rebalance (phase 5)

Playtesting reported gold "coming from nowhere." This documents the diagnostic
pass done before any numbers changed, the calibration used to fix it, and the
resulting design.

## Diagnostic: what the economy looked like before this pass

Printed straight from the live config/engine code, before any rework:

**Income**
- Fight win: `goldReward = round((60 + opponentPowerLevel*1.5) * tierMultiplier * performanceMultiplier)`
  - `tierMultiplier`: local 1, provincial 1.8, rival 3, colosseum 6
  - `performanceMultiplier`: `0.7 + 0.5*marginFactor` (range 0.7 to 1.2)
- Fight draw: `round(25 * tierMultiplier)`
- Fight loss: `round(10 * tierMultiplier)`
- Death match win: `gold += 150 + reputationAtStake*0.5` (not tier-scaled at all)
- Instant sale: `price = currentAbility * 6`

**Recurring costs (weekly)**
- Gladiator upkeep: `max(6, round(8 + CA*0.3))` per active gladiator
- Building upkeep: `upkeepPerLevel * level` summed across 7 buildings (`training_yard 15, barracks 10, infirmary 12, armory 12, arena 20, quarters 8, gate 8`)
- Ludus overhead: `totalBuildingLevels * 3`
- Staff salaries: `round(trueSkill * 0.6)` per hired staff, already existed and was already charged in `tick.ts`'s weekly upkeep (the prompt's hypothesis that this was missing turned out false, verified by reading the tick code, not re-implemented)

**One-time costs**
- Building upgrade: `baseCost * costGrowth^level`, e.g. `training_yard` lvl1->2 = 500 * 1.7^1 = 850g
- Recruit candidate: **not tier-scaled at all**, `price = CA*8 + PA*1.2` then a channel multiplier (0.7 / 1.8 / 1). A weak slave-market candidate at CA 20 / PA 30 cost 137g regardless of the player's reputation tier.
- Recruitment trip fee: flat per channel (80 / 260 / 120g), not tier-scaled
- Mood feast: flat 120g regardless of tier
- Mood bonus cut: `CA*4`, not tier-scaled
- Doctor visit: `30*severityMultiplier + injuryDaysRemaining*8`, not tier-scaled

## Root cause

Income scaled with tier (weakly, and inconsistently between win/draw/loss/death-match)
but almost every cost did not. As reputation climbed, purses grew while
recruitment, mood actions, and doctor visits stayed priced for a brand-new
ludus, so a mid-game ludus swam in gold with nothing meaningful to spend it
on, and a struggling ludus had no real downside for losing beyond a token
income cut. Nothing tied gold in or out to a single, checkable scale.

## Reference roster and target

5 gladiators, CA ~25, all buildings level 1, no staff:

| Cost | Amount |
|---|---|
| Gladiator upkeep (5 x max(6, 8+25*0.3)) | 80g/week |
| Building upkeep (sum of upkeepPerLevel, all lvl 1) | 85g/week |
| Ludus overhead (7 levels * 3) | 21g/week |
| **Total weekly burn** | **186g/week** |

Target: a roster fighting every fight day at ~55-58% win rate against
same-tier opponents should net 105-115% of that burn, i.e. 195-214g/week.

## Calibration (real clash math, not a guessed constant)

Reused the actual 5-clash comparison from `engine/combat.ts` (stat +/-13%
variance per clash, most-clashes-won decides the outcome) in a 20,000-trial
Monte Carlo simulation, sweeping the opponent's CA against a CA-25 reference
roster to find the opponent strength that produces a ~55-58% win rate:

| Opponent CA | Win rate | Avg win margin factor |
|---|---|---|
| 22 | 72.6% | 0.545 |
| 23 | 65.7% | 0.510 |
| **24** | **58.2%** | **0.475** |
| 25 | 49.9% | 0.448 |
| 26 | 42.2% | 0.423 |

CA 24 lands the win rate in the target band. At that point:

- `performanceMultiplier` on an average win = `0.7 + 0.5*0.475` = 0.9375
- Fight days/week = 7/6 (fight day every 6 days) -> 5.83 fights/week for a 5-gladiator roster fighting every fight day
- Wins/week = 3.39, losses/week = 2.44, draws ~0 at this matchup
- Income per unit of `basePurseLocal` = `3.39*0.9375 + 2.44*0.15` = 3.55
- Target income = 186 * 1.10 (midpoint) = 204.6g
- `basePurseLocal` = 204.6 / 3.55 = **57.7 -> 58**

This is `FIGHT_ECONOMY.basePurseLocal` in `config.ts`. At 58, a competent
5-gladiator roster fighting every fight day nets roughly 108% of its weekly
burn at Local tier, matching the "grows slowly on a winning record" target.
A roster that loses more than it wins, or skips fight days, nets well under
100% and starts sliding toward debt within a few weeks.

## The rework

- **Income**: one `FIGHT_ECONOMY` block is now the single source for fight
  purses. `basePurse = basePurseLocal * tierMultiplier[tier]`
  (`local 1, provincial 2.5, rival 5, colosseum 10`, reusing the reputation
  tier already gating which opponents are available). Win pays
  `basePurse * (0.7 + 0.5*marginFactor)`, draw pays `basePurse * 0.35`, loss
  pays `basePurse * 0.15` (a token appearance fee, never zero). Death match
  wagers are `basePurseLocal * tierMultiplier[tier] * 4`, tier-scaled instead
  of a flat 150g.
- **Costs**: `tierCostMultiplier(state)` in `engine/economy.ts` returns the
  same `tierMultiplier` value for the player's current reputation tier.
  Recruitment prices and trip fees, mood event costs, and doctor visit costs
  all multiply by it now, so a Colosseum-tier ludus pays Colosseum-tier
  prices for everything, not Local-tier prices with a Colosseum-tier purse.
  Building upgrade costs are deliberately excluded, they already scale on
  their own exponential curve independent of reputation tier.
- **Debt**: the hard floor at 0 gold is gone. Going negative is allowed.
  `debtWeeksActive` tracks consecutive weeks in debt: week 1 is a warning
  plus a small ludus-wide mood penalty, week 2+ accrues weekly interest on
  the negative balance, and week 4+ (repeating every few weeks if unresolved)
  triggers a real consequence, a staff member quits or a gladiator is seized.
  See `engine/debt.ts` for the exact thresholds (`config.ts`'s `DEBT` block).

## Caveat

The reference roster above is 5 gladiators; the game currently starts new
players with 4. A smaller or weaker-than-reference roster will net less than
the 105-115% target even at a good win rate, by design, growth is meant to
require actually building the roster up, not just showing up.
