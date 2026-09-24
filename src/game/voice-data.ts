/**
 * The hand-written half of the placeholder voice: the lines the decks cannot
 * supply because they are about the shape of the conversation rather than the
 * person having it.
 *
 * Twenty nothing-answers, in three registers:
 *
 * - `present` — he is standing in front of you and has nothing. This is the
 *   only one that costs an action, because walking up and asking is a choice.
 * - `elsewhere` — you asked the room about somebody who is across the
 *   neighbourhood. That is a mistake at the prompt, and mistakes are free.
 * - `meaningless` — the words did not land on anything in the case. Free.
 *
 * Slots: {name} is the person asked, {topic} is what they were asked about,
 * {place} is the room, {detective} is the detective's name.
 */

export interface NothingLine {
  id: string;
  tag: 'present' | 'elsewhere' | 'meaningless';
  text: string;
}

export const NOTHING_LINES: NothingLine[] = [
  {
    id: 'NA-01',
    tag: 'present',
    text: '{name} turns the question over, finds nothing in it, and hands it back. “Couldn’t tell you.”',
  },
  {
    id: 'NA-02',
    tag: 'present',
    text: '“{topic}.” {name} says the word back at me like it was a price. “No. Not that I know of.”',
  },
  {
    id: 'NA-03',
    tag: 'present',
    text: 'A shrug that starts at the shoulders and stops before it means anything. {name} has nothing on {topic}.',
  },
  {
    id: 'NA-04',
    tag: 'present',
    text: '“You’re asking the wrong party, mister.” {name} goes back to whatever {place} pays for.',
  },
  {
    id: 'NA-05',
    tag: 'present',
    text: '{name} thinks about it long enough that I get my hopes up. Then: “No.”',
  },
  {
    id: 'NA-06',
    tag: 'present',
    text: '“I keep my own business and it keeps me.” Whatever {name} knows about {topic}, it stays behind the teeth.',
  },
  {
    id: 'NA-07',
    tag: 'present',
    text: 'I get a look instead of an answer. It costs me the same either way.',
  },
  {
    id: 'NA-08',
    tag: 'present',
    text: '“{topic}?” {name} waits for the rest of the question. There isn’t any rest of the question.',
  },
  {
    id: 'NA-09',
    tag: 'present',
    text: '{name} doesn’t know, and for once in this neighbourhood I believe somebody.',
  },
  {
    id: 'NA-10',
    tag: 'present',
    text: '“Ask me a different one.” {name} does not offer a different one.',
  },
  {
    id: 'NA-11',
    tag: 'elsewhere',
    text: 'I look around {place} for {name} and find a coat rack and two strangers. Not here.',
  },
  {
    id: 'NA-12',
    tag: 'elsewhere',
    text: '{name} isn’t in this room, and the question keeps until {name} is.',
  },
  {
    id: 'NA-13',
    tag: 'elsewhere',
    text: 'You can’t put a question to an empty chair. {name} is somewhere else tonight.',
  },
  {
    id: 'NA-14',
    tag: 'elsewhere',
    text: 'Nobody at {place} answers to {name}. I keep the question in my pocket.',
  },
  {
    id: 'NA-15',
    tag: 'elsewhere',
    text: 'I say the name out loud in {place}. Two heads turn. Neither of them is the right one.',
  },
  {
    id: 'NA-16',
    tag: 'meaningless',
    text: 'I try the words out in my head first and they don’t go anywhere. I keep them there.',
  },
  {
    id: 'NA-17',
    tag: 'meaningless',
    text: 'There’s a version of this case where {topic} means something. This isn’t it.',
  },
  {
    id: 'NA-18',
    tag: 'meaningless',
    text: 'The question falls apart on the way to my mouth. {detective}, I tell myself, ask a real one.',
  },
  {
    id: 'NA-19',
    tag: 'meaningless',
    text: 'Nothing in this neighbourhood goes by that name, and I’ve had all night to learn the names.',
  },
  {
    id: 'NA-20',
    tag: 'meaningless',
    text: 'I run {topic} past the part of me that keeps the file. The file comes back empty.',
  },
];

/**
 * Arrival at a room with nobody posted in it.
 *
 * All fifty cards in `content/decks/places.json` are tagged with a fixture
 * role and written out of that fixture's furniture — a brass rail, a lobby
 * desk, a tray of calling cards. Two rooms in every case are unwatched, and
 * the scene is always one of them, so the first page of every run would
 * otherwise describe the victim's own hallway in the landlady's voice. These
 * twelve lines cover the gap until the real deck has unwatched cards.
 */
export interface RoomLine {
  id: string;
  placeKind: 'private' | 'semi' | 'public';
  text: string;
}

