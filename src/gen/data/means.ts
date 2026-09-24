import type { Entry, PetKind } from '../types.js';
import { METHOD_TEMPLATES, type MethodTemplate } from './methods.js';

/**
 * M5 §2. A robbery and a disappearance run through exactly the machinery a
 * murder runs through: the actor is alone at a place at a tick, had to fetch
 * something beforehand, and left a trace behind. What changes is what the
 * something is.
 *
 * For a murder the means is the weapon. For a robbery it is the way in — the
 * key off the board, the combination out of the book, the cord made fast to
 * the fire escape rail. For a disappearance it is what the person needed to
 * go, or what the one who took them needed to take them.
 *
 * A means card is a `MethodTemplate` with one extra field, so that everything
 * downstream — the access leg of the proof, the physical clue where the object
 * lived, the scene report, par — works without knowing which deck it came out
 * of. `bodyEvidence` is the official report, whatever the officials call it;
 * `sceneTrace` is what the room still shows; `soundNote` is what a neighbour
 * heard.
 */
export interface MeansTemplate extends MethodTemplate {
  /** How they got in. Robbery only. */
  entry?: Entry;
  /** M14, lost pet: the animals this way out makes sense for. A goat does not go in a hatbox. */
  pets?: PetKind[];
}

export const MURDER_MEANS: MeansTemplate[] = METHOD_TEMPLATES;

export const ROBBERY_MEANS: MeansTemplate[] = [
  {
    id: 'took-the-key',
    name: 'a key off the board',
    entry: 'key',
    noise: 0,
    evidenceObjectId: 'obj-roofkey',
    bodyEvidence:
      'The precinct report says the lock was not forced. It was opened, and it was locked again afterwards.',
    evidenceNote: 'The key is off its hook, and the hook has not been dusty in a week.',
    sceneTrace: 'There is a clean rectangle in the dust where it stood, and nothing else in the room was moved.',
    accessNote: 'had to take the key off the board',
    soundNote: 'a door being locked from the outside',
  },
  {
    id: 'worked-the-combination',
    name: 'the combination, written down where it should not have been',
    entry: 'combination',
    noise: 0,
    evidenceObjectId: 'obj-ledger',
    bodyEvidence:
      'The precinct report says the safe was opened and not broken. Whoever turned the dial knew the numbers.',
    evidenceNote: 'The book is gone from the shelf, and the numbers were written on the flyleaf of it.',
    sceneTrace: 'The dial is back at zero and the door was pushed to but never locked again.',
    accessNote: 'had to get at the book the numbers were written in',
    soundNote: 'a safe door swinging on a dry hinge',
  },
  {
    id: 'came-in-the-window',
    name: 'a cord tied to the fire escape',
    entry: 'window',
    noise: 1,
    evidenceObjectId: 'obj-cord',
    bodyEvidence:
      'The precinct report says the window catch was sprung from outside and the sill was scraped.',
    evidenceNote: 'A cut end of the same hemp is still tied to the rail it was taken from.',
    sceneTrace: 'The window is down but not latched, and there is grit from the fire escape on the sill.',
    accessNote: 'had to tie the cord to the fire escape',
    soundNote: 'a window going up and somebody on the fire escape outside',
  },
  {
    id: 'never-left',
    name: 'a case left in the cloakroom that morning',
    entry: 'never-left',
    noise: 0,
    evidenceObjectId: 'obj-suitcase',
    bodyEvidence:
      'The precinct report says there was no entry at all. Whoever it was was inside before the door was shut.',
    evidenceNote: 'The strapped case is gone from where it was checked, and the check is still in the book.',
    sceneTrace: 'Nothing was forced and nothing was broken. Whoever it was had all night and took twenty minutes.',
    accessNote: 'had to collect the case before the room was shut up',
    soundNote: 'somebody moving about in a room that was supposed to be empty',
  },
  {
    id: 'was-let-in',
    name: 'a telephone call that got the door opened',
    entry: 'let-in',
    noise: 0,
    evidenceObjectId: 'obj-telephone',
    bodyEvidence:
      'The precinct report says the door was opened from inside. Nothing about it was forced.',
    evidenceNote: 'The call went through this telephone at a quarter to, and the operator has a record of it.',
    sceneTrace: 'Two chairs are pulled round to face each other and one of them was sat in.',
    accessNote: 'had to reach a telephone and be believed on it',
    soundNote: 'a bell, and then a door being opened to somebody',
  },
];

