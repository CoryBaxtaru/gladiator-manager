# Mood action tuning (phase 3)

Playtesting showed mood actions barely moved mood relative to their cost. This
documents why, and the numbers behind the fix.

## Root cause

`recomputeMood()` (src/engine/mood.ts) applies `modifierSum * 0.15` to mood once per
day a modifier stays active, where `modifierSum` is the sum of every active
modifier's magnitude. So a single modifier's real effect is:

- immediate (the day it's applied): `magnitude * 0.15`
- lifetime total: `magnitude * 0.15 * durationDays`

With the original numbers:

| Action | Cost | Magnitude | Duration | Day-1 effect | Lifetime total |
|---|---|---|---|---|---|
| Feast | 120g | 15 | 5d | +2.25 | +11.25 |
| Devout ritual | free | 8 | 4d | +1.20 | +4.80 |
| Greedy bonus cut (CA 40) | 160g | 10 | 5d | +1.50 | +7.50 |

Break thresholds are minor <=40, major <=25, extreme <10. Pulling a gladiator from a
major break (say, mood 22) back to safety needs roughly +18. The 120g feast supplied
barely an eighth of that on the day it mattered, and never front-loaded, so it never
felt like a rescue.

## Fix

Retuned magnitude only (config.ts `MOOD_ACTIONS`), cooldowns unchanged:

| Action | Magnitude before -> after | Day-1 effect | Lifetime total |
|---|---|---|---|
| Feast | 15 -> 60 | +9.0 | +45 |
| Devout ritual | 8 -> 35 | +5.25 | +21 |
| Greedy bonus cut | 10 -> 40 | +6.0 | +30 |

A feast used right as someone dips into a major break now does most of the work of
pulling them back out in a single day, with the rest of its 5-day window keeping them
clear of the threshold rather than just slowing the slide. It is not a full override
of a bad losing streak: several negative modifiers stacked at once can still push a
gladiator into a break the same day, which is intended, this is a strong tool, not a
guarantee.