export const ROOM_LINES: RoomLine[] = [
  {
    id: 'ROOM-01',
    placeKind: 'private',
    text: 'Nobody keeps {place} and it shows: a hall light with no shade, mail on the floor where it fell through the slot, and the cold of a room that has had its window up a while.',
  },
  {
    id: 'ROOM-02',
    placeKind: 'private',
    text: 'There is no doorman at {place} and no register to sign. A chair sits at an angle somebody left it at, and the rug has a worn track from the door to the window.',
  },
  {
    id: 'ROOM-03',
    placeKind: 'private',
    text: '{place} has the stillness of a place where the last person out did not expect to be the last person out. A cup on the sill, a saucer under it, and a ring where a second cup was.',
  },
  {
    id: 'ROOM-04',
    placeKind: 'private',
    text: 'The lock on {place} is a two-dollar lock and it has been a two-dollar lock since the building went up. Inside, the radiator knocks twice and gives up.',
  },
  {
    id: 'ROOM-05',
    placeKind: 'semi',
    text: 'Whoever minds {place} is not minding it tonight. A ledger lies open at a page from Tuesday, and the pen has rolled into the crack of the desk.',
  },
  {
    id: 'ROOM-06',
    placeKind: 'semi',
    text: '{place} is the kind of room people pass through and nobody sits down in. Two chairs, a hat stand, a smell of wet wool and cold coffee.',
  },
  {
    id: 'ROOM-07',
    placeKind: 'semi',
    text: 'The back of {place} is dark and the front of it is not much better. Crates against the wall, a broom leaning where a man would lean.',
  },
  {
    id: 'ROOM-08',
    placeKind: 'semi',
    text: 'Nobody works the door at {place} after ten, which is the point of {place}. The boards give under a heel and go on giving for a second after.',
  },
  {
    id: 'ROOM-09',
    placeKind: 'public',
    text: 'There is nobody at {place} to ask, only the city going about its evening. A grate breathes warm air at ankle height and a paper cup turns over in it.',
  },
  {
    id: 'ROOM-10',
    placeKind: 'public',
    text: '{place} belongs to whoever is standing on it. Tonight that is me, a man asleep on a bench, and a dog with somewhere to be.',
  },
  {
    id: 'ROOM-11',
    placeKind: 'public',
    text: 'The lamps at {place} are the old kind, and they leave more dark than they take. Two cigarette ends by the kerb, ground out an hour apart by the look of them.',
  },
  {
    id: 'ROOM-12',
    placeKind: 'public',
    text: 'Nothing at {place} keeps a record of anybody. That is what people like about it, and it is why I will be back here twice before morning.',
  },
];

/** Arrival, when the place deck has nothing left that fits. */
export const PLAIN_ARRIVALS: string[] = [
  'I let myself into {place} and stand a moment while my eyes catch up.',
  '{place}, then. The door gives and nobody looks up.',
  'Eleven minutes on foot and I’m at {place} with the cold still on my coat.',
  'I take the steps at {place} two at a time and arrive out of breath and no smarter.',
];

/** What `look` prints above the roll of who is here. */
export const PRESENCE_LEAD = 'In the room:';
export const EMPTY_ROOM = 'Nobody in here but the furniture.';

/** `examine` when the room has already given up everything it has. */
export const NOTHING_LEFT: string[] = [
  'I go through {place} again anyway. The second pass is always the one that finds nothing.',
  'Drawers, sills, the gap behind the radiator at {place}. Nothing that wasn’t there before.',
  '{place} has told me everything it intends to. I put the lid back on.',
];

export const HELP_LINES: { command: string; gloss: string }[] = [
  { command: 'go <place>', gloss: 'Walk there. Costs an action.' },
  {
    command: 'ask <person> about <topic>',
    gloss: 'Ask them. Costs an action. The first time, they tell you their own evening as well.',
  },
  {
    command: 'put <fact> to <person>',
    gloss:
      'Read them a line from the notebook that breaks what they told you. Costs an action. If it lands, a second fact right after is free.',
  },
  {
    command: 'ask <person> about themselves',
    gloss: 'Who they are, in their own words. One action, once.',
  },
  { command: 'examine <place or object>', gloss: 'Go through the room. Costs an action.' },
  { command: 'look', gloss: 'The room, and who is standing in it. Free.' },
  { command: 'notebook', gloss: 'Everything written down so far. Free.' },
  { command: 'file', gloss: 'Take the report to the DA. Ends the night.' },
  { command: 'help', gloss: 'This page. Free.' },
];

export const HELP_NOTE =
  'Topics worth trying: anybody’s surname, a room, a thing, something that happened at a fixed hour, that evening, themselves, why I was hired. Underlined words on the page are clickable, and so is every lead in the notebook.';

/**
 * M9 §1: the one rule about lies, taught early. On the title page, in the
 * help, and on the first run.
 */
export const LIE_RULE = 'People lie about themselves. Nobody lies about what they saw.';

export const LIE_RULE_NOTE =
  'A person’s own account of their evening may be false. What anybody says they saw of somebody else is true, and so is anything found in a room. The one exception is somebody who says they were with somebody: they may be covering for them.';

/* ------------------------------------------------------------------ *
 * M4 additions. Still the hand-written half: lines about the shape of
 * a page rather than about the person standing on it.
 * ------------------------------------------------------------------ */

/**
 * What a yapper says about people who are not in the room — the `{colour}`
 * slot in a dialogue frame.
 *
 * These name nobody in the case and establish nothing about the evening. A
 * yapper who dropped a real fact here would be handing the player something
 * the notebook does not have, and the notebook is the record.
 */
