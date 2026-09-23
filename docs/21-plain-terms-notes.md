# Plain terms: notes

Branch `plain-terms`. The designer's read: "this leans too heavily on genre
TERMS that are just confusing. It's always about some 'note' or something —
lending money may be a common trope, but we should describe things
(gambling, lending, protection racket, whatever) in terms that people will
get."

The rule, now **Rule zero** of `docs/style-guide.md`: **say what it is.** A
modern reader who has never read Hammett must understand every sentence on
first read. Period flavour comes from the setting, the objects and the
rhythm, never from slang that hides meaning.

## What changed

| | strings changed |
|---|---|
| generator data (`src/gen/data/*.ts`: secrets, motives, cast, anchors, objects, methods, means, places) | 131 |
| generator code (`src/gen/cast.ts`, `client.ts`, `tropes/inside-job.ts`, `tropes/the-frame.ts`) | 4 |
| engine (`src/game/voice/plain.ts`, `roll.ts`, `reactive.ts`, `scoring.ts`, `reducer.ts`; `src/ui/report.ts`) | 11 |
| decks (`ambient`, `arrivals`, `endings`, `find`, `frames`, `places`, `portrait-pairs`, `portraits`, `similes`, `transitions`) | 32 fields on 30 cards |

Nothing in `establish`, `watch`, `return`, `activity`, `thought`, `bridge`,
`carry`, `answer`, `errand` or `hours` was touched; another pass owns them.
What those decks still carry is listed at the end.

Also added: `IOU` and `IOUs` to the correspondence checker's closed list of
capitalised words (`src/gen/data/vocabulary.ts`), since a debt is now written
on one.

## Before and after, every term

"Sweep hits" are occurrences in everything a player can read — every case
text field, every page an oracle run renders through the transcript tool,
the notebook, the cast list and the verdict — over 40 seeds × difficulties
1–3 × murder, robbery and missing (360 cases, 413,021 strings), counted with
`npx tsx scripts/plain-terms-sweep.ts`, the same list run over `main`
(before) and this branch (after). A sentence repeats across the case JSON,
the notebook and the pages, so the hit counts are occurrences, not distinct
sentences; the distinct count is in brackets. "Src" is how many template
strings or card fields were rewritten for that term.

### Lending, debts and the law

| term | before | after | src | sweep hits before → after |
|---|---|---|---|---|
| paper (a mortgage) | has held the paper on the building {victim} lived in | has held the mortgage on the building {victim} lived in | 2 | 578 (166) → 0, all "paper" senses |
| paper (a loan), renewing | has been carrying {victim}'s paper since {year} and renewing it every ninety days | lent {victim} money in {year} and has extended the loan every ninety days since | 2 | (in the line above) |
| renewals | three renewals running | through three extensions of the loan | 1 | 282 (64) → 0 |
| paper (a legal document) | has drawn every paper {victim} ever signed | has drawn up every contract {victim} ever signed | 2 | (in "paper") |
| paper (a claim) | kept the paper on both; held the paper still | kept a claim on both; was still owed for it | 2 | (in "paper") |
| note (a debt) | borrowed … to cover a note; signed a note to {victim} | borrowed … to pay off another debt; signed an IOU to {victim} | 4 | 2,032 (685) → 0 |
| promissory note | A promissory note for $4,000 signed by {P}, endorsed to {V} | An IOU for $4,000 signed by {P}, made out to {V} | 1 | (in "note") |
| carried (lent to) | {victim} carried {person} through a bad winter | {victim} lent {person} money through a bad winter | 2 | not on the list (an idiom, fixed where it meant money) |
| piece of (a share) | owned a piece of four houses | owned a share of four houses | 1 | 240 (25) → 0 |
| bonds | wrote bonds | wrote bail bonds | 1 | — |
| codicil | A draft codicil in {V}'s hand striking {P} out of the will | A change to {V}'s will, drafted in {V}'s hand, striking {P} out of it | 1 | 172 (61) → 0 |
| quarter day | at the quarter day | at the end of the quarter | 1 | 308 (9) → 0 |
| policy (insurance, read as the numbers) | the beneficiary of a policy; a policy on {V}'s life | the beneficiary of a life-insurance policy; a life-insurance policy on {V} | 3 | 720 (180) → 0 (with the numbers, below) |
| envelope (a bribe) | was owed an envelope by every landlord | was owed a bribe by every landlord | 1 | 134 (21) → 0 |
| put out of the country | was put out of the country once already | was deported once already | 1 | 158 (7) → 0 |
| the papers (identity) | is not the person the papers say | is not the person {P}'s identity papers say | 1 | 106 (11) → 0 |
| like (somebody) for it | Who do you like for it? | Who do you think did it? | 2 | 177 (58) → 0 |

