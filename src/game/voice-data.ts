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
  { command: 'examine <place or object>', gloss: 'Go through the room. Costs an action.' },
  { command: 'look', gloss: 'The room, and who is standing in it. Free.' },
  { command: 'notebook', gloss: 'Everything written down so far. Free.' },
  { command: 'file', gloss: 'Take the report to the DA. Ends the night.' },
  { command: 'help', gloss: 'This page. Free.' },
];

export const HELP_NOTE =
  'Topics worth trying: anybody’s surname, a room, a thing, something that happened at a fixed hour, that evening, why I was hired. Underlined words on the page are clickable, and so is every lead in the notebook.';