export const COLOUR_LINES: string[] = [
  'The fellow who keeps the newsstand has a brother upstate who writes for money.',
  'They had the hydrant open on this block in August and the whole street stood in it.',
  'The girl on the third floor sings until eleven and nobody has the heart to knock.',
  'There is a man on the corner selling a war pension he never earned.',
  'The butcher two doors down puts his thumb on the scale and has for thirty years.',
  'They are pulling the old stable down in the spring and nobody believes it.',
  'A dog got into the bakery Tuesday and came out white to the shoulders.',
  'The super has a still in the cellar and a notice about fire hazards on the door.',
];

/**
 * How the detective introduces a record he could not get anybody to say out
 * loud. The fallback (A.5) for a clue whose own sentence is written *about*
 * the speaker rather than by them: quoting it would put words in a man's
 * mouth he never said, so it goes down as what it is.
 */
export const RECORD_LEADS: string[] = [
  'What I got, I got the long way round, and it goes in the book as it came:',
  'It took three passes at it. What came out was this:',
  'I put it another way, and then a third way, and this is what it came to:',
  'Nothing they would say twice. Here is the once:',
];

/** The transition when the transitions deck has nothing that fits. */
export const PLAIN_TRANSITIONS: string[] = [
  'I walked it, and the walking took what it took.',
  'Across, and down, and in.',
  'The distance was nothing and the night charged me for it anyway.',
];

/** The approach to somebody who already knows him, first time only. */
export const FAMILIAR_GREETINGS: string[] = [
  '{name} had my name out before I had the door shut.',
  '{name} saw me coming and did not look surprised about it.',
  'There was no introducing to do. {name} has known me longer than the coat has.',
];

/* ------------------------------------------------------------------ *
 * M4b. Line-to-line glue (§A.6) and the office (§B.2).
 * ------------------------------------------------------------------ */

/**
 * Carry a noun (§A.6). When the block before mentions a prop the cards are
 * tagged for — the ledger, the glass, the keys — the thought that follows it
 * may open on that prop instead of on nothing. Six templates, used sparingly:
 * the device works because it is rare, and a page that does it twice is a page
 * doing a trick.
 */
export const CARRY_TEMPLATES: string[] = [
  'The {noun} stayed open.',
  'The {noun} was still where it had been.',
  'Nobody had moved the {noun}.',
  'I kept coming back to the {noun}.',
  'That {noun} again.',
  'The {noun} had not changed its mind about anything.',
];

/**
 * The office at this hour, when `content/decks/office.json` is not on disk
 * yet. Two lines, and the page says so in its gap log.
 */
export const OFFICE_LINES: string[] = [
  'The office at midnight is two rooms and a transom that will not shut. I had the lamp on over the desk and nothing underneath it worth the current.',
  'The rent was on the desk in an envelope I had not opened. The radiator had given up around ten and I had not argued with it.',
];

/** The client through the door, when `entrances.json` is not on disk yet. */
export const ENTRANCE_LINES: string[] = [
  '{name} came up the stairs slowly enough that I heard every one of them, and then stood in the doorway until I said to sit down.',
  'The door went without a knock in front of it. {name} had been out on the landing a while, working up to the knock and then skipping it.',
];

/**
 * The hiring, when `hiring.json` is not on disk yet. Both carry `{fact}` and
 * `{retainer}`, because §B.2 asks that the player always know two things on
 * page one: what the job is, and that they are being paid for it.
 */
export const HIRING_LINES: string[] = [
  '“{fact}” The money came out after the words did: {retainer}, laid on the blotter like it settled the question. “I’ll look into it,” I said. “I don’t promise you what I find.”',
  '“{fact}” {name} said it to the window rather than to me. {retainer} went on the desk between us and neither of us looked at it. I said I would take the work, and then I took it.',
];

/** The client leaving, with the address the detective can find them at after. */
export const CLIENT_LEAVING: string[] = [
  '“I’ll be at {place} if you want me.” {name} took the stairs faster going down than coming up.',
  '{name} was finished talking. “{place}. That’s where I’ll be.” Then the door, and then the stairs, and then the street.',
  'There was nothing else in {name} to get tonight. “{place},” on the way out, which is an address and a promise and neither one of them much.',
];

/** What the retainer looks like on the desk, by what kind of person paid it. */
export const RETAINERS: Record<string, string> = {
  working: 'twenty dollars',
  professional: 'fifty dollars',
  money: 'a hundred dollars',
  underworld: 'a roll with a rubber band round it',
  any: 'twenty dollars',
};

/** Where two rooms over a shop would be, in each of the twelve neighbourhoods. */
export const OFFICE_STREETS: Record<string, string> = {
  'the Tenderloin': 'West Twenty-Eighth Street',
  'Hell’s Kitchen': 'Tenth Avenue',
  Yorkville: 'East Eighty-Sixth Street',
  'the Lower East Side': 'Rivington Street',
  Chelsea: 'Eighth Avenue',
  Harlem: 'Lenox Avenue',
  'the Bowery': 'Great Jones Street',
  Gramercy: 'Irving Place',
  'the Gas House District': 'East Eighteenth Street',
  'Greenwich Village': 'Bleecker Street',
  'the Upper West Side': 'Columbus Avenue',
  'Little Italy': 'Mulberry Street',
};

