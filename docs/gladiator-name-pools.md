# Ethnic Name Pools for a Gladiator Ludus Game

Compiled September 2026. Sources are named per section; full source list at the end.

---

## Read this first: the one thing that shapes every list below

**Almost no gladiator fought under his birth name.** Gladiators were overwhelmingly slaves, war captives or *auctorati* (free volunteers who sold themselves under contract), and the surviving epigraphic record — tombstones, Pompeian graffiti, the Greek-East reliefs — shows them bearing a **single arena name**, virtually always Latin or Greek, regardless of where they came from. Flamma, whose epitaph at Lilybaeum records thirty-four fights, is explicitly *natione Syrus*, "Syrian by nation" — and "Flamma" is Latin for *flame*. That is the pattern, not the exception.

So an "ethnic name pool" is really **two different pools**, and your generator will feel much more authentic if you keep them separate:

| Layer | What it is | Historical status |
|---|---|---|
| **Birth name** | The name the man had before capture, drawn from his own culture's onomastics | Attested for the culture, **not** attested in arenas |
| **Arena name** | The single Latin/Greek name he actually fought under | Attested for gladiators, **not** ethnically specific |

Suggested model for the game: generate a birth name from the ethnic pool, then assign an arena name on enrolment. The birth name can persist as flavour ("Mucaporis, called Pardus"), which is both historically defensible and mechanically interesting — a gladiator who earns his freedom might take his old name back.

Two further cautions that will keep the generator from producing anachronisms:

- **Armature names are not ethnicities.** *Thraex*, *Gallus*, *Samnis* are fighting styles defined by kit (the Thraex has a small curved *sica* and a griffin-crested helmet), named after peoples Rome defeated centuries earlier. By the Imperial period a Thraex was usually an Italian or a Greek. Celadus, the Pompeian "Thraex" who was *suspirium puellarum*, tells us nothing about his origin. Do not couple armature to origin in the generator.
- **Confidence flags used throughout:** `[A]` attested for that people in the ancient record. `[A-g]` attested specifically for a gladiator. `[R]` plausible reconstruction built from attested name-elements, not itself on record. Where a whole group is thin, I say so rather than padding.

---

## 1. Thracian

**Naming convention:** single name, no family name. The richest, best-documented pool in this whole document, because Thracians turn up constantly in Roman-era inscriptions from Thrace and Moesia and in auxiliary units. Two shapes coexist: short simple names, and **dithematic compounds** built from a small closed set of elements — which makes this the one group where you can generate essentially unlimited authentic-feeling names procedurally.

### 1a. Compound names, all attested `[A]`

From the Pizos inscription (IGBulg III.2 1690, AD 202) and related Thracian epigraphy:

```
Auluzenis      Auluporis      Aulutralis     Bithytralis
Brasitralis    Breizenis      Daleporis      Daletralis
Diazenthos     Diascuporis    Dytouporis     Dytoutralis
Eptetralis     Eptaikenthos   Epteporis      Mucatralis
Mucaporis      Mucakenthos    Mucatra        Mucapor
```

### 1b. Simple / short names, attested `[A]`

```
Bithus     Beithys    Dinis      Dizas      Zipas      Tarsa
Doles      Durises    Brasus     Seuthes    Teres      Cotys
Sitalces   Amadocus   Sparatocus Bergaios   Mostis     Olorus
Getas      Diegylis   Rabocentus Cosingas   Ziselmius  Syrmus
```

**Sparatocus** is worth singling out: it is the attested Odrysian royal name behind *Spartacus*, our one genuinely Thracian gladiator. Good anchor name for the player's own ludus lore.

### 1c. Dynastic / high-status names, attested `[A]`

Use these sparingly — a slave in a ludus called Rhoemetalces reads like a peasant named Rex. Good for rival ludus patrons, Thracian client-kings, or a gladiator who claims royal descent.

```
Rhescuporis   Rhoemetalces   Cersobleptes   Berisades
Cetriporis    Hebryzelmis    Dromichaetes   Zalmodegicus
Rhemaxos      Charnabon      Cothelas       Abrupolis
```

### 1d. Getic / Dacian names — the northern cousins, attested `[A]`

Linguistically close enough to read as the same family; historically distinct, so flag them in-game if you care. The first block is exceptional material: **ordinary, non-elite Dacian cavalrymen** named on ostraca from Eastern Egypt after Trajan's conquest. These are the closest thing we have to "what an average Dacian was actually called."

```
Dadas      Dadazi     Zoutoula   Dotos      Dotouzi    Dieri
Diernais   Diengis    Didas      Blaikisa   Blegissa   Diourdanos
Thiadicem  Avizina    Dourpokis  Kaigiza    Dardiolai  Denzibalos
Pouridour  Thiaper    Tiatitis   Dekinais   Rolouzis
```

Elite Getic/Dacian `[A]`: `Burebista, Decebalus, Diurpaneus, Cotiso, Comosicus, Deceneus, Scorilo, Duras, Dapyx, Dicomes, Rholes, Zyraxes, Zoltes, Oroles, Rubobostes, Pieporus, Tarbus, Bicilis, Vezinas, Natoporus`

### 1e. Compound generator (prefix + suffix)

Every combination below is built from elements that genuinely combine in the record, so output is `[R]` but linguistically sound.

- **Prefixes:** `Aulu-, Bithy-, Bei-, Brasi-, Brei-, Dale-, Dia-, Diasku-, Dytou-, Epta-, Epte-, Muca-, Zi-, Dini-, Tarsa-, Seuthi-, Rhesku-`
- **Suffixes:** `-zenis, -poris, -por, -tralis, -tralos, -kenthos, -kenthus, -centus, -zis, -mes, -thes`

Examples: *Mucazenis*, *Eptaporis*, *Diatralis*, *Bithykenthos*, *Daletralos*.

### 1f. Quirks

