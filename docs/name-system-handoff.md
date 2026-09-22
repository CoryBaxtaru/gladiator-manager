# Name system rework: handoff

Status: implemented and compiling (`npx tsc -b` passes). This describes what is already
in the repo so a follow-up prompt can build on it rather than redo it.

## Core design decision

Almost no gladiator fought under his birth name. Gladiators were slaves, war captives or
*auctorati*, and the epigraphic record shows them bearing a single Latin or Greek **arena
name** regardless of origin. Flamma, the best-documented gladiator we have, is recorded on
his epitaph as *natione Syrus*: a Syrian called "Flame".

So every fighter now has two names:

- `birthName` - authentic to his culture, generated from that culture's onomastics
- `arenaName` - a single Latin/Greek name assigned on enrolment, origin-independent
- `name` - the display name, set to `arenaName`

Second decision: birth-name pools are split into a **commoner** tier (default) and an
**elite/royal** tier (8% chance). Naming a slave Rhoemetalces or Amanishakheto reads like a
galley-slave called "Prince Augustus".

## Files added

| Path | What it is |
|---|---|
| `src/data/gladiator-name-pools.json` | ~950 researched names, 8 culture groups, arena names, tria nomina parts, ludus names, ~205 Roman places. Every entry carries a confidence flag: `[A]` attested, `[A-g]` attested for a gladiator, `[R]` reconstruction. |
| `docs/gladiator-name-pools.md` | The annotated reference with provenance, per-culture naming quirks, and honest gaps. Read this before touching the data. |
| `src/engine/names.ts` | The generator layer. Loads the JSON, exposes the API below. |

## Files changed

- `src/types.ts` - `Origin` extended with `"Syrian" | "Greek"` (now 8). `Gladiator` gained
  optional `birthName?` and `arenaName?` (optional so pre-existing localStorage saves still
  load; UI falls back to `name`).
- `src/config.ts` - `ORIGIN_STAT_LEAN` entries added for Syrian (`weaponSkill +3`,
  `showmanship +3`) and Greek (`showmanship +4`, `weaponSkill +2`).
- `src/assets/portraits.ts` - `ORIGIN_COLORS` entries for the two new origins.
- `src/engine/generator.ts` - `FIRST_NAMES` and `EPITHETS` deleted. Now calls
  `generateFighterName(origin)` and `originDescriptor(origin)`.
- `src/engine/ludusNames.ts` - now a thin re-export from `names.ts`; `LUDUS_NAMES` still
  exported under that name, so existing imports keep working.
- `src/engine/rivalLudi.ts` - uses `names.ts`; rival gladiators now carry their school as a
  suffix (see below).
- `src/components/SquadScreen.tsx` - detail panel shows `born {birthName}` when it differs.
- `src/App.css` - `.birth-name` style appended.
- `tsconfig.app.json` - `"resolveJsonModule": true` added.

## `src/engine/names.ts` API

```ts
ORIGINS: Origin[]                                   // all 8
pickOrigin(): Origin
generateBirthName(origin): string
generateArenaName(): string
generateFighterName(origin): { birthName, arenaName }
generateRomanCitizenName({ freedman?, abbreviate? }): string   // praenomen + nomen + cognomen
originDescriptor(origin): string                    // tribe/region tag, e.g. "Cherusci"
ludusNameForOwner(nomen): string                    // "Cornelius" -> "Ludus Cornelianus"
generateLudusName(used?: Set<string>): string
ludusEpithet(ludusName): string | null              // "Ludus Neronianus" -> "Neronianus"
LUDUS_NAME_POOL: string[]                           // 80 names
```

## Pool sizes after wiring

```
              commoner  elite  procedural combos
Thracian           67      32       187
Gaul               35      48       288
Roman               0       0         0   (uses tria nomina builder)
Numidian           35      23         0
Germanic           35       0       285
Nubian             11      41         0
Syrian             55      16        88
Greek              30       0         0

arena names: 139     ludus names: 80
```

Procedural generation recombines attested name-elements (prefix + suffix) for Thracian,
Gaulish, Germanic and Syrian only, at 20-35% of rolls. It is deliberately off for Numidian
(Libyco-Berber is only partly deciphered, so recombination would be guesswork) and for
Nubian (the `Amani-` element is the god Amun and is royal-only).

Two throttles are built in:
- Gaulish `-rix` means "king" and is capped at 15% of synthesised Gaulish names.
- The elite/royal tier fires at 8%.

## Nice detail worth keeping

A gladiator picks up his school as a name suffix. *Hilarus Neronianus* at Pompeii means
"Hilarus of the Neronian ludus". `rivalLudi.ts` now does this: rival fighters are generated
after their ludus name is chosen and come out as e.g. "Pugnax Cornelianus". Only adjectival
owner-forms qualify, so `ludusEpithet` returns null for "Ludus Magnus" and "Ludus Dacicus".

## Known gaps / possible follow-ups

1. **Nubian commoner pool is only 11 names.** That is not a bug: there is not one named
   gladiator identified as Nubian or sub-Saharan African in the record, and non-royal
   Meroitic names are scarce. `docs/gladiator-name-pools.md` section 6d proposes the
   historically honest alternative: origin tag plus a Latin arena name, with *Memnon* (the
   Ethiopian king of the Trojan cycle) as the kind of literary joke a lanista would make.
   Not implemented yet.
2. **Freed-gladiator name reversion.** A man who buys his freedom taking his birth name back
   is both historically right and good drama. The data supports it; nothing uses it yet.
3. **Player founder name.** `founderName` is still free text. `generateRomanCitizenName({
   freedman: true })` would offer authentic suggestions: many lanistae were freedmen, since
   the trade was legally *infamis*, so the shape is Latin praenomen + former owner's nomen +
   Greek cognomen (e.g. "Aulus Suettius Anteros", a real Pompeian name).
4. **`ORIGIN_STAT_LEAN` for Syrian and Greek is a guess**, not research. Syrian leans on
   archery/skill reputation, Greek on the showmanship of the Greek-East games. Retune freely.
5. **Rank system.** Greek-East gladiator monuments record rank by *palus* (primus through
   octavus) and crown-count rather than a win tally. That is a ready-made historical
   progression ladder if you ever want one.
6. **oxlint does not run in the Linux dev VM** (`node_modules` holds the Windows native
   binding). Unrelated to this change; `tsc -b` is clean.