/**
 * What kind of place his office is, and the ways of saying each. The
 * designer's note: "Why always 'two rooms above'? Bizarre habit." Every case
 * used to open on "two rooms over a Chinese laundry on…", a shop's name the
 * only thing that moved. Now there are seven kinds of place — the old two
 * rooms over a shop among them — and two or three ways of saying each, so no
 * phrase comes round night after night. Every one of them is up a flight of
 * stairs, because page one has the client come up them, and every one reads
 * as his own place. `{street}` is the neighbourhood's street; `{trade}` the
 * shop downstairs.
 */
export const OFFICE_KINDS: { kind: string; names: string[] }[] = [
  { kind: 'over-a-shop', names: ['two rooms over {trade} on {street}', 'a pair of rooms above {trade} on {street}'] },
  {
    kind: 'walk-up',
    names: ['a room at the top of a walk-up on {street}', 'the top floor of a walk-up on {street}'],
  },
  {
    kind: 'office-building',
    names: [
      'a back room on the fourth floor of a building off {street}',
      'two chairs and a desk three flights up in a building off {street}',
      'a room behind a door with my name on it, three flights up off {street}',
    ],
  },
  {
    kind: 'over-a-cigar-store',
    names: ['one room over a cigar store on {street}', 'the room upstairs from a cigar store on {street}'],
  },
  {
    kind: 'shared-room',
    names: ['a desk in a shared room over a printer’s on {street}', 'half of a room over a printer’s on {street}'],
  },
  {
    kind: 'front-room',
    names: ['the front room of my flat on {street}', 'the front room of a second-floor flat on {street}'],
  },
  { kind: 'end-of-the-hall', names: ['a room at the end of a hall over {trade} on {street}', 'the last door on the landing over {trade} on {street}'] },
];

/** And what is downstairs from him. */
export const OFFICE_TRADES: string[] = [
  'a tailor’s',
  'a printer’s',
  'a locksmith’s',
  'a hat shop',
  'a Chinese laundry',
  'a pawnshop',
];

/** Where each fixture stands, for the one-sentence presence roll (§A.4). */
export const WATCHER_POSTS: Record<string, string> = {
  bartender: 'behind the bar',
  doorman: 'on the door',
  newsstand: 'at the stand',
  counterman: 'behind the counter',
  'ticket-taker': 'in the booth',
  'elevator-man': 'by the car',
  landlady: 'in the hall',
  'beat-cop': 'on the corner',
  cabbie: 'on the stand',
  druggist: 'behind the counter',
};

/** And where everybody else is standing, by what kind of room it is. */
export const GUEST_POSTS: Record<string, string[]> = {
  private: ['by the window', 'at the far end of the room'],
  semi: ['at the far end', 'near the door'],
  public: ['across the way', 'on the corner of it'],
};

/**
 * The morning the run ends in, when the budget is gone.
 *
 * Written here rather than inline in the reducer because the correspondence
 * checker reads this file: "Eight o'clock" is the morning after, not an hour
 * of the evening, and the checker has to be able to tell the difference by
 * seeing the phrase a writer wrote (§A.3).
 */
export const DA_AT_THE_DOOR =
  'Eight o’clock. Somebody from the DA’s office is at the door with a folder and a pen, and the folder is mine whether I write in it or not.';

/* ------------------------------------------------------------------ *
 * M8 — the lines the scene's planner writes in code rather than deals.
 *
 * They live here, like every other hand-written pool, because the
 * correspondence checker reads this file for the words the engine is allowed
 * to print. Slots: {victim} the victim's surname, {he}/{him}/{his} the
 * victim's pronouns (the engine knows them; a card never does), {name} a
 * surname, {Pronoun}/{pronoun}/{possessive} that person's, {place} a short
 * name, {object} a thing with its article.
 * ------------------------------------------------------------------ */

/** §3: the body at the scene, on the first visit. The presence beat must say so. */
export const SCENE_BODY: string[] = [
  '{victim} was still on the floor where {he} had fallen.',
  '{victim} was on the floor where {he} had gone down, and nobody had moved {him}.',
  '{victim} lay where {he} had fallen. Nobody had covered {him} yet.',
];

/** §3: the body, where the scene is out of doors. */
export const SCENE_BODY_OUTSIDE: string[] = [
  '{victim} was still on the ground where {he} had been left.',
  '{victim} lay where {he} had been found. Nobody had covered {him} yet.',
];

/** §3: the body stays all night. A return to the scene finds it where it was. */
export const SCENE_BODY_AGAIN: string[] = [
  '{victim} was where I had left {him}.',
  '{victim} had not moved. Nobody had come for {him} yet.',
];

/** §3: a robbery's scene has no body; it has the place where the thing was. */
export const SCENE_ROBBERY: string[] = [
  'There was a space where {object} had been, and nobody had touched it since.',
  'The place where {object} had been was empty.',
];

/** §3: a disappearance's scene has nobody in it, which is the point. */
export const SCENE_MISSING: string[] = [
  '{victim} was not there, which was the whole trouble.',
  'There was no sign of {victim}, and nobody had expected one.',
];

/** Nobody alive in a room that has the body in it. Said plainly (§3). */
export const NOBODY_ELSE: string[] = ['There was nobody else in the room.', 'Nobody else was there.'];