- Patronymic is expressed by simple apposition in Greek genitive — *Mucakenthos Beithyos*, "Mucakenthos son of Bithus." Nice for a lineage system.
- Romanised Thracians took citizen names but kept the Thracian name as cognomen: *Aurelius Mucatralis*, *Traianus Mucianus*. Perfect for a freed gladiator who gains citizenship.
- Avoid appending Latin `-us` to the compound names. *Mucaporis* is right; *Mucaporius* is not.
- Thracian and Illyrian are often confused in pop sources. Illyrian names (Bato, Pinnes, Dasius, Scenobarbus, Verzo, Epicadus, Temus, Panes, Tata) are a separate `[A]` pool if you want a ninth group cheaply — Bato and Dasius in particular are extremely common in Roman-era Dalmatia.

---

## 2. Gallic

**Naming convention:** single name, very often a transparent dithematic compound of heroic vocabulary — *Vercingetorix*, "great king of warriors." Under Rome, Gauls adopt the tria nomina but almost always keep the Gaulish name as the cognomen (*Gaius Julius Vercondaridubnus*), which means the native stock survives right through the Imperial period.

### 2a. Chieftains, nobles and leaders, attested `[A]`

Nearly all from Caesar's *Bellum Gallicum* and contemporary sources. High-status — better for patrons, rival lanistae's prize captives, or a gladiator with a dangerous past than for rank-and-file.

```
Vercingetorix   Celtillus       Critognatus     Vercassivellaunus
Ambiorix        Catuvolcus      Dumnorix        Diviciacus
Orgetorix       Cingetorix      Indutiomarus    Commius
Litaviccus      Convictolitavis Eporedorix      Viridomarus
Viridovix       Camulogenus     Lucterius       Drappes
Correus         Cotuatus        Conconnetodumnus Tasgetius
Moritasgus      Acco            Segovax         Carvilius
Taximagulus     Mandubracius    Cassivellaunus  Boduognatus
Casticus        Liscus          Cotus           Teutomatus
Epasnactus      Sedullus        Vertiscus       Roucillus
Nammeius        Verucloetius    Bituitus        Magalos
Adiatorix       Dumnacus        Ollovico        Iccius
```

### 2b. Ordinary Gauls — craftsmen, potters, soldiers, attested `[A]`

