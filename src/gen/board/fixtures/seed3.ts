import type { BoardCase } from '../types.js';
import { account, list, rows } from './build.js';

/**
 * docs/golden/small-board-seed3.md (and docs/41's worked example): the Sirkin
 * case at Medium, encoded as written. Where the golden is silent, the encoding
 * says so. `seed3Repaired` is the smallest change that makes it rate Medium.
 */

const HOURS = [7, 8, 9, 10];

export function seed3(): BoardCase {
  return {
    id: 'golden-seed3',
    seed: 3,
    tier: 4,
    type: 'murder',
    client: 'hauck',
    people: [
      // 4a.2: where each lives and works, for `liesPlausible` (the golden says it in prose).
      { id: 'marchetti', name: 'Miss Marchetti', short: 'Marchetti', role: 'suspect', description: 'a switchboard operator; lodges at Rafferty’s', foundAt: 'rafferty', motive: 'Sirkin had a file on her: selling subscribers’ calls to a newspaperman', female: true, home: 'rafferty' },
      { id: 'steinbach', name: 'Mr. Steinbach', short: 'Steinbach', role: 'suspect', description: 'a piano teacher; lodges at Rafferty’s', foundAt: 'velvet', motive: 'Sirkin closed his school', female: false, home: 'rafferty' },
      { id: 'vitale', name: 'Vitale', short: 'Vitale', role: 'suspect', description: 'a bookmaker', foundAt: 'velvet', motive: 'a favour gone sour', secret: 'the Friday card game in the back room; his wife thinks he gave it up at Easter', female: false, home: 'vitale-home' },
      { id: 'crowninshield', name: 'Dr. Crowninshield', short: 'the dentist', role: 'suspect', description: 'a dentist; owed Sirkin $4,000', foundAt: 'velvet', motive: 'owed him $4,000', female: true, works: 'surgery' },
      { id: 'sirkin', name: 'Isidore Sirkin', short: 'Sirkin', role: 'victim', description: 'a buildings inspector', foundAt: 'walkup' },
      { id: 'hauck', name: 'Ilse Hauck', short: 'Hauck', role: 'client', description: 'Sirkin’s sister-in-law', foundAt: 'velvet' },
      { id: 'rafferty', name: 'Mrs. Rafferty', short: 'Mrs. Rafferty', role: 'watcher', description: 'the landlady, on a kitchen chair at the foot of her stairs', foundAt: 'rafferty' },
      { id: 'hargrove', name: 'Hargrove', short: 'Hargrove', role: 'watcher', description: 'the bartender at the Velvet Room', foundAt: 'velvet' },
    ],
    places: [
      { id: 'walkup', name: 'Sirkin’s walk-up over the drugstore on Grand Street', short: 'Sirkin’s walk-up', kind: 'home', open: [7, 10], scene: true, street: 'Grand Street' },
      { id: 'rafferty', name: 'Rafferty’s rooming house on Mott Street', short: 'Rafferty’s', kind: 'home', open: [7, 10], street: 'Mott Street' },
      { id: 'velvet', name: 'the Velvet Room, six steps down under a hat shop', short: 'the Velvet Room', kind: 'bar', open: [7, 10], street: 'Elizabeth Street' },
      { id: 'surgery', name: 'Crowninshield’s surgery', short: 'her surgery', kind: 'work', open: [7, 8], street: 'Delancey Street' },
      // Off the board: only Vitale's lie goes there.
      { id: 'vitale-home', name: 'Vitale’s flat', short: 'home', kind: 'home', open: [7, 10], street: 'Kenmare Street' },
    ],
    board: {
      hours: HOURS,
      rows: rows(HOURS, {
        marchetti: ['rafferty', 'rafferty', 'walkup', 'velvet'],
        steinbach: ['rafferty', 'velvet', 'velvet', 'velvet'],
        vitale: ['rafferty', 'velvet', 'velvet', 'velvet'],
        crowninshield: ['surgery', 'surgery', 'velvet', 'velvet'],
        sirkin: ['walkup', 'velvet', 'walkup', 'walkup'],
      }),
      reasons: {
        marchetti: { 9: 'went out at a quarter to nine, in her good coat, with the chloral in her bag', 10: 'a nightcap' },
        steinbach: { 8: 'went out for a drink after his lesson' },
        vitale: { 7: 'up to see Steinbach about what he owes', 8: 'a drink' },
        crowninshield: { 9: 'closed the surgery at half past eight and went for a drink' },
        sirkin: { 8: 'his rye at the Velvet Room', 9: 'left before nine: he had company coming' },
      },
    },
    crime: {
      culprit: 'marchetti',
      hour: 9,
      // "He says Sirkin drank it between nine and ten": one hour, though Medium is past Soft-boiled.
      window: [9],
      scene: 'walkup',
      victim: 'sirkin',
      why: 'Sirkin had a typed account of her selling subscribers’ calls to a newspaperman, and was about to hand it in',
      finder: 'crowninshield',
    },
    means: {
      kind: 'chloral',
      name: 'chloral',
      origin: 'rafferty',
      available: [7, 8],
      delay: [20, 60],
      originText: 'the chloral bottle off Mrs. Rafferty’s hall shelf: there at supper, gone by bed',
    },
    accounts: [
      account('marchetti', {
        7: ['rafferty', ['steinbach', 'vitale']],
        8: ['rafferty', []],
        9: ['rafferty', [], 'in my room, with a book'],
        10: ['velvet', ['steinbach', 'crowninshield', 'vitale'], 'about ten I went over for a nightcap'],
      }),
      account('steinbach', {
        7: ['rafferty', ['marchetti', 'vitale'], 'a lesson in my room'],
        8: ['velvet', ['vitale', 'sirkin']],
        // The golden gives him no company after eight; a whole account would. Vitale was in the
        // back room at nine, which Steinbach knew.
        9: ['velvet', ['crowninshield', 'vitale']],
        10: ['velvet', ['crowninshield', 'vitale', 'marchetti'], 'stayed till closing'],
      }),
      account('vitale', {
        7: ['rafferty', ['steinbach', 'marchetti'], 'went up to see Steinbach about what he owes'],
        8: ['velvet', ['steinbach', 'sirkin'], 'one drink'],
        9: ['vitale-home', [], 'I went home; I keep hours'],
        10: ['velvet', ['steinbach', 'crowninshield', 'marchetti'], 'came back, because home was dull'],
      }),
      account(
        'crowninshield',
        {
          7: ['surgery', []],
          8: ['surgery', [], 'till half past eight'],
          9: ['velvet', ['steinbach', 'vitale']],
          10: ['velvet', ['steinbach', 'vitale', 'marchetti']],
        },
        [{ text: 'I left at eleven and stopped at Sirkin’s with the money I owed. The door was open.', facts: [], side: false }],
      ),
    ],
    lists: [
      list(
        'hargrove',
        'velvet',
        { 8: ['sirkin', 'steinbach', 'vitale'], 9: ['steinbach', 'crowninshield', 'vitale'], 10: ['steinbach', 'crowninshield', 'vitale', 'marchetti'] },
        [{ text: 'Sirkin left before nine, said he had company coming.', facts: [], side: false }],
      ),
      list(
        'rafferty',
        'rafferty',
        { 7: ['marchetti', 'steinbach', 'vitale'], 8: ['marchetti'], 9: [], 10: [] },
        [
          {
            text: 'Miss Marchetti went out herself, a quarter to nine, in her good coat. She came back after eleven.',
            facts: [
              { k: 'notAt', p: 'marchetti', h: 9, place: 'rafferty' },
              { k: 'notAt', p: 'marchetti', h: 10, place: 'rafferty' },
            ],
            side: true,
          },
          { text: 'The chloral on the hall shelf was there at supper and gone when I went up to bed.', facts: [], side: false },
        ],
      ),
    ],
    finds: [
      {
        id: 'table',
        place: 'walkup',
        what: 'the table',
        text: 'Two glasses; one smells of chloral. Under the table, an empty bottle: “Chloral. Mrs. R. Rafferty, 14 Mott St.”',
        gives: { means: true },
        facts: [],
      },
      {
        id: 'filebox',
        place: 'walkup',
        what: 'the file box',
        text: 'The top page is a typed account of Marchetti selling subscribers’ calls to a newspaperman.',
        gives: { why: true },
        facts: [],
      },
    ],
    confrontations: [
      {
        person: 'vitale',
        hour: 9,
        response: 'admit',
        text: 'All right. There’s a game back there on Fridays. I was at that table from nine until ten, losing to a man called Shoes.',
        facts: [{ k: 'at', p: 'vitale', h: 9, place: 'velvet' }],
      },
      {
        person: 'marchetti',
        hour: 9,
        response: 'second-lie',
        text: '“I went for a walk. I walk when I can’t sleep.” “Where?” “Around.”',
        facts: [],
        secondLie: { text: 'a walk, around', collidesWith: 'nobody saw her walking; every list at nine lacks her' },
      },
    ],
    givens: {
      text: [
        'Hauck, the client, is Sirkin’s sister-in-law.',
        'Sirkin, a buildings inspector, was found dead in his walk-up over the drugstore on Grand Street at half past eleven, by Crowninshield.',
        'The police called it a fall. The coroner says chloral in a drink, drunk between nine and ten.',
        'Hauck points at Steinbach, who blamed Sirkin for his ruin.',
      ],
      facts: [],
      access: [],
      pointer: 'steinbach',
      // "Between nine and ten": the nine o'clock hour, on the board.
      window: [9],
    },
    lies: [
      { person: 'marchetti', hour: 9, kind: 'culprit', truth: 'walkup', claim: 'rafferty' },
      { person: 'vitale', hour: 9, kind: 'secret', truth: 'velvet', claim: 'vitale-home' },
    ],
  };
}