/** A room with nobody in it at all. */
export const NOBODY_HERE: string[] = ['There was nobody at {place}.', 'Nobody was there.', 'I had {place} to myself.'];

/** §3: what the precinct did, on the first visit to the scene. Keyed by `Precinct`. */
export const PRECINCT_LINES: Record<string, string> = {
  'came-and-went': 'The police had come and gone.',
  'called-it-a-fall': 'The police had called it a fall and gone home.',
  'took-a-statement': 'The precinct had taken its statement and gone home.',
  'not-yet-called': 'Nobody had called the police yet.',
  'closed-it-in-an-hour': 'The precinct had closed it inside the hour and gone home.',
};

/** §1's `act` beat for a search: what the detective does. */
export const SEARCH_ROOM_ACTS: string[] = [
  'I started at the door and worked in.',
  'I went through it from the door inward.',
  'I took the room one wall at a time.',
];

export const SEARCH_THING_ACTS: string[] = [
  'I started with {object} and worked outward.',
  'I went through {object} first, and then the rest.',
];

/**
 * Golden page 3: the things the buttons offer are named in the story and
 * deliberately left, so the buttons read as "go back to that".
 */
export const LEFT_ONE: string[] = [
  'There was {object} in the room as well. I left it where it was for now.',
  '{object} was there too. I left it alone for now.',
];

export const LEFT_TWO: string[] = [
  '{object} was there, and {other}. I left them both where they were for now.',
  'There was {object} in the room, and {other}. I left them both alone for now.',
];


/** §4: spoken to, a person stops what they were doing. */
export const STOP_LINES: string[] = [
  '{name} looked up when I sat down.',
  '{name} left off and looked up.',
  '{name} looked up as I came over.',
];

/** §4: first sight — who they are to the case, and their sex and rough age. */
export const SIGHT_LINES: string[] = [
  '{Pronoun} was {clause}, a {noun} in {possessive} {decade}.',
  '{Pronoun} was {clause}: a {noun} in {possessive} {decade}.',
];

/** §2: the question that carries its own reason. Golden page 5. */
export const CARRIED_QUESTIONS: string[] = ['{victim} had {article} {noun}. {subject}.'];
export const CARRIED_QUESTIONS_PLAIN: string[] = ['{subject}, {clause}.'];

/** The coroner's note, where it is found at the scene: its source, before its words. Golden page 2. */
export const MORGUE_LEADS: string[] = [
  'The coroner’s man had left a note on the back of an intake form.',
  'The coroner’s note was on the table under a glass, left for whoever came next.',
  'The coroner’s office had left a note behind, for whoever came next.',
];

/** A question that got nothing, told afterwards. {name} is the one asked. */
export const NOTHING_ASKED: string[] = [
  '{name} turned the question over, found nothing in it, and handed it back. “Couldn’t tell you.”',
  '{name} thought about it long enough that I got my hopes up. Then: “No.”',
  '“Ask me a different one.” {name} did not offer a different one.',
  '{name} didn’t know, and for once in this neighbourhood I believed somebody.',
];

/** Taking it down, after an answer. The golden's "I wrote it down." */
export const WROTE_IT_DOWN: string[] = [
  'I wrote it down.',
  'I wrote that down.',
  'I put it in the notebook.',
  'I got it down on paper.',
  'I wrote it in the book.',
];

/** The thought's lead-in on a page that found something. Golden page 5. */
export const LOOKED_AGAIN: string[] = [
  'Then I looked at what I’d written.',
  'Then I read it back.',
  'Then I read it over again.',
  'Then I looked at it on the page.',
];

/* ------------------------------------------------------------------ *
 * docs/25 read-through, engine prose (docs/26): what a search finds, told.
 * ------------------------------------------------------------------ */

/**
 * A secret explained, found by searching (a disqualifier): what the detective
 * finds, by the kind of secret. The engine writes the sentence after it from
 * the clue's facts — who, where and when — so every name and hour on the page
 * traces to the clue. Slots: {P} the one whose secret it is, {V} the victim.
 * Past tense and plain. It explains a lie; it clears nobody.
 */