### Gambling

| term | before | after | src | sweep hits before → after |
|---|---|---|---|---|
| policy runner | a policy runner | a bet collector for an illegal lottery | 1 | 2,100 (301) → 0 as "runner" |
| policy, the bag | runs policy for a bank uptown and is trusted with the bag | collects for the numbers, an illegal lottery run from uptown, and is trusted with the money | 2 | 720 (180) → 0; the bag 82 (6) → 0 |
| the slips, the plays | carries the slips; collects the plays | carries the lottery slips; collects the bets | 4 | the plays 183 (16) → 0; the numbers 590 (160) → 0 |
| the book (bookmaking) | runs a book on the horses | takes illegal bets on the horses | 2 | 203 (14) → 0 |
| the book (a bookmaker's ledger) | The book at {L} has the payment entered | The bookmaker's ledger at {L} has the payment entered | 1 | (in "the book") |
| markers | A book of markers at {L} | A bookmaker's list of IOUs at {L} | 1 | 1,090 (38) → 0 |
| runner (a bookmaker's) | The bookmaker's runner is found | The man who collects for the bookmaker is found | 1 | (in "runner") |
| the racing wire | goes very quiet when the racing wire is mentioned | … when the horse-race results are mentioned | 1 | 1,116 (59) → 0 |
| pocketbook | Betting slips … in {P}'s pocketbook | … in {P}'s wallet (and pp-013, pp-031) | 4 | 1,129 (35) → 0 |
| faro | quick as a faro dealer's | quick as a back-room card dealer's | 1 | deck only |
| fight card | the fight card on the bar radio | the boxing match on the bar radio (anchor name, fact; trn-001) | 3 | 456 (133) → 0 |

### Stolen goods, drugs, the police

| term | before | after | src | sweep hits before → after |
|---|---|---|---|---|
| fencing | Fencing stolen goods (the secret's label) | Selling stolen goods | 1 | 415 (1) → 0 |
| receiver | The receiver at {L} would rather talk | The man at {L} who buys the stolen goods would rather talk | 1 | 1,484 (141) → 0 |
| a paper of powder | A paper of powder at {L} | A little paper packet of morphine at {L} | 1 | 632 (27) → 0 |
| hop-head | rather be thought a murderer than a hop-head | … than a drug addict | 1 | 277 (1) → 0 |
| chloral | a bottle of chloral drops; Chloral hydrate in the stomach; doctor the drink | a bottle of chloral sleeping drops; Chloral, a sleeping drug, in the stomach; put it in the drink | 3 | doctor the drink: 0 dealt in the sweep |
| upstate (prison) | a younger brother in trouble upstate | a younger brother in prison upstate | 1 | 330 (52) → 0 |
| operative | The agency's own operative confirms it | The agency's own detective confirms it | 1 | 86 (24) → 0 |
| a man on {P} | A private agency has had a man on {P} | A private detective agency has had a man following {P} | 1 | — |
| box (a safe) | Nobody hangs for a box. | Nobody hangs for a robbery. | 1 | engine; test updated |

The designer's example had "a folded paper of cocaine"; the secret is buying
morphine, so the packet is morphine. The meaning stays the case's.

### Trades and jobs

| term | before | after | src | sweep hits before → after |
|---|---|---|---|---|
| ward heeler | a ward heeler; carries the district for the club | a party worker for the local political club; brings in the district's votes for the club | 3 | 793 (222) → 0 |
| stringer | a stringer for the evening papers | a freelance reporter for the evening papers | 1 | 498 (127) → 0 |
| hack, hackman | a hack driver; the hackman on the stand; works the stand | a cab driver; the cabbie on the stand; waits for fares | 5 | 1,465 (534) → 11 (5), all in the pending `watch` deck |
| curb broker | a curb broker; works the curb outside the Exchange | a stockbroker who trades in the street; trades stocks on the sidewalk outside the Exchange | 3 | 884 (214) → 0 |
| shape up | shapes up at seven; decided who shaped up | lines up at the pier at seven to be picked for work; decided who was picked for work | 3 | 177 (21) → 0 |
| a hook | has a hook | has a cargo hook | 2 | — |
| registry card | has a registry card | is on the nurses' registry | 2 | 85 (8) → 0 |
| fire jobs, casualty office | walks fire jobs; settles claims for a casualty office | inspects fires for the insurance company; settles accident claims for an insurance company | 4 | casualty office 82 (10) → 0 |
| a house (fashion house) | sews for a house on the avenue and is never named in it | sews for a fashion house on the avenue and never gets her name on the label | 2 | — |
| turn coats; make to measure; settle | presses and turns coats; makes to measure for men who settle at Christmas | presses coats and remakes old ones; makes suits to measure for men who pay their bill at Christmas | 4 | 109 (14) → 0 |
| fly floor; set and strike; the house (theatre) | works the fly floor; sets and strikes; since the house opened | works the ropes above the stage; puts up and takes down the scenery; since the theatre opened | 6 | 746 (39) → 0 (with the lines below) |
| last house; stands the box; four houses; a bill | until the last house goes in; stands the box; booked acts into four houses; a name on a bill | until the last show goes in; works the box office; four theatres; a name on a playbill | 4 | stand the box 123 (12) → 0 |
| the line | two seasons in the line | two seasons in the chorus line | 2 | — |
| the exchange | works the exchange | works the telephone exchange | 2 | — |
| the house (hotel) | runs the house | runs the hotel | 2 | — |
| the stick | has had the stick at {place} | has tended bar at {place} | 1 | 120 (14) → 0 |
| let the rooms | lets the rooms | rents out the rooms | 1 | 312 (12) → 0 |
| redemptions; tickets | handles the redemptions; writes the tickets | hands back what people pay to get out of pawn, and sells what nobody comes back for; writes the pawn tickets | 4 | 128 (10) → 0 |
| four houses (speakeasies) | supplied four houses on the block | supplied four speakeasies on the block | 1 | — |
| the local | held the local's books; was the local; the local's hall | held the union local's books; was the union; the union hall | 3 | 313 (27) → 0 |
| dry goods | a retired dry-goods wholesaler; ran a dry-goods house | a retired cloth wholesaler; ran a wholesale cloth business | 2 | 384 (26) → 0 |
| organising | Organizing the shop; signing men up; guilty of … a charter | Organizing a union; signing men up for a union; guilty of … starting a union | 3 | — |
| boarded out | A child boarded out; a board-and-keep receipt; the board money receipted | A secret child; a bundle of receipts for a child's room and board; the child's keep paid up | 3 | 1,452 (21) → 0 |
| temperance pledge | is on a temperance pledge | has sworn off drink | 1 | 478 (135) → 0 |

### The body, the building, the house

| term | before | after | src | sweep hits before → after |
|---|---|---|---|---|
| ligature | A ligature furrow across the throat | A groove across the throat where a cord was pulled tight | 1 | 232 (21) → 0 |
| depressed fracture | One depressed fracture at the back of the skull | One blow broke in the back of the skull | 1 | 168 (14) → 0 |
| areaway | something hitting the areaway | something hitting the ground below | 1 | 48 (4) → 0 |
| sexton, sacristy | The sexton rings them off the sacristy clock | The church caretaker rings them by the church clock | 1 | 414 (16) → 0 |
| riser | the lights on that riser; every light on the riser | the lights on those floors; every light on those floors | 2 | 206 (4) → 0 |
| the wireless | can hear the wireless through it | can hear the radio through it | 2 | 536 (109) → 0 |
| the press (a cupboard) | gone from the press | gone from the wardrobe | 2 | 100 (2) → 0 |
| on the latch | the door was left on the latch (and arr-p002) | the door was left shut but not locked | 2 | 260 (40) → 0 |
| japanned | a japanned cash box | a black-lacquered cash box | 1 | 595 (140) → 0 |
| made fast; on the iron; the ticket | a cord made fast to the fire escape; somebody on the iron outside; the operator has the ticket for it | a cord tied to the fire escape; somebody on the fire escape outside; the operator has a record of it | 3 | — |
| spike of tickets | money raised in a hurry, on a spike of tickets | money raised in a hurry at a pawnshop, on a spike of pawn tickets | 1 | — |
| the book (a sign-out log) | The book at {access} has {object} going out; The book has {killer} there | The sign-out book …; The sign-in book … | 2 | — |

### Deck words: dress, household, idiom

All in decks the pass was allowed to touch; `npm run decks` counted 23 banned
terms in them before and 0 after.

| card | before | after |
|---|---|---|
| SIM-008, SIM-090, por-105 | boiled shirt, boiled stiff | starched shirt, starched stiff |
| por-106 | A Norfolk jacket, belted | A belted tweed hunting jacket |
| por-108 | A shirtwaist | A high-necked blouse |
| por-110 | Gaiters | Cloth ankle covers |
| por-113 | Knickers | Knee breeches |
| por-150 | with a shingle at the back | tapered short at the back |
| pp-060 (text, recall) | the width of a mangle's roller; the mangle-roller scar | the width of the roller on a laundry wringer; the laundry-wringer scar |
| pp-013 (text, recallAction), pp-031 | pocketbook | wallet |
| SIM-129, PLACE-072 | stevedore(s) | dockworker(s) |
| SIM-295 | quick as a party line | quick as gossip on a shared phone line |
| SIM-012 | a faro dealer's | a back-room card dealer's |
| PLACE-015 | A single gas bracket | A single gas lamp on the wall |
| PLACE-003 | doesn't card and doesn't ask | doesn't check anybody's age and doesn't ask questions |
| fnd-p005 | against the skirting | against the baseboard |
| fnd-045 | nobody owning to it | nobody owning up to it |
| arr-p002 | is on the latch | is shut but not locked |
| end-p004 | The wrong man goes up | The wrong man goes to prison |
| trn-001 | The fight card droned on | A boxing match droned on |
| trn-022 | The last house let out | The last show let out |
| trn-030 | somebody's box | somebody's icebox |
| amb-004 | Four days on the rent | Four days late on the rent |
| amb-065 | relieved to be shut of it | glad it was over |
| frm-p006 | "Ask the house." | "Ask anybody here." |
| SIM-025, SIM-051, PLACE-013 | a undertaker, a evening paper | an undertaker, an evening paper (typos, while there) |

### Engine idioms

| where | before | after |
|---|---|---|
| `voice/roll.ts` | There is money owing here, and it has been owing a while. / I owe here, which changes the shape of a question. | This one owes me money, and has for a while. / I owe this one money, which changes the shape of a question. |
| `voice/reactive.ts` | would have it crooked / I had been carrying {name} and I put {name} down / leaning on {old} | would lie about it / giving {name} the benefit of the doubt, and I stopped / leaning toward {old} |
| `scoring.ts` | The book says {par}. / Nobody hangs for a box. / A plea | It could have been done in {par}. / Nobody hangs for a robbery. / A guilty plea |
| `reducer.ts` | I put paper in the machine. | I put a sheet of paper in the typewriter. |
| `ui/report.ts` | and that is the book | and that is the last of them |

**Totals.** The sweep went from 25,788 hits (52 of the list's terms) on `main` to 11 on this
branch, all eleven a single `watch` card (wch-052, "A hack driver") that is
waiting on the other pass. `npm run decks`: 23 banned terms in the checked
decks before, 0 after; 6 in the pending decks, reported as warnings.

## Enforcement

- **`content/plain-terms.json`** — the list, as data: 88 terms, each with its
  regular expressions, the plain words to use instead (`plain`), and the
  literal senses it allows (`allow`: a newspaper is a paper, the landlady's
  note is a note, the fence borders the lot, a life-insurance policy is a
  policy, the telephone has a mouthpiece). `pendingDecks` names the decks the
  other pass is rewriting; delete it when that lands.
- **`scripts/plain-terms.mjs`** — `loadPlainTerms` and `findJargon`, plain
  JavaScript so the deck validator and the tests share one implementation.
- **`npm run decks`** now checks `text`, `recall` and `recallAction` on every
  card of every deck against the list: an error in a checked deck, a warning
  in a pending one, and a summary line at the bottom.
- **`test/plain-terms.test.ts`** — every string a player can read over 40
  seeds × 3 difficulties × all three case types (briefing and its spoken
  forms and breaths, every clue sentence in both forms, dossiers, the
  client's brief, secrets, motives, mentions, every page of an oracle run
  rendered through `renderPageText`, the notebook, the cast list and the
  verdict). A hit inside the words of one of a pending deck's own offending
  cards is excused and counted; nothing else is. It also checks the
  designer's examples are caught and their literal senses pass. ~20 s.
- **`scripts/plain-terms-sweep.ts`** — the same sweep, printed by term with
  where each hit was.

## Structure is untouched

- **`src/gen/structure.ts`** — `structureOf(case)` is the case JSON with
  every player-visible text field blanked (`TEXT_KEYS`: names, roles, labels,
  every sentence field, the briefing and its breaths); ids, enums, ticks,
  flags, facts and links all stay.
- **`test/fixtures/structure-hashes.json`** was written by
  `scripts/snapshot-structure.ts --write` on `main` **before** the first
  word changed. After the pass: `structure identical: 600 of 600` (200 seeds ×
  difficulties 1–3), and `test/structure-identity.test.ts` holds every later
  build to it.
- **The M7 full-text hashes** (`test/fixtures/m7-baseline-hashes.json`)
  therefore had to move: all 600 cases changed, 40,761 strings between them —
  every case deals fixtures, clue sentences and dossier lines that carry a
  rewritten phrase (the cash box and the chloral are in 561 cases' objects;
  a secret's label changed in 548). With the structure proven identical, the
  file was regenerated with `scripts/snapshot-cases.ts --write`; the test and
  the script say so in their comments. A future wording pass goes the same
  way: structure first, then the full text.

## Measurements

**Tests:** `npm test`: 32 files, 656 tests, all passing (`main`: 30 files,
648; the two new files add 3 structure tests and 5 plain-terms tests).
`npm run typecheck` is clean. One existing assertion changed along with the
words it checks: `test/m5-engine.test.ts` looked for "Nobody hangs for a box"
and now looks for "Nobody hangs for a robbery".

**Correspondence** (`scripts/page-correspondence.mjs`, 40 seeds × 3
difficulties, oracle and wandering, plus every trope): 0 violations before,
0 after. On the way it caught `IOU`, `IOUs` and a sentence opening on
`Receipts` as unknown capitalised names (the first two added to the closed
list, the third reworded), and "works the cab stand outside the hotel" as a
foreign place (the cab stand is a dealt place); the hone-2 written-forms test
caught three first-person lines without a short sentence. All fixed.

**Golden harnesses** (`python3 scripts/golden-loop.py`, 40 seeds):

| | main | plain-terms |
|---|---|---|
| night: arrive (92 pages) | 0.313 | 0.313 |
| night: search (26 pages) | 0.131 | 0.104 |
| night: ask (162 pages) | 0.462 | 0.462 |
| **night aggregate** | **0.302** | **0.293** |
| office page (day targets) | 0.009 | 0.008 |
| day loop, pages 1–3 | 0.280 | 0.293 |

The numbers barely moved, as expected from a wording pass. The search page
gained two words a page (123.7 → 125.7, nearer its floor of 130). The day
loop's one change is in short sentences on pages 2–3, 0.264 → 0.259. "A groove
across the throat where a cord was pulled tight" is longer than "a ligature
furrow", and saying what a thing is usually takes a word or two more than
naming it in slang.

**Decks:** `npm run decks` — 3,305 cards across 28 decks, 0 errors, the same 26
empty tag combinations as `main`; plain terms 0 in the checked decks, 6 in the
pending ones.

**Overlap** (`node corpus/tools/overlap.mjs` over the ten touched decks): two
of my rewrites shared a five-word run with the corpus ("I was glad to be",
"in a back room and") and were reworded. Four hits remain, all on cards this
pass did not touch and all present on `main`: arr-p005 "at the bottom of the",
arr-p007 "and the first of the", sim-p003 "the near side of the", trn-p011
"before I had the door".

## Judgment calls, left alone

- **The El, the Automat, speakeasy, precinct, bootlegger, bookmaker, pawn
  ticket, bearer bonds, spats, derby, cloche, stickpin** — period setting and
  objects, which the rule keeps. The Automat and the El are named places a
  reader learns by walking into them.
- **British spellings** ("kerb" on four cards, "tyres", "grey", "parlour",
  "neighbourhood" throughout the generator) — a spelling choice, not jargon;
  worth one decision for the whole game.
- **"calls" as the unit of actions** (`reactive.ts`, `scoring.ts`, `page.ts`,
  `realize.ts`, `ui/book.ts`) — a modern reader may hear phone calls. Also a
  whole-game decision.
- **"the book" meaning Dashiell's notebook** (`voice-data.ts`, `plain.ts`) —
  literal, left; "notebook" would be plainer if the designer wants one word.
- **"Two questions on the house"**, **"on a slab"**, **"a still in the
  cellar"**, **"transom"** — common enough.
- **The truth sheet** (`src/sheet/truthSheet.ts`) speaks the designer's
  terms (tick, spine, anchor, noise, fixture). Not slang, and it is the
  answer key, but a player can open it.

Found in passing, not a wording problem: `watched by the ${place.watcher}`
(`src/game/notebook.ts`, `src/game/transcript.ts`, `src/ui/notebook-view.ts`)
prints the raw fixture id — "watched by the elevator-man", "the beat-cop",
"the newsstand".

## Jargon in the decks this pass was told not to touch

For the pass rewriting `establish`, `watch`, `return`, `activity`,
`thought`, `bridge`, `carry`, `answer`, `errand` and `hours` (`decide`,
`place-ambient` and `story` do not exist yet). `npm run decks` already warns
on the first six below; the rest are not on the list because a pattern
cannot tell them from their literal senses.

| deck | card | says | plain |
|---|---|---|---|
| watch | wch-052 | A hack driver | A cab driver |
| activity | act-111 | the day's take | the day's cash |
| activity | act-149 | checking a policy against a list of exclusions | checking an insurance policy against … |
| activity | act-258 | a ledger of redemptions | a ledger of things their owners bought back |
| establish | est-099 | the local's meeting hall | the union local's meeting hall |
| activity | act-275 | a ledger of plays | a ledger of bets |
| activity | act-132 | a stack of notes (banknotes) | a stack of bills |
| activity | act-052 | a folded page of quotations | a folded page of stock prices |
| activity | act-084 | a list of names against a docket | … against the court calendar |
| activity | act-113 | a stack of unpaid cards | a stack of unpaid bills |
| activity | act-160, act-163, act-166 | a hook | a cargo hook |
| activity | act-172 | a bundle of piecework | a bundle of sewing paid by the piece |
| activity | act-198 | carrying a folded flat | carrying a painted scenery panel |
| activity | act-225 | an agency's listing | a job listing from an employment agency |
| activity | act-243 | counting coal chits | counting vouchers for free coal |
| activity | act-256 | checking the mark twice (a hallmark) | checking the gold stamp twice |
| activity | act-020 | the brass rail inside the car | … inside the elevator |
| watch | wch-033 | running the car all day | running the elevator all day |
| establish | est-045 | whoever was waiting on the car | whoever was waiting for the elevator |
| watch | wch-002 | didn't clock | didn't notice |
| establish | est-116 | well past the second | say the second what (the band's last set?) |
| establish | est-057, est-058, est-060 | after midnight it was something else entirely | say it: a speakeasy, selling liquor to anyone the doorman let in |
| thought | tht-e013 | It was not in the wind after all. | It had not simply vanished after all. |
| thought | tht-e025 | the last place anybody had sworn to {victim} yet | … anybody had said they saw {victim} |
| thought | tht-e031 | gone meant something else | {victim} died later than anyone thought |
| thought | tht-e032 | Whoever had {victim} gone earlier | Whoever said {victim} was dead earlier |

Judgment calls in the same decks: "to save the current" (est-013, est-065,
est-120: to save on electricity); "a wooden apron", "the slip" (est-133,
est-134: the ferry landing); "It had gone {hour}", "It was gone {hour}"
(hrs-002, hrs-007: "It was past {hour}"); "run {subject} down" (err-089,
err-179, err-269: "track down"); "call sheet" (act-197, act-204, act-231:
rehearsal schedule); "a ward map" (act-242); "a ticker tape" (act-057);
"a girl who came in mornings" (act-051: the maid); "Walking would mean
choosing" (tht-e030). `carry`, `return`, `bridge` and `answer` are clean.