export const MISSING_MEANS: MeansTemplate[] = [
  {
    id: 'the-timetable',
    name: 'a train out, and the timetable it was read off',
    noise: 0,
    evidenceObjectId: 'obj-timetable',
    bodyEvidence:
      'The precinct took a statement and filed it. A grown person is allowed to go where they like.',
    evidenceNote: 'The timetable has been pulled off the wall, and the corner of it is still pasted there.',
    sceneTrace: 'The room was left tidy and the bed was not slept in.',
    accessNote: 'had to read the departures off the wall',
    soundNote: 'a door pulled shut on an empty room',
  },
  {
    id: 'the-packed-case',
    name: 'a case packed in a hurry',
    noise: 0,
    evidenceObjectId: 'obj-suitcase',
    bodyEvidence:
      'The precinct took a statement and filed it. Nobody at the desk thought it was a police matter.',
    evidenceNote: 'The strapped case is gone from the wardrobe, and the straps were bought new last week.',
    sceneTrace: 'Two drawers are open and the good coat is off its hanger.',
    accessNote: 'had to get the case out of the wardrobe',
    soundNote: 'somebody going down the stairs with something heavy',
  },
  {
    id: 'the-pawned-ring',
    name: 'money raised in a hurry at a pawnshop, on a spike of pawn tickets',
    noise: 0,
    evidenceObjectId: 'obj-pawn-ticket',
    bodyEvidence:
      'The precinct took a statement and filed it. They will look again in a week if nobody turns up.',
    evidenceNote: 'The spike has a gap in it and the last ticket written was torn off the pad.',
    sceneTrace: 'The drawer was gone through and the only thing missing is what was worth money.',
    accessNote: 'had to raise the money on something',
    soundNote: 'a drawer being turned out fast',
  },
  {
    id: 'the-borrowed-coat',
    name: 'a coat borrowed off a hook and never brought back',
    noise: 0,
    evidenceObjectId: 'obj-overcoat',
    bodyEvidence:
      'The precinct came, looked at the room, and said to wait a day or two.',
    evidenceNote: 'The camel-hair coat is off its hook and the hook is the only empty one.',
    sceneTrace: 'The lamp was left burning and the door was left shut but not locked.',
    accessNote: 'had to take a coat that would not be recognised',
    soundNote: 'the street door going, and nobody coming back through it',
  },
];

/**
 * M14 — the mundane three. The machine is the same machine: the one the
 * report asks for was alone at the scene at the half hour, and had fetched
 * something from another room first. For a lost pet it is how the animal got
 * out or was got out; for a lost item, how it came off its shelf; for an
 * affair, what the pair of them needed to meet without being known. The
 * object ids are the old ones, so no place card changes; the words are new.
 */
export const PET_MEANS: MeansTemplate[] = [
  {
    id: 'pet-roof-door',
    name: 'the roof door, opened with its key',
    pets: ['dog', 'cat', 'parrot', 'goat'],
    noise: 0,
    evidenceObjectId: 'obj-roofkey',
    bodyEvidence: 'It went out by the roof door, which was found propped open with a brick, and which only opens with the key.',
    evidenceNote: 'The nail it hangs from is empty, and it is the only clean thing on that wall.',
    sceneTrace: 'The water dish is full and the blanket in the corner is still warm on one side.',
    accessNote: 'had to take the roof-door key off its nail',
    soundNote: 'the roof door banging in the wind',
  },
  {
    id: 'pet-sash-cord',
    name: 'a length of sash cord, for a leash',
    pets: ['dog', 'goat'],
    noise: 0,
    evidenceObjectId: 'obj-cord',
    bodyEvidence: 'It went out by the front, on a leash. The collar was found on the step, unbuckled, not broken, and somebody took it off.',
    evidenceNote: 'A length has been cut off the coil, clean, with a sharp knife, by somebody in no hurry.',
    sceneTrace: 'The collar is on the floor by the door with the buckle undone and the tag still on it.',
    accessNote: 'had to cut a length of sash cord to walk the animal off with',
    soundNote: 'one short complaint and then nothing at all',
  },
  {
    id: 'pet-hatbox',
    name: 'a hatbox with holes punched in the lid',
    pets: ['cat', 'parrot'],
    noise: 0,
    evidenceObjectId: 'obj-hatbox',
    bodyEvidence: 'It went out carried. There was a hatbox lid by the basement steps with holes punched in it.',
    evidenceNote: 'One box is gone off the top of the stack, and the stack has been squared up again by somebody tidy.',
    sceneTrace: 'The basket is empty, and somebody has put the cushion back in it very neatly.',
    accessNote: 'had to take a hatbox off the stack',
    soundNote: 'something complaining inside a box, going down the stairs',
  },
  {
    id: 'pet-gate-pin',
    name: 'the pin out of the gate hinge',
    pets: ['dog', 'goat'],
    noise: 0,
    evidenceObjectId: 'obj-toolbox',
    bodyEvidence: 'It went out by the back gate, which was found hanging off its top hinge. The pin was drawn, not broken.',
    evidenceNote: 'The pliers are missing from the toolbox, and the tray they live in is the only empty one.',
    sceneTrace: 'The gate is hanging by one hinge, and the pin is gone from the other.',
    accessNote: 'had to get a pair of pliers out of the toolbox',
    soundNote: 'a gate scraping on stone',
  },
];