export const SECRET_FINDS: Record<string, string[]> = {
  affair: [
    'A note was tucked in the blotter, in a hand that had not troubled to disguise itself, fixing an hour to meet.',
    'Two hats hung on the one hook behind the door, and one of them was {P}’s.',
  ],
  embezzling: [
    'In the back of a drawer was a bank book in a name that was not {P}’s, kept in {P}’s hand: two hundred dollars a month for a year.',
    'Under the blotter were ledger pages copied out in {P}’s hand, with the totals made to come right.',
  ],
  'gambling-debt': [
    'A bookmaker’s receipt was folded small behind the clock, made out to {P} against a debt of eleven hundred dollars.',
    'A bookmaker’s tally was pinned inside a cupboard door, with {P}’s name against the payments.',
  ],
  fence: [
    'A dealer’s tag was tied to a parcel of silver on the shelf, and the silver had never been {P}’s to sell.',
    'A dealer’s tag was stuck in the frame of the mirror, dated and signed for a parcel of stolen silver {P} had handed over.',
  ],
  blackmail: [
    '{V}’s bank book was in the desk, with four payments marked in it and a fifth waiting to be collected.',
    'A folded photograph was in the desk drawer, of something {V} would have paid to keep folded, and {P}’s name was on the envelope it came in.',
  ],
  'secret-drinking': [
    'A bar tab was spiked on a nail behind the counter, run up in {P}’s hand under somebody else’s name.',
    'A bottle was pushed behind the pipes, and the tab tucked under it was in {P}’s hand.',
  ],
  'forged-identity': [
    'A desertion warrant from 1918 was folded in with some old letters, and the name on it was the one {P} was born with.',
    'A deportation order was in the drawer, years old, and the name on it had been {P}’s before {P} changed it.',
  ],
  dope: [
    'A doctor’s letter was in the drawer, about {P} and the morphine, with the hour of the last visit written at the foot of it.',
    'A little packet of morphine was in the drawer, and the receipt under it was made out to {P}.',
  ],
  'union-organizing': [
    'A detective agency’s report was in the desk, typed up for somebody’s employer, about {P} and a union.',
    'A strapped envelope of signed union cards was in the desk, forty of them, and the list on top was in {P}’s hand.',
  ],
  'hidden-family': [
    'A receipt for a child’s keep was in the drawer, paid up through tonight and signed for by {P}.',
    'A child’s photograph was in the drawer, with a receipt for the month’s keep behind it in {P}’s name.',
  ],
};

/** The same, for a secret whose kind has no line of its own. */
export const SECRET_FIND_ANY: string[] = [
  'There was something in the drawer that explained {P}, and {P} would not have wanted it found.',
];

/** After a secret found: where it put them, from the clue's facts. {who} {at} {when}. */
export const SECRET_FIND_PUT: string[] = ['It put {who} {at} {when}.', 'It had {who} {at} {when}.'];

/**
 * What a secret found means, from Poached up: the reason somebody would lie
 * about an hour, and nothing about the crime. Never "was out of it" (docs/25).
 * {subject} {doing} {he} {him} {crime}.
 */
export const EXPLAINED_THOUGHTS: string[] = [
  'So that was what {subject} had been keeping back: {doing}. If {subject} told me {he} was somewhere else then, this was why. It did not explain {crime}.',
  'That was {subject}’s secret, then: {doing}. It was a reason to lie about the hour, and no answer to {crime}.',
  '{subject} had been {doing}. It explained why {he} might lie about where {he} had been. It did not clear {him} of anything else.',
  'It explained why {subject} would keep quiet about that hour: {doing}. What it did not explain was {crime}.',
];

/** A secret found with no hours to it: what it means. */
export const EXPLAINED_THOUGHTS_NO_HOUR: string[] = [
  'So that was what {subject} had been keeping back: {doing}. It explained the silence. It did not explain {crime}.',
  '{subject} had been {doing}, and would rather lie than say so. It did not clear {him} of anything else.',
];

/** What the case was, for "it did not explain {crime}". */
export const CRIME_NOUN: Record<string, string> = {
  murder: 'the killing',
  robbery: 'the robbery',
  missing: 'the disappearance',
};

/**
 * When something happened, written down where he searched (a timing clue).
 * {anchor} its name, {times} its hours. Said once a night: a timing clue whose
 * hour is already told is `SEARCH_TIMING_KNOWN`.
 */
export const SEARCH_TIMING: string[] = [
  'Somebody had pencilled the time of {anchor} on the wall by the door: {times}.',
  'The time of {anchor} was written on the back of a calendar by the door: {times}.',
  'Somebody here had kept a note of {anchor}, with the hour in it: {times}.',
];

/** The same, for something that comes round more than once a night. */
export const SEARCH_TIMING_MANY: string[] = [
  'Somebody had pencilled the times of {anchor} on the wall by the door: {times}.',
  'Somebody here had kept a note of {anchor}, every time it came round: {times}.',
];

/** The same, when the night has told one of those hours already: only the others are said. */
export const SEARCH_TIMING_MORE: string[] = [
  'Somebody here had kept a note of {anchor}, and it had the other times it came round: {times}.',
  'The times of {anchor} were pencilled by the door: the one I already had, and {times}.',
];

/** A timing clue whose hour the night has already given: the hour is not said again. */
export const SEARCH_TIMING_KNOWN: string[] = [
  'Somebody here had written down {anchor} as well, at the hour I already had.',
  'The time of {anchor} was pencilled by the door, and it was the hour I already had.',
];

/**
 * The thought on the hour of something the block times things by. The find or
 * the telling has just said the hour, so this says what it is good for and
 * never says the hour again (docs/25). {other} is the anchor.
 */
export const TIMING_THOUGHTS: string[] = [
  'Now {other} had an hour, and so did anybody seen somewhere by it.',
  'Anything anybody had timed by {other} had that hour too.',
  'Whoever was seen somewhere during {other} had been seen at that hour, then.',
];

/** The same, for something that comes round more than once a night. */
export const TIMING_THOUGHTS_MANY: string[] = [
  'Now {other} had its hours, and so did anybody seen somewhere by it, if I knew which time.',
  'Anything anybody had timed by {other} was at one of those hours, then.',
];

