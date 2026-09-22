// Ludus naming follows two conventions attested in the record: a school is named
// after its owner (nomen minus -ius, plus -ianus: Cornelius -> Ludus Cornelianus),
// or after its location (Ludus Capuanus). A third real pattern names it for the
// fighters it houses -- Ludus Dacicus and Ludus Gallicus both existed in Rome.
//
// The pool is assembled in names.ts from src/data/gladiator-name-pools.json, which
// includes the five real Roman schools: Ludus Magnus, Matutinus, Dacicus, Gallicus
// and Aemilius. See docs/gladiator-name-pools.md.

export { LUDUS_NAME_POOL as LUDUS_NAMES, generateLudusName, ludusNameForOwner, ludusEpithet } from "./names";