export const ITEM_MEANS: MeansTemplate[] = [
  {
    id: 'item-drawer-key',
    name: 'the key to the drawer it was kept in',
    noise: 0,
    evidenceObjectId: 'obj-roofkey',
    bodyEvidence: 'The drawer was locked again afterwards. Whoever opened it had the key and put it back.',
    evidenceNote: 'The drawer key hangs on the ring with the roof-door key, and the ring was hung back on the wrong nail.',
    sceneTrace: 'The drawer is locked, and the velvet inside it still has the dent in it.',
    accessNote: 'had to get the drawer key off the ring it hangs on',
    soundNote: 'a drawer shutting, and a key turning in it',
  },
  {
    id: 'item-hatbox',
    name: 'an empty hatbox to carry it in',
    noise: 0,
    evidenceObjectId: 'obj-hatbox',
    bodyEvidence: 'Nothing was forced. It went out of the room in something, and nobody looks twice at a hatbox.',
    evidenceNote: 'One box is gone off the stack, and it was the empty one.',
    sceneTrace: 'The shelf has a clean ring in the dust where it stood, and the dust either side is not touched.',
    accessNote: 'had to take an empty hatbox off the stack',
    soundNote: 'somebody going down the stairs carrying something light, carefully',
  },
  {
    id: 'item-pawn-ticket',
    name: 'a pawn ticket, and the money it raised',
    noise: 0,
    evidenceObjectId: 'obj-pawn-ticket',
    bodyEvidence: 'Nothing was forced. It went out of the room in somebody’s pocket, and a pocket is quiet.',
    evidenceNote: 'The last ticket on the spike was torn off the pad in a hurry, and the stub is blank.',
    sceneTrace: 'The shelf is bare where it stood, and nothing else in the room was moved.',
    accessNote: 'had to tear a blank ticket off the pawnbroker’s spike',
    soundNote: 'the street door, and somebody walking fast',
  },
  {
    id: 'item-umbrella',
    name: 'something carried out under an umbrella on a dry night',
    noise: 0,
    evidenceObjectId: 'obj-umbrella',
    bodyEvidence: 'Nothing was forced. It went out under something, on a dry night, which somebody noticed.',
    evidenceNote: 'One umbrella is gone out of the stand on a night it did not rain.',
    sceneTrace: 'The shelf is bare where it stood, and there is a drip of candle wax on the edge that was not there before.',
    accessNote: 'had to fetch one out of the brass stand first',
    soundNote: 'an umbrella being opened indoors, and somebody saying that was bad luck',
  },
];

export const MEETING_MEANS: MeansTemplate[] = [
  {
    id: 'meet-overcoat',
    name: 'a borrowed overcoat, so as not to be known',
    noise: 0,
    evidenceObjectId: 'obj-overcoat',
    bodyEvidence: 'The good coat stayed on its hook at home. Whoever went out went out in somebody else’s.',
    evidenceNote: 'The camel-hair coat is off its hook, and it came back with the collar turned up.',
    sceneTrace: 'Two cups on the table, one with lipstick on it and one without, and neither of them washed.',
    accessNote: 'had to borrow a coat nobody would know',
    soundNote: 'two people laughing behind a door, and then quiet',
  },
  {
    id: 'meet-telephone',
    name: 'a telephone call to fix the time',
    noise: 0,
    evidenceObjectId: 'obj-telephone',
    bodyEvidence: 'Somebody telephoned that afternoon to fix the time. The operator remembers the number.',
    evidenceNote: 'The call went through this telephone at a quarter past five, and the operator has it written down.',
    sceneTrace: 'Two chairs pulled close together at one end of a long table, and the rest of the table empty.',
    accessNote: 'had to use a telephone somebody else would not hear',
    soundNote: 'a door shutting softly, twice, a minute apart',
  },
  {
    id: 'meet-evening-paper',
    name: 'a note folded into the evening paper',
    noise: 0,
    evidenceObjectId: 'obj-newspapers',
    bodyEvidence: 'A note went back and forth that day inside the evening paper, which is the oldest trick there is.',
    evidenceNote: 'One paper off the top of the stack has been folded and unfolded until it is soft.',
    sceneTrace: 'An ashtray with two kinds of cigarette in it, and one of them never smoked past the first inch.',
    accessNote: 'had to take an evening paper off the stack with a note in it',
    soundNote: 'a gramophone playing the same side twice',
  },
  {
    id: 'meet-umbrella',
    name: 'a walk under an umbrella on a dry night, so as not to be seen',
    noise: 0,
    evidenceObjectId: 'obj-umbrella',
    bodyEvidence: 'Somebody walked there under an umbrella on a night it did not rain, which is how you walk when you do not want your face seen.',
    evidenceNote: 'One umbrella is out of the stand, and it did not rain all evening.',
    sceneTrace: 'A dry umbrella stand by the door, and two coats on one hook.',
    accessNote: 'had to fetch one out of the brass stand first',
    soundNote: 'two sets of footsteps on the stairs, one of them trying to be quiet',
  },
];