/**
 * A sighting tied to something whose hour the night has already told, where
 * the notebook has that hour only in the room's own words: the hour is not
 * said again. {subject} {place} {other}.
 */
export const ANCHORED_KNOWN_THOUGHTS: string[] = [
  '{subject} had been at {place} during {other}, and I already had the hour of that.',
  'It put {subject} at {place} during {other}. I knew when that was.',
];

/** The same, for something that came round more than once: which time, it does not say. */
export const ANCHORED_RECURRING_THOUGHTS: string[] = [
  'It put {subject} at {place} during {other}, at one of the times it came round, and it didn’t say which.',
  '{subject} had been at {place} during {other}. I knew when that came round, but not which time this was.',
];

/** The same, for something that comes round more than once, of which the night has told one hour. */
export const ANCHORED_PARTIAL_THOUGHTS: string[] = [
  'It put {subject} at {place} during {other}. I had one hour for that, and it came round more than once a night.',
  '{subject} had been at {place} during {other}. That went more than once a night, and I knew only one of the times.',
];

/**
 * A search thought whose find does not name the one it is about: the thought
 * does not name them either (docs/25). {place} {time}.
 */
export const NAMELESS_THOUGHTS: string[] = [
  'It put somebody at {place} at {time}, and it did not say who. I didn’t guess yet.',
  'Somebody had been at {place} at {time}. Who, it didn’t say.',
];

/** The same, with no place and hour to it. */
export const NAMELESS_THOUGHTS_NO_HOUR: string[] = [
  'It was worth keeping, though it did not say whose it was.',
  'It did not say who, and I didn’t guess yet.',
];

/**
 * A bridge to when something the block times things by happened: who would
 * know, and never the window's hour beside it (docs/26). {who} {subject}
 * {where}.
 */
export const ANCHOR_BRIDGES: string[] = [
  '{who} would know when {subject} came by.',
  'The question was when {subject} was. {who} was the one to ask.',
  '{who} would know the hour of {subject}, if anybody did.',
];

/** The same, with where the one to ask is found. */
export const ANCHOR_BRIDGES_WHERE: string[] = [
  '{who} would know when {subject} came by. {who} was at {where}.',
  'The question was when {subject} was. {who} might say, at {where}.',
];

/** After a bridge to somebody in the room: they are not sent for (docs/26). {who} {them}. */
export const BRIDGE_HERE: string[] = ['{who} was right there.', 'I didn’t have far to go for {who}.'];

/** After a bridge to the one he is talking to. */
export const BRIDGE_TALKING: string[] = ['{who} was still in front of me.', 'I wasn’t done with {who} yet.'];

/** A sighting tied to something that came round more than once, at a second place: its own clause. */
export const ANOTHER_TIME = 'Another time, {he} was {where}.';

/**
 * The hiring card's `{dashiell}`: what he says between the client's reason
 * and the money.
 */
export const HIRING_DASHIELL: Record<'yes' | 'no', string[]> = {
  no: ['“That’s all?” I said.', '“All right,” I said.', '“It’ll do to start,” I said.', '“I’ve started on less,” I said.'],
  yes: ['“I remember,” I said.', '“Same as last time, then,” I said.', '“All right,” I said.'],
};

/* ------------------------------------------------------------------ *
 * M12 Part 1 — the ask, in reported speech.
 * ------------------------------------------------------------------ */

/**
 * The question told in his narration, by what the answer tells (the family of
 * facts the first telling is): "I asked her where she'd been tonight." {him}
 * {he} {his} are the person he asks; {name} the one the question is about;
 * {anchor} the thing the block times itself by; {topic} the thing asked about.
 * No hour, no place by name.
 */
export const ASK_REPORTED: Record<string, string[]> = {
  evening: [
    'I asked {him} where {he}’d been tonight.',
    'I asked {him} for {his} evening, start to finish.',
    'I asked {him} to walk me through {his} evening.',
    'I asked {him} where {he}’d been tonight. I asked it nicely.',
  ],
  movements: [
    'I asked {him} where {name} had been tonight.',
    'I asked what {he} had seen of {name} tonight.',
    'I asked {him} about {name}’s evening, as much of it as {he} had seen.',
  ],
  knowing: ['I asked {him} how well {he} knew {name}.', 'I asked {him} what {name} was to {him}.'],
  counts: ['I asked {him} who had come and gone tonight, and when.', 'I asked {him} to count me the comings and goings.'],
  strangers: ['I asked {him} about the faces {he} hadn’t known.', 'I asked whether anybody had come through that {he} didn’t know.'],
  timing: ['I asked {him} what time {anchor} was.', 'I asked {him} if {he} knew when {anchor} was.'],
  event: ['I asked {him} what {he} remembered of {anchor}.', 'I asked {him} about {anchor}.'],
  thing: ['I asked {him} about {topic}.', 'I asked {him} what {he} knew about {topic}.'],
};

/* ------------------------------------------------------------------ *
 * M12 Part 2 — the recap's clauses.
 *
 * One clause a fact the notebook holds, or the absence of one. Every slot is
 * filled from the notebook by `recap.ts`; the correspondence checker holds
 * each clause to its trace. {span} and {when} carry their own preposition
 * ("between eight and half past eight", "at half past eight"). A clause marked
 * with a leading `*` has a joke in it, and a paragraph has one joke at most.
 * ------------------------------------------------------------------ */