This is the block you actually want for gladiators. Drawn from the Gaulish onomastic corpus (dedications, La Graufesenque potters' accounts, terra sigillata stamps). These are working men's names, not kings'.

```
Atto          Atepomarus    Adnamatus     Agedillus     Andegenus
Ambio         Anbiorix      Cintugnatus   Cintusmus     Dagomarus
Divixtus      Drutus        Epos          Esumopas      Excingomarus
Litugenus     Litumaros     Nertomaros    Oclicnos      Ollognatus
Rextugenos    Sacrillos     Segomaros     Senognatus    Solimarus
Suratus       Tancorix      Toutiorix     Vepogenus     Bellicus
Congonnetiacus Lugurix      Vassorix      Cobnertus     Bilicatus
```

Note: several of these carry a Latin `-us` ending in the record (*Agedillus*, *Cintusmus*) because they were written by men who wrote Latin daily. Both the raw Gaulish form and the Latinised form are legitimate — *Segomaros* / *Segomarus*. Useful toggle if you want Romanisation to be a visible mechanic.

### 2c. Compound generator

- **Prefixes:** `Ambi-, Bodu-, Camulo-, Catu-, Cintu-, Congonne-, Dago-, Dubno-/Dumno-, Epo-, Exingo-, Litu-, Nerto-, Ollo-, Rextu-, Sego-, Seno-, Souli-/Soli-, Tanco-, Teuto-/Touto-, Vepo-, Ver-, Virido-`
- **Suffixes:** `-rix (king), -maros/-marus (great), -genos/-genus (born of), -gnatus (son of), -dubnos (world), -talus (forehead), -valos (ruler), -vellaunus (commanding), -bnertus (strength), -cnos (son of)`

Examples `[R]`: *Catumaros*, *Segogenos*, *Bodurix*, *Ollomaros*, *Camulognatus*, *Vepomaros*.

### 2d. Quirks

- The `-rix` element means *king*. It is common in real names but it is a status claim; used on every third gladiator it will read as parody. Keep it under about 15% of Gallic output.
- The *Gallus* armature was already obsolete by the early Empire, replaced by the *murmillo*. If the game is set in the Principate, don't offer "Gallus" as a fighting style; the **Ludus Gallicus** in Rome, however, is real and attested.
- Feminine forms end `-a`: *Belatumara*, *Deuognata*, *Camulognata*. Relevant only if you have female NPCs.
- Do not use Insular Celtic names (Conall, Fergus, Brian, Niall). They are the wrong branch and centuries too late.

---

## 3. Roman

Two quite different lists are needed here, so this section splits.

### 3a. Arena names actually borne by gladiators, attested `[A-g]`

Every name here is on record for a real gladiator. This is the single most valuable list in the document — these are not reconstructions.

**From Pompeii and Campania** (CIL IV 2508 and related graffiti; ludus affiliation noted where the source gives it):

```
Nobilior (Julian ludus)    Pugnax (Neronian)     Murranus (Neronian)
Cycnus (Julian)            Atticus (Julian)      Herma (Julian)
Scylax (Julian)            Astus (Julian)        Princeps (Neronian)
Hilarus (Neronian)         Creunus               Celadus (Thraex)
Crescens (retiarius)       Severus               Albanus
Faustus (murmillo)         Armentarius (murmillo)
```

**From epitaphs and literary sources across the West:**

```
Flamma (secutor, natione Syrus, 34 fights)   Priscus     Verus
Spiculus (Nero's favourite)                  Columbus    Tetraites
Carpophorus (bestiarius)                     Pardus      Probus
Iuvenis    Glaucus (of Mutina)   Urbicus (secutor, Milan)   Macedo
Exsochus (essedarius, Cologne)               Triumphus   Oceanus
```

**Gladiators who kept a full citizen name** — freeborn volunteers (*auctorati*) and citizens:

```
Marcus Attilius (tiro, beat Hilarus)
Marcus Antonius Exochus (Thraex, Rome, CIL VI 10194)
Sextus Iulius Felicissimus (bestiarius, Aix-en-Provence)
Quintus Petillus     Publius Ostorius     Lucius Fabius
```

### 3b. Arena-name generator by semantic category

The attested corpus falls into clean thematic buckets. Generate from these and output will be indistinguishable from the real record.

- **Force and violence:** `Ferox, Invictus, Victor, Fortis, Certus, Acer, Rapidus, Validus, Celer, Pugnax, Atrox, Saevus, Durus, Asper, Vehemens, Mucro (sword-point), Rixas (brawler)`
- **Fire, storm and light:** `Flamma, Fulgur, Fulmen, Ignis, Aquilo, Boreas, Auster, Nubes, Corusco, Lucifer`
- **Animals:** `Leo, Tigris, Pardus, Pardalas, Aquila, Draco, Dracon, Lupus, Taurus, Ursus, Serpens, Columbus (dove), Cycnus (swan), Hirundo, Scylax (puppy), Vulpes, Aper`
- **Myth and heroes:** `Hercules, Achilleus, Achillia, Aiax, Patroclus, Hector, Perseus, Bellerophon, Hippolytus, Narcissus, Tantalus, Thersites, Melanippos, Polydeukes, Amazon`
- **Luck and favour:** `Felix, Faustus, Fortunatus, Hilarus, Primus, Maximus, Princeps, Triumphus, Nobilior, Superbus, Auctus, Optatus`
- **Beauty and value:** `Unio (pearl), Zmaragdos (emerald), Chrysus (gold), Chrysopterus (gold-winged), Margaretes (pearl), Kallimorphus (fair-formed), Euprepes (comely), Pulcher, Decoratus`
- **Wry and ironic** — a genuine and underused vein: `Peplos (a dress), Mutatus (changed), Glas, Calandio, Astus (cunning), Iuvenis (kid), Secundus (second)`

### 3c. Quirks

- Gladiator names are **single names**, no praenomen, no gentilicium — unless the man was freeborn or freed, in which case he may appear with the full citizen formula and his arena name as cognomen.
- Names ending `-ianus` (*Neronianus*, *Iulianus*) after the arena name are **not** part of the name: they mark which ludus owned him. *Hilarus Neronianus* means "Hilarus of the Neronian school." This is an extremely good mechanic to model — a gladiator's name should acquire the ludus suffix when bought.
- Imperial-era Latin often writes Greek names with Latin endings and vice versa. *Neikephoros* / *Nicephorus*, *Hermas* / *Herma*. Both forms are legitimate; varying them adds texture.

---

## 4. Numidian

**Naming convention:** single Libyco-Berber name. The Numidian kingdoms sat inside Carthage's cultural orbit, so **Punic names circulate alongside native Libyan ones**, sometimes in the same family. Both belong in the pool.

**Honest caveat:** the Libyco-Berber script is only partially deciphered and the corpus is small. Royal names are secure; the ordinary-person names below come from Thugga and other bilingual or Libyan inscriptions and their readings are contested in places. I have flagged accordingly.

### 4a. Royal and noble Numidian / Mauretanian, attested `[A]`

```
Masinissa (MSNSN)   Gaia (Gala)      Micipsa       Mastanabal
Gulussa             Jugurtha         Hiempsal      Adherbal
Oezalces            Capussa          Lacumazes     Mazaetullus
Massiva             Syphax           Vermina       Hiarbas
Juba                Bocchus          Bogud         Sosus
Mastanesosus        Tacfarinas       Zilalsan
```

*Tacfarinas* — the Musulamian deserter who led the great African revolt of AD 17–24 — is the standout here: genuinely native in form, non-royal in status, and exactly the sort of man who ends up in an arena.

### 4b. Non-royal names from Libyan and bilingual inscriptions, attested `[A]` (readings uncertain for several)

```
Shufet     Afshan     Banay      Shanok     Tanaku     Yirashtan
Sadyalan   Ashyan     Ankikan    Patash     Sactut     Ihimir
Salmedenkez Sakedbaten Mesekesben Abdeshmun  Magon
```

### 4c. Punic names in circulation in Numidia, attested `[A]`

Carthaginian, not Libyan — but genuinely current in the region and a perfectly defensible origin for an African fighter. Flag them as Punic in-game if you want the distinction visible.

```
Hannibal   Hasdrubal  Hamilcar   Hanno      Himilco    Bomilcar
Bostar     Mago       Gisco      Muttines   Maharbal   Carthalo
Adherbal   Hannon     Abdmelqart Baalyaton  Eshmunazar Gerashtart
```

### 4d. Generator elements `[R]`

Libyan names cluster around recurring segments: `Mas-/Mast-` (frequent initial, as in Masinissa, Mastanabal, Mastanesosus), `-san`, `-bal` (Punic *Baal*), `Iu-/Yu-`, `-tan`, `-nes`. Recombinations such as *Mastansan*, *Masitan*, *Yugurbal* are reconstruction, not record — use them only if you need volume, and keep them a minority of output.

### 4e. Quirks

- `-bal` endings are the Punic god Baal. An entirely Libyan-speaking family would be less likely to use them; a Carthaginianised noble family very likely would.
- Romans called the region's people *Numidae*, *Mauri*, *Gaetuli*, *Musulamii*, *Garamantes* — four or five distinct tribal identities lumped together. A "Gaetulian" or "Garamantian" origin tag is more specific and more interesting than a flat "Numidian."
- In Roman African epitaphs, Libyan names survive as *cognomina* under a Latin citizen formula. A romanised African might be *Lucius Iulius Iugurtha*.
- Avoid modern Berber/Amazigh given names (Idir, Massinissa as a modern name, Yidir, Amazigh). Anachronistic by two thousand years even where the root is genuinely ancient.

---

## 5. Germanic

**Naming convention:** single dithematic name built from warrior vocabulary, same structural logic as Gaulish. Everything we have is filtered through Latin ears, so forms are Latinised — *Arminius*, *Segimerus*, *Chariovalda* — and the underlying Germanic forms are reconstructions.

### 5a. Attested Roman-era Germanic names `[A]`

From Tacitus, Caesar, Velleius, Dio and Latin inscriptions of the Rhine frontier.

```
Arminius      Segestes      Segimundus    Segimerus     Sesithacus
Inguiomerus   Flavus        Italicus      Thumelicus    Chariovalda
Chariomerus   Actumerus     Catumerus     Adgandestrius Ballomar
Maroboduus    Catualda      Vannius       Vangio        Sido
Gannascus     Malorix       Verritus      Boiocalus     Nasua
Cimberius     Ariovistus    Cruptorix     Civilis       Briganticus
Classicus     Tutor         Labeo         Chrauttius    Gambax
```

`Chrauttius` and `Gambax` come from the Vindolanda writing-tablets and are unusually valuable: ordinary soldiers, not princes.

Female `[A]`: `Veleda, Ganna, Albruna, Thusnelda, Ramis`

### 5b. Compound generator

- **Prefixes:** `Hari-/Chari- (army), Segi- (victory), Theud- (people), Gund- (battle), Hild- (battle), Wulf-/Vulf- (wolf), Brand- (sword/fire), Rand- (shield), Berg- (protect), Alah- (sanctuary), Ans- (god), Frith- (peace), Rik- (rule), Mund- (protection), Bald- (bold), Gaut-, Ermin-`
- **Suffixes:** `-mar/-mer/-merus (famous), -rik/-ricus (ruler), -vald/-valda (power), -gast (guest/stranger), -mund (protector), -bad (battle), -hari (army), -brand (sword), -wulf (wolf), -gis/-gisil (hostage/pledge)`

Examples `[R]`: *Segibrand*, *Hariwald*, *Theudomer*, *Gundomar*, *Wulfhari*, *Randomerus*.

### 5c. Quirks

- **Chronology matters here more than anywhere else.** The famous Gothic, Vandal and Frankish names — Alaric, Genseric, Theodoric, Chlodovech, Athanaric, Fritigern — belong to the 3rd–5th centuries. If your game sits in the 1st–2nd century (the classic ludus era), they are wrong. Names in 5a are safe for the early Empire.
- Germanic captives really did reach the arena in volume: Caesar, Augustus, Nero and Domitian all put German prisoners into shows, and the imperial German bodyguard (*Germani corporis custodes*) shows the taste for them. So a Germanic-origin gladiator is well-grounded even though no individual one is named.
- Latinisation is the rule in any written record: a Germanic gladiator would appear as *Bructerus*, *Cherusca*-adjacent, or simply under a Latin arena name. Tribal names double as convenient origin labels: `Cherusci, Chatti, Marcomanni, Quadi, Bructeri, Chauci, Frisii, Batavi, Tencteri, Usipetes, Sugambri, Suebi, Semnones, Langobardi, Hermunduri, Cimbri, Teutones`.
- Do not use Norse names (Ragnar, Bjorn, Sigurd, Leif). Wrong branch, and roughly eight centuries early.

---

## 6. Nubian / sub-Saharan African

**This is the group where the honest answer is: the evidence does not support what the brief asks for, and I would rather say so than invent.**

What is true: Rome knew Nubia (Kush/Meroë) well, fought it under Augustus, traded with it, and enslaved people from it and from further south. Dark-skinned Africans — *Aethiopes* in Roman usage — appear in Roman art, in the *venationes* as animal-handlers, and in the enslaved population. What does **not** exist is a single named gladiator identified as Nubian or sub-Saharan African. Not one.

What we do have is a real Meroitic onomastic corpus, from Kushite funerary stelae and royal inscriptions. It is authentic — but it is Kushite, not "gladiatorial," and the royal names in particular carry status baggage.

### 6a. Non-royal Meroitic names from funerary inscriptions, attested `[A]`

The usable pool. Short, and I am not going to pad it.

```
Arilanemakas   Malutuna    Ataqu      Mitasalabe
Natarura       Qurqurla    Qurtakara  Abratoye
```

Post-Meroitic Nobadian / Blemmye rulers `[A]`: `Silko, Kharamadoye, Tamal`

### 6b. Royal Kushite / Meroitic names, attested `[A]` — use with care

```
Piye (Piankhy)   Shabaka         Shebitku        Taharqa
Tantamani        Atlanersa       Senkamanisken   Anlamani
Aspelta          Malonaqen       Karkamani       Siaspiqa
Nasakhma         Talakhamani     Baskakeren      Harsiotef
Akhratan         Nastasen        Arakamani       Amanislo
Arnekhamani      Arqamani        Adikhalamani    Teriteqas
Amanirenas       Amanishakheto   Natakamani      Amanitore
Tanyidamani      Amanakhareqerema Shorkaror      Teqorideamani
Amanipilade      Amanitenmemide  Amanikhatashan  Amanitaraqide
Akinidad         Arakakhataror   Amannote-erike  Aryamani
```

### 6c. Generator elements `[R]`

Meroitic names commonly carry `Amani-` (the god Amun) as a theophoric element, plus segments like `-qo`, `-tore`, `-deamani`, `-khatashan`, `Ata-`, `Qur-`, `Mal-`, `Nata-`, `-lebte`, `-taror`.

**Critical quirk:** `Amani-` names are overwhelmingly **royal**. Generating an enslaved fighter called *Amanideqo* is roughly like naming a galley-slave "Prince Augustus." Reserve `Amani-` compounds for Kushite envoys, rival patrons, or a gladiator whose whole story is that he was royal once. For rank-and-file, use the 6a shapes: two or three syllables, `-a` and `-u` endings, no god-element.

### 6d. What I recommend you do instead

For a sub-Saharan gladiator, the historically accurate outcome is that Rome gave him a Latin or Greek arena name and an origin tag. Consider generating:

- **Origin tags** `[A]`: `Aethiops, Nubia, Meroe, Blemmys, Garamas, Troglodyta` (the last two are Roman geographic labels for peoples south and east of the province)
- **Arena names** from the standard Latin/Greek pool in §3b, weighted toward the exotic-sounding: `Aethiops, Niger, Fuscus, Aquilo, Memnon` — *Memnon* especially, the Ethiopian king of the Trojan cycle, which is exactly the kind of literary joke a Roman *lanista* would make.
- **Birth name** from 6a, surfaced only as flavour.

That combination is both playable and defensible, and it does not require me to make up Nubian names.

---

## 7. Syrian / Levantine

**Naming convention:** single Aramaic name, very often theophoric, plus a patronymic with *bar* ("son of") in Palmyrene usage — *Zabdilah bar Ogeilu*. Greek and Latin transliterations vary wildly, which is a feature: you can generate the same name in two registers.

Flamma, the best-documented gladiator in the entire Latin record, was Syrian by origin. This group is the best-anchored of all the non-Italian ones.

### 7a. Palmyrene and Syrian Aramaic names, attested `[A]`

```
Zabdas       Zabdibol     Zabdilah     Zebida      Zabbaeus
Wahballat    Odainat      Maliku       Malichus    Hairan
Ogeilu       Taimarsu     Taimai       Taimallat   Yarhai
Barnebo      Bar'ateh     Moqimu       Male        Elahbel
Animu        Sa'adi       Bonne        Haddudan    Lishamsh
Nurbel       Belshuri     Nebuzabad    Ogga        Shalamallat
Nasrallat    Abdallath    Abdarsas     Abdousiris  Abdasamsos
Abdaasthores Salamagathes Aailameis    Aaphgatheis
```

### 7b. Emesene, Nabataean and Ituraean dynastic names, attested `[A]`

```
Sampsigeramus   Iamblichus    Sohaemus     Azizus
Bassianus       Alexianus     Uranius      Aretas (Haritat)
Obodas          Rabbel        Syllaeus     Malichus
Gamilat         Shaqilat      Huldu        Zenobia (Bat Zabbai)
```

### 7c. Judaean names, attested `[A]`

Historically pointed: after the fall of Jerusalem in AD 70, Titus distributed Judaean captives to provincial amphitheatres, and Josephus records thousands dying in the shows. A Judaean gladiator is one of the best-evidenced origin stories available to you.

```
Shimon (Simon)   Yehoshua (Jesus)   Yosef (Joseph)   Yohanan (John)
Eleazar          Yehudah (Judas)    Menahem          Hananiah
Matityahu        Yaakov (James)     Levi             Zakkai
Gorion           Niger (of Peraea)  Yair             Shaul
```

### 7d. Generator elements

- **"Servant of" prefix** `[A]` pattern: `Abd-` + divine name → `Abdallath, Abdarsas, Abdasamsos, Abdousiris, Abdbel, Abdmelqart`
- **Theophoric elements (divine names of Palmyra and Syria):** `Bel, Bol, Yarhibol, Aglibol, Malakbel, Nebo, Shamash (-samsos), Allat (-allath), Atargatis, Baalshamin, Elah`
- **Common prefixes:** `Zabd- (gift), Taim- (servant), Wahb- (gift of), Bar- (son of), Moqim- (raiser), Shalam- (peace), Nasr- (help)`
- Recombinations such as *Zabdallath*, *Taimbel*, *Wahbnebo* are `[R]` but structurally correct.

### 7e. Quirks

- Greek/Latin renderings of the same Aramaic name diverge hard: Aramaic *Wahballat* → Latin *Vaballathus*; *Odainat* → *Odaenathus*; *Bat Zabbai* → *Zenobia*. If your game has any Romanisation mechanic, this is free texture.
- Palmyrene men carry long patronymic chains — three or four generations on a tombstone. Overkill for a gladiator but excellent for a wealthy Syrian patron of the games.
- Roman authors used "Syrian" loosely for everyone from Antioch to Petra. Sub-tags worth using: `Palmyrenus, Antiochenus, Emesenus, Nabataeus, Iudaeus, Commagenus, Ituraeus, Berytius`.
- Syrian archers (*sagittarii*) were a famous Roman auxiliary speciality. A Syrian gladiator with a missile-weapon background is a defensible characterisation.

---

## 8. Greek

**The richest gladiatorial pool in this entire document**, because gladiature in the Greek East produced hundreds of carved relief-stelae naming the dead man, his armature, his rank (*palus*) and his victory count. Everything in 8a is a name a real gladiator actually fought under.

### 8a. Attested gladiator names from the Greek East `[A-g]`

From Aphrodisias, Halikarnassos, Iasos, Mylasa, Stratonikeia, Alabanda, Thessalonica, Marcianopolis. Armature noted where preserved.

```
Polyneikes (20 fights undefeated)   Pardalas       Unio          Hermas
Podenemus        Narcissus         Euplous (murmillo)  Eupithanus
Calandio (retiarius)  Pheropes (retiarius)   Xanthus (retiarius)
Patroclus (murmillo)  Thersites (murmillo)   Caestillus (provocator)
Fortis (retiarius)    Anicetus (secutor)     Skirtos (retiarius)
Margaretes (provocator)   Secundus   Menander (venator)
Eirenion (essedarius)     Melanippos (retiarius)   Eurotas (murmillo)
Stephanos (retiarius)     Zmaragdos (murmillo)     Marius Strenos (Thraex)
Hilaros (secutor)         Amazon (provocator)      Achillia (provocator)
Tyrannus (murmillo, 28 wins)   Halyces (essedarius)   Gaius (murmillo)
Ceramyllus (murmillo)     Eucarpus (Thraex, left-handed)  Mutatus (essedarius)
Peplos (murmillo)         Dracon (Thraex)     Glas (Thraex)   Rixas (Thraex)
Myrsinus (Thraex)         Aurigas (retiarius)  Kallimorphus (murmillo)
Kaptialus (provocator)    Euprepes (provocator)  Chrysopetasus (essedarius)
Mucro (provocator)        Droserus (provocator)  Chrysus (provocator)
Chrysopterus (secutor)    Vitalius (murmillo)    Amaraios (provocator)
Eumelos (retiarius)       Leandros (provocator)  Achilleus   Polydeukes
Neikephoros Synetus       Marcianus (secutor)    Chryso[-]
```

*Amazon* and *Achillia* are the two named female gladiators, from the Halikarnassos relief now in the British Museum — both recorded as discharged (*missae*). If you want gladiatrices in the game, those are your anchors.

### 8b. Ordinary Greek names — for owners, trainers, doctors, patrons `[A]`

```
Demetrios   Nikanor     Theodoros    Apollonios   Diodoros
Herakleides Sostratos   Philon       Kleon        Timotheos
Zenon       Aristeas    Menekrates   Epaphroditos Onesimos
Trophimos   Hermogenes  Zosimos      Eutyches     Philetos
Diadoumenos Nikostratos Agathopous   Soterichos   Straton
Antiochos   Alexandros  Theophilos   Isidoros     Kallistos
```

Greek names are also the standard stock of **freedmen** across the Empire — the *doctor* (trainer) and *medicus* of a ludus were very often Greek freedmen. That is a good default for those roles.

### 8c. Quirks

- Greek-East gladiator monuments record **rank by *palus*** (first through eighth class) and crown-count rather than a simple win tally. If you want a rank system with historical grounding, *primus palus* down to *octavus palus* is it.
- Latin names appear freely among Greek-East gladiators (*Unio*, *Fortis*, *Secundus*, *Vitalius*, *Mucro*) and Greek names freely in the West. Do not partition the two pools strictly — the mixing is the authentic state.
- In Greek inscriptions gladiators are *monomachoi*, and the shows are tied to the imperial cult and the office of *archiereus* / *asiarch*. A Greek patron of games is a priest of the imperial cult, not a *lanista* in the Italian sense.
- Avoid modern Greek forms (Yannis, Kostas, Dimitris) and Homeric names that were never real given names in the period.

---

## 9. Lanistae, patrons and editores — full Roman citizen names

### 9a. Attested by name `[A]`

**Lanistae proper** are badly under-recorded, because the profession was legally *infamis* — a lanista ranked with pimps and was barred from civic honours, so men did not advertise it on tombstones. The one everyone knows is real:

- **Gnaeus Cornelius Lentulus Batiatus** (also given as *Vatia*) — of Capua, the man Spartacus broke away from.
- **Gaius Aurelius Scaurus** — owner of a gladiatorial school; Valerius Maximus (2.3.2) records that the consul Rutilius Rufus borrowed Scaurus's trainers in 105 BC to teach swordsmanship to the legions. Valerius does not actually call him *lanista*, but a school owner is what he is.

**Editores and patrons of games at Pompeii**, all attested `[A]`, and much better material for rival-ludus owners and patrons:

```
Aulus Suettius Certus           Decimus Lucretius Satrius Valens
Aulus Clodius Flaccus           Gnaeus Alleius Nigidius Maius
Numerius Festius Ampliatus      Marcus Tullius
Quintus Monnius Rufus           Marcus Cominius Heres
Aulus Suettius Anteros          Numerius Popidius Rufus
Tiberius Claudius Verus         Numerius Veius Barcha
```

### 9b. Tria nomina generator

`praenomen + nomen + cognomen`. Praenomina were few and heavily repeated — do not invent new ones.

**Praenomina** (this is effectively the complete list; abbreviate as Romans did):
```
Aulus (A.)      Appius (Ap.)    Gaius (C.)      Gnaeus (Cn.)
Decimus (D.)    Kaeso (K.)      Lucius (L.)     Mamercus (Mam.)
Manius (M'.)    Marcus (M.)     Numerius (N.)   Publius (P.)
Quintus (Q.)    Servius (Ser.)  Sextus (Sex.)   Spurius (Sp.)
Titus (T.)      Tiberius (Ti.)  Vibius (V.)
```

**Nomina (gentilicia):**
```
Aemilius    Alleius     Antonius    Aurelius    Caecilius   Calpurnius
Claudius    Clodius     Cominius    Cornelius   Domitius    Fabius
Festius     Flavius     Fulvius     Holconius   Istacidius  Iulius
Iunius      Licinius    Livius      Lucretius   Manlius     Marcius
Minucius    Monnius     Munatius    Naevius     Nigidius    Numisius
Octavius    Papirius    Petronius   Plautius    Pompeius    Pomponius
Popidius    Porcius     Postumius   Quinctius   Salvius     Satrius
Sempronius  Sergius     Servilius   Sextius     Statius     Suettius
Sulpicius   Terentius   Tullius     Umbricius   Valerius    Veius
Vettius     Vibius      Vipsanius
```

**Cognomina:**
```
Agricola   Albinus    Balbus     Barbatus   Bassus     Blandus
Brocchus   Brutus     Capito     Carbo      Celer      Cicero
Crassus    Crispinus  Crispus    Dentatus   Dives      Drusus
Faustus    Felix      Flaccus    Fronto     Fuscus     Galba
Gallus     Gemellus   Geta       Glabrio    Gracchus   Lentulus
Longinus   Longus     Lucanus    Lupus      Macer      Macrinus
Magnus     Marcellus  Maximus    Merula     Nasica     Nerva
Niger      Pansa      Paullus    Piso       Priscus    Proculus
Pulcher    Quadratus  Regulus    Rufus      Rusticus   Sabinus
Saturninus Scaeva     Scaevola   Scaurus    Seneca     Severus
Silanus    Strabo     Sulla      Taurus     Tubero     Tullus
Varro      Varus      Vatia      Verus      Vitulus    Certus
Maius      Valens     Ampliatus  Heres      Anteros    Barcha
```

### 9c. Quirks worth modelling

- **The freedman lanista is the most authentic profile of all.** Because the trade was disreputable, many lanistae were freedmen. A freedman's name is `praenomen + nomen of his former owner + his own slave name (usually Greek) as cognomen`: *Gaius Salvius Eros*, *Marcus Vettius Diadumenus*, *Aulus Suettius Anteros* (that last one is real). If you want the player character or rivals to feel right, generate a good chunk of lanistae this way — Latin praenomen + Latin nomen + Greek cognomen.
- **Patrons are not lanistae.** The *editor* who pays for the show is a magistrate buying popularity; the *lanista* is the tradesman who supplies and trains the men and is despised for it. Two different social positions, and a good source of in-game tension.
- Women could own gladiatorial familiae and finance games — Eumachia at Pompeii is the model for a wealthy female patron. Female name = feminine form of the nomen: *Lucretia*, *Alleia*, *Holconia*, *Istacidia*.
- Imperial-period ludi in Rome were state property run by a *procurator familiae gladiatoriae*, an equestrian official — not a private lanista. If the game spans that era, the top of the market is the emperor.

---

## 10. Ludus names and Roman place names

### 10a. Real, attested ludi `[A]`

**In Rome** (the imperial schools, most established under Domitian beside the Colosseum):

- **Ludus Magnus** — the great school, linked to the Colosseum by tunnel
- **Ludus Matutinus** — "the morning school," trained *bestiarii* for the morning beast-hunts
- **Ludus Dacicus** — named for Dacian captives/armature
- **Ludus Gallicus** — named for Gauls
- **Ludus Aemilius** — older, possibly built by Lepidus; later converted into the *balneum Polycleti*

**Named in gladiator inscriptions by their imperial owner:**

- **Ludus Iulianus** — the Julian school; gladiators appear as *Iulianus*. Caesar is known to have kept a large ludus at Capua, and the name passes to the imperial house
- **Ludus Neronianus** — gladiators appear as *Neronianus* (e.g. Hilarus Neronianus)

**Private familiae, named for owner** `[A]`:

- *familia gladiatoria Cn. Allei Nigidi Mai* (Pompeii)
- *familia gladiatoria A. Suetti Certi* (Pompeii)
- the school of *Cn. Cornelius Lentulus Batiatus* at Capua

### 10b. The two naming conventions, as formulas

**Owner convention** — `Ludus` + owner's nomen adjectivised, or `Familia gladiatoria` + owner's name in the genitive:

```
Ludus Cornelianus      Ludus Valerianus      Ludus Vettianus
Ludus Suettianus       Ludus Lucretianus     Ludus Alleianus
Ludus Holconianus      Ludus Popidianus      Ludus Istacidianus
Ludus Umbricianus      Ludus Salvianus       Ludus Munatianus
Familia gladiatoria M. Vetti Diadumeni
Familia gladiatoria C. Salvi Erotis
```

Formula: take the nomen, drop `-ius`, add `-ianus`. *Cornelius* → *Ludus Cornelianus*. This is the correct Latin adjectival form and it will generate cleanly from your nomen list in §9b.

**Location convention** — `Ludus` + place-adjective, or the place in the genitive:

```
Ludus Capuanus       Ludus Praenestinus    Ludus Pompeianus
Ludus Puteolanus     Ludus Ravennas        Ludus Tarraconensis
Ludus Lugdunensis    Ludus Alexandrinus    Ludus Pergamenus
Ludus Aquileiensis   Ludus Corduvensis     Ludus Nemausensis
```

**Function/ethnic convention** — a third real pattern, since *Dacicus*, *Gallicus* and *Matutinus* all exist:

```
Ludus Thracicus    Ludus Germanicus    Ludus Britannicus
Ludus Syriacus     Ludus Numidicus     Ludus Hibernus
```

### 10c. Roman towns — for location-named ludi and gladiator origins `[A]`

**Italy:**
```
Roma          Capua         Praeneste     Pompeii       Herculaneum
Neapolis      Puteoli       Cumae         Nola          Misenum
Ostia         Tibur         Tusculum      Antium        Aricia
Beneventum    Brundisium    Tarentum      Croton        Rhegium
Ancona        Ariminum      Bononia       Mutina        Parma
Placentia     Ravenna       Patavium      Verona        Mediolanum
Aquileia      Cremona       Ticinum       Genua         Pisae
Florentia     Arretium      Perusia       Spoletium     Asculum
Venusia       Canusium      Luceria       Salernum      Paestum
```

**Sicily, Sardinia, Africa:**
```
Syracusae     Panormus      Messana       Catina        Agrigentum
Lilybaeum     Caralis       Carthago      Utica         Hadrumetum
Thysdrus      Leptis Magna  Sabratha      Oea           Thugga
Cirta         Hippo Regius  Thamugadi     Lambaesis     Caesarea
Volubilis     Tingis        Cyrene        Alexandria    Ptolemais
```

**Spain and Gaul:**
```
Tarraco       Corduba       Hispalis      Gades         Italica
Carthago Nova Emerita Augusta  Bracara    Legio         Caesaraugusta
Valentia      Barcino       Narbo         Nemausus      Arelate
Massilia      Lugdunum      Vienna        Burdigala     Tolosa
Augustodunum  Lutetia       Durocortorum  Augusta Treverorum
```

**Germania, Britannia, the Danube:**
```
Colonia Agrippina   Moguntiacum   Argentoratum   Vindonissa
Bonna               Novaesium     Vetera         Castra Regina
Londinium           Eburacum      Camulodunum    Aquae Sulis
Deva                Lindum        Glevum         Isca
Vindobona           Carnuntum     Aquincum       Brigetio
Poetovio            Emona         Siscia         Sirmium
Singidunum          Viminacium    Salona         Iader
Apulum              Napoca        Sarmizegetusa  Porolissum
```

**Greece, the Balkans, the East:**
```
Thessalonica  Philippi      Dyrrhachium   Nicopolis     Corinthus
Athenae       Patrae        Sparta        Gortyna       Byzantium
Philippopolis Serdica       Marcianopolis Odessus       Tomis
Nicopolis ad Istrum         Nicomedia     Nicaea        Ephesus
Smyrna        Pergamum      Sardis        Miletus       Halicarnassus
Aphrodisias   Stratonicea   Mylasa        Iasos         Alabanda
Laodicea      Hierapolis    Ancyra        Tarsus        Antiochia
Apamea        Berytus       Tyrus         Sidon         Caesarea Maritima
Palmyra       Bostra        Petra         Damascus      Emesa
```

**Provinces** (for origin tags and *Ludus [Province]icus* forms):
```
Achaea        Aegyptus      Africa        Aquitania     Arabia
Asia          Baetica       Belgica       Bithynia      Britannia
Cappadocia    Cilicia       Creta         Cyrenaica     Dacia
Dalmatia      Galatia       Gallia Lugdunensis   Gallia Narbonensis
Germania Inferior    Germania Superior     Hispania Tarraconensis
Iudaea        Lusitania     Lycia         Macedonia     Mauretania
Moesia        Noricum       Numidia       Pamphylia     Pannonia
Raetia        Sicilia       Syria         Thracia
```

---

## 11. Quick reference: what to trust

| Group | Depth of the record | Verdict |
|---|---|---|
| Greek | Excellent — hundreds of named gladiators | Use freely, all `[A-g]` |
| Roman | Excellent — named gladiators and owners | Use freely |
| Thracian | Very good — large onomastic corpus | Use freely; compounds generate well |
| Gallic | Very good — Caesar plus craftsmen's names | Use freely; throttle `-rix` |
| Syrian | Good — Palmyrene corpus is large | Use freely |
| Germanic | Moderate — elite-skewed, Latin-filtered | Usable; watch chronology |
| Numidian | Thin — script partly undeciphered | Usable with Punic supplement; flag uncertainty |
| Nubian / sub-Saharan | Very thin, and **zero** named gladiators | Use the origin-tag + arena-name approach in §6d |

---

## Sources

- [Ancient Graffiti Project — Gladiators](https://ancientgraffiti.org/Graffiti/themes/Gladiators) — Pompeian and Herculanean gladiator graffiti (Celadus, Marcus Attilius, Hilarus Neronianus)
- [Marius C. Streinu, *Gladiators in Caria: a brief overview*](https://www.insegnadelgiglio.it/wp-content/uploads/2023/10/11-25.pdf) — the Greek-East gladiator stelae from Aphrodisias, Halikarnassos, Iasos, Mylasa, Stratonikeia
- [*Epitafios latinos de gladiadores en el Occidente romano*, Veleia (Univ. del País Vasco)](https://ojs.ehu.eus/index.php/Veleia/article/download/5401/5255) — corpus of Latin gladiator epitaphs
- [*Spectacles in the Roman World* sourcebook — Marketing and Advertising](https://pressbooks.bccampus.ca/spectaclesintheromanworldsourcebook/chapter/marketing-and-advertising/) — CIL IV 2508 and the Pompeian *edicta munerum*
- [Platner & Ashby, *Gladiator Schools of Ancient Rome* (LacusCurtius)](https://penelope.uchicago.edu/Thayer/E/Gazetteer/Places/Europe/Italy/Lazio/Roma/Rome/_Texts/PLATOP*/ludi.html) — Ludus Magnus, Matutinus, Dacicus, Gallicus, Aemilius
- [M. C. Carter, *Armorum Studium: Gladiatorial Training and the Gladiatorial Ludus*, BICS](https://onlinelibrary.wiley.com/doi/full/10.1111/2041-5370.12074)
- [Mac Congail, *The Thracian Myth — Celtic Personal Names in Thrace*](https://balkancelts.wordpress.com/wp-content/uploads/2013/05/the-thracian-myth.pdf) — the Pizos inscription compound names (IGBulg III.2 1690)
- [Wikipedia, *List of Dacian names*](https://en.wikipedia.org/wiki/List_of_Dacian_names) — the Egyptian ostraca cavalry names
- [Wikipedia, *List of kings of Thrace and Dacia*](https://en.wikipedia.org/wiki/Thracian_kings)
- [Andreas Gavrielatos, *Names on Gallo-Roman Terra Sigillata* (PhD, Leeds)](https://etheses.whiterose.ac.uk/id/eprint/4448/1/Gavrielatos_Thesis.pdf) — ordinary Gaulish craftsmen's names
- [Wikipedia, *Numidian language*](https://en.wikipedia.org/wiki/Numidian_language) — Libyco-Berber names from the Thugga and bilingual inscriptions
- [Claude Rilly, *Personal Markers and Verbal Number in Meroitic*, Dotawo](https://pages.sandpoints.org/dotawo/article/rilly/) — non-royal Meroitic names from funerary stelae (REM corpus)
- [BMCR review of Grassi, *Die semitischen Personennamen in den griechischen und lateinischen Inschriften aus Syrien und dem Libanon*](https://bmcr.brynmawr.edu/2025/2025.11.10/) — Semitic name formation patterns
- [Wikipedia, *Batavi (Germanic tribe)*](https://en.wikipedia.org/wiki/Batavi_(Germanic_tribe)) — Chariovalda, Civilis
- Standard works underpinning the gladiatorial framing: Junkelmann, *Das Spiel mit dem Tod*; Fagan, *The Lure of the Arena*; Futrell, *Blood in the Arena*; Jacobelli, *Gladiators at Pompeii*; Robert, *Les gladiateurs dans l'Orient grec*
