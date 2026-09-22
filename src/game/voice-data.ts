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
  { command: 'ask <person> about <topic>', gloss: 'Put it to them. Costs an action.' },
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
  'Nothing he would say twice. Here is the once:',
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