export const RECAP_WHEN: Record<string, string[]> = {
  'murder-span': ['{Victim} died at {place} {span}.', '{Victim} died at {place}, {span}.'],
  'murder-none': ['{Victim} was dead at {place}, and I didn’t have the hour yet.'],
  'found-span': ['{Victim} was found at {place}, and died {span}.'],
  'found-none': ['{Victim} was found dead at {place}, and I didn’t have the hour yet.'],
  'robbery-span': ['{Object} went from {place} {span}.'],
  'robbery-none': ['{Object} went from {place}, and I didn’t have the hour yet.'],
  'missing-span': ['{Victim} went missing from {place} {span}.'],
  'missing-none': ['{Victim} went missing from {place}, and I didn’t have the hour yet.'],
};

export const RECAP_ANCHOR: string[] = [
  '*{Anchor} was at {time}, and so far it was the only honest clock on the street.',
  '{Anchor} was at {time}. It was the nearest thing I had to a clock I could trust.',
];

export const RECAP_METHOD: string[] = ['As for how, it was {method}.', 'The how of it was {method}.'];

export const RECAP_CLAIMED_ALONE: string[] = [
  '{P} had given me {his} own evening, and nobody’s word under it but {his} own.',
  '{P} had told me {his} evening, and so far nobody else had said a word about it.',
];

export const RECAP_CLAIMED_WITH: string[] = [
  '{P} had given me {his} evening, and {S}’s word sat under part of it.',
  '{P}’s evening had {S} backing up some of it.',
];

export const RECAP_OTHERS: string[] = [
  '{P}’s evening I had only from {S}.',
  'All I had of {P}’s evening came from {S}.',
  'For {P} I had {S}’s word, and nothing of {his} own.',
  'What I knew of {P}’s night, I knew from {S}.',
];

/** The same, from people the reader has not met: {hole} is empty or ", and it had a hole in it {when}". */
export const RECAP_OTHERS_ANON: string[] = ['{P}’s evening I had only from other people{hole}.'];

/** An evening with a word under it from somebody the reader has not met. */
export const RECAP_CLAIMED_ANON: string[] = ['{P} had given me {his} evening, and somebody else’s word sat under part of it.'];

/** Two words that disagree, the other from somebody the reader has not met. */
export const RECAP_CONFLICT_ANON: string[] = ['{P} said {A} {when}, and somebody else had {him} at {B}. One of them had it wrong.'];

export const RECAP_OTHERS_HOLE: string[] = [
  '{P}’s evening I had only from {S}, and it had a hole in it {when}.',
  'For {P} I had {S}’s word, nothing of {his} own, and nothing at all {when}.',
  '*{P}’s evening I had from {S}, with a hole in it {when} you could drive a milk wagon through.',
];

export const RECAP_SEEN: string[] = ['{P} I had only seen, at {place}.', '{P} I’d seen at {place}, and that was all.'];

export const RECAP_CONFLICT: string[] = [
  '{P} said {A} {when}. {S} had {him} at {B}. One of them had it wrong.',
  '*{P} told me {A} {when}, and {S} told me {B}. Somebody’s memory was off, or somebody’s manners.',
];

export const RECAP_CONFLICT_FOUND: string[] = ['{P} said {A} {when}, and what I found at {room} had {him} at {B}.'];

export const RECAP_CONFLICT_NOT: string[] = ['{P} said {A} {when}, and {S} said {he} wasn’t there.'];

export const RECAP_UNPLACED_ONE: string[] = [
  'Nobody had told me where {P} was {when}, including {P}.',
  'Nobody had put {P} anywhere {when}, not even {P}.',
];

/** The same, just after a clause about the same person: {he} for the first mention. */
export const RECAP_UNPLACED_AGAIN: string[] = ['Nobody had told me where {he} was {when}, including {P}.'];

export const RECAP_UNPLACED_MANY: string[] = [
  'Nobody had told me where {list} were {when}, and none of them had told me either.',
];

export const RECAP_NEXT_ASK: string[] = ['I’d ask {who} about {topic} next.', 'I wanted {who} next, about {topic}.'];
export const RECAP_NEXT_SEARCH: string[] = ['I’d go through {place} next.', 'I wanted a look through {place} next.'];
export const RECAP_NEXT_EVENING: string[] = [
  'I wanted {P}’s own account of {his} evening.',
  'I wanted {P} to tell me {his} evening in {his} own words.',
];
export const RECAP_NEXT_PUT: string[] = [
  'It was time to start putting what I had to people, and see whose story gave.',
  'It was time to read some of this back to the people it was about.',
];

/** The on-demand page when there is nothing new to go over, or not enough yet. */
export const RECAP_NOTHING_NEW = 'I went over it again. Nothing had moved since the last time, including me.';
export const RECAP_TOO_SOON = 'There wasn’t enough in the notebook yet to be worth going over. I went back to filling it.';
export const RECAP_OFFICE = 'I didn’t go over it here. The office was for the client’s troubles; mine could wait for the street.';