/** The golden's designed path, as its table orders it. */
export const SEED3_GOLDEN_PATH = [
  'search:table',
  'list:rafferty',
  'list:hargrove',
  'account:vitale',
  'confront:vitale@9',
  'account:marchetti',
  'confront:marchetti@9',
];

/**
 * Seed 3 repaired to the rules as they stand (docs/41, with the decisions of 2026-09-28):
 * - Mrs. Rafferty went up to bed at half past eight, so her list stops at eight and only her side
 *   remark ("she went out at a quarter to nine") breaks Marchetti's "home all evening". It rates
 *   Medium.
 * - An innocent lie only when it matters: Hargrove can't see into the back room, which is its own
 *   place, so nothing but Vitale's admission and its check places him at nine. He says he was out
 *   front, which Hargrove's list breaks.
 * - An admission is checked, not believed: Vitale names Shoes, who deals the game, and Shoes'
 *   account places him.
 * - The culprit and the innocent liar never claim one place at one hour: Marchetti is on the
 *   switchboard at the exchange until eight (a workplace in working hours), and Vitale goes home at
 *   ten instead of back to the bar.
 * The golden path's seven questions, with Shoes for the golden's "put it to Vitale", is par again.
 */
export function seed3Repaired(): BoardCase {
  const c = seed3();
  c.id = 'golden-seed3-repaired';
  c.places.push(
    { id: 'exchange', name: 'the telephone exchange on Spring Street', short: 'the exchange', kind: 'work', open: [7, 7], street: 'Spring Street' },
    { id: 'backroom', name: 'the back room at the Velvet Room, through a door behind the bar', short: 'the back room', kind: 'club', open: [7, 10], street: 'Elizabeth Street' },
  );
  c.people.push({ id: 'shoes', name: 'a man called Shoes', short: 'Shoes', role: 'company', description: 'deals the Friday game in the back room', foundAt: 'backroom' });
  c.board.rows = rows(HOURS, {
    marchetti: ['exchange', 'rafferty', 'walkup', 'velvet'],
    steinbach: ['rafferty', 'velvet', 'velvet', 'velvet'],
    vitale: ['rafferty', 'velvet', 'backroom', 'vitale-home'],
    crowninshield: ['surgery', 'surgery', 'velvet', 'velvet'],
    sirkin: ['walkup', 'velvet', 'walkup', 'walkup'],
    shoes: ['backroom', 'backroom', 'backroom', 'backroom'],
  });
  // 4a.2 (`reasonsMatch`): an account's reasons are the truth's. The golden paraphrased them
  // between the truth table and the accounts ("one drink" against "a drink"); they now say the
  // same words. Vitale's truth no longer says "cleaned out", which was his secret talking.
  c.board.reasons = {
    marchetti: { 8: 'came off the switchboard at eight and went home', 9: 'went out at a quarter to nine, in her good coat, with the chloral in her bag', 10: 'about ten I went over for a nightcap' },
    steinbach: { 8: 'went out for a drink after his lesson' },
    vitale: { 8: 'a drink', 9: 'through to the back room for the Friday game', 10: 'went home; I keep hours' },
    crowninshield: { 9: 'closed the surgery at half past eight and went for a drink' },
    sirkin: { 8: 'his rye at the Velvet Room', 9: 'left before nine: he had company coming' },
  };
  c.accounts = [
    account('marchetti', {
      7: ['exchange', [], 'on the switchboard till eight'],
      8: ['rafferty', [], 'came off the switchboard at eight and went home'],
      9: ['rafferty', [], 'in my room, with a book'],
      10: ['velvet', ['steinbach', 'crowninshield'], 'about ten I went over for a nightcap'],
    }),
    account('steinbach', {
      7: ['rafferty', ['vitale'], 'a lesson in my room'],
      8: ['velvet', ['vitale', 'sirkin'], 'went out for a drink after his lesson'],
      9: ['velvet', ['crowninshield']],
      10: ['velvet', ['crowninshield', 'marchetti'], 'stayed till closing'],
    }),
    account('vitale', {
      7: ['rafferty', ['steinbach'], 'went up to see Steinbach about what he owes'],
      8: ['velvet', ['steinbach', 'sirkin'], 'a drink'],
      9: ['velvet', [], 'out front, nursing a beer'],
      10: ['vitale-home', [], 'went home; I keep hours'],
    }),
    account(
      'crowninshield',
      {
        7: ['surgery', []],
        8: ['surgery', [], 'till half past eight'],
        9: ['velvet', ['steinbach'], 'closed the surgery at half past eight and went for a drink'],
        10: ['velvet', ['steinbach', 'marchetti']],
      },
      [{ text: 'I left at eleven and stopped at Sirkin’s with the money I owed. The door was open.', facts: [], side: false }],
    ),
    account('shoes', {
      7: ['backroom', []],
      8: ['backroom', []],
      9: ['backroom', ['vitale'], 'the Friday game'],
      10: ['backroom', []],
    }),
  ];
  c.lists = [
    list(
      'hargrove',
      'velvet',
      { 8: ['sirkin', 'steinbach', 'vitale'], 9: ['steinbach', 'crowninshield'], 10: ['steinbach', 'crowninshield', 'marchetti'] },
      [{ text: 'Sirkin left before nine, said he had company coming. What goes on behind the back-room door is Shoes’ business, not mine.', facts: [], side: false }],
    ),
    list(
      'rafferty',
      'rafferty',
      { 7: ['steinbach', 'vitale'], 8: ['marchetti'] },
      [
        {
          text: 'Miss Marchetti came in from the exchange at eight, and went out again at a quarter to nine, in her good coat, just as I went up to bed. I heard her come in after eleven.',
          facts: [
            { k: 'notAt', p: 'marchetti', h: 9, place: 'rafferty' },
            { k: 'notAt', p: 'marchetti', h: 10, place: 'rafferty' },
          ],
          side: true,
        },
        { text: 'The chloral on the hall shelf was there at supper and gone when I went up to bed.', facts: [], side: false },
      ],
    ),
  ];
  c.confrontations = [
    {
      person: 'vitale',
      hour: 9,
      response: 'admit',
      text: 'All right. There’s a game in the back room on Fridays. I was at that table from nine until ten, losing to a man called Shoes. Ask him.',
      facts: [],
      names: ['shoes'],
    },
    ...c.confrontations.filter((k) => k.person === 'marchetti'),
  ];
  c.lies = [
    { person: 'marchetti', hour: 9, kind: 'culprit', truth: 'walkup', claim: 'rafferty' },
    { person: 'vitale', hour: 9, kind: 'secret', truth: 'backroom', claim: 'velvet' },
  ];
  return c;
}

/** The golden path on the repaired case: the golden's seven, with Shoes for the check. */
export const SEED3_REPAIRED_PATH = [
  'search:table',
  'list:rafferty',
  'list:hargrove',
  'account:vitale',
  'confront:vitale@9',
  'account:shoes',
  'account:marchetti',
];
