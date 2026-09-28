import type { BoardCase } from '../types.js';
import { account, list, rows } from './build.js';

/**
 * docs/golden/small-board-lost-watch.md: the lost watch at Poached, encoded as
 * written, with two exceptions marked FIX (the golden contradicts its own truth
 * table there) and one extension marked BLIND SPOT (docs/41 has no watcher who
 * can't see part of what he watches).
 */

const HOURS = [8, 9, 10, 11];

export function lostWatch(): BoardCase {
  return {
    id: 'golden-lost-watch',
    seed: 0,
    tier: 2,
    type: 'lost-item',
    client: 'brandauer',
    people: [
      { id: 'oskar', name: 'Oskar Brandauer', short: 'Oskar', role: 'suspect', description: 'the nephew, a clerk who plays the horses; lodges with his aunt', foundAt: 'shamrock', motive: 'owes Lou, a bookmaker' },
      { id: 'pulaski', name: 'Mrs. Pulaski', short: 'Mrs. Pulaski', role: 'suspect', description: 'across the hall; has envied the watch for years', foundAt: 'pulaskis', motive: '“wasted on a widow”' },
      { id: 'szabo', name: 'Lenny Szabo', short: 'Szabo', role: 'suspect', description: 'a card-party guest from two streets over', foundAt: 'shamrock', secret: 'he promised his wife he’d given up cards for money' },
      { id: 'gilchrist', name: 'Mrs. Gilchrist', short: 'Mrs. Gilchrist', role: 'suspect', description: 'a card-party guest', foundAt: 'lyric' },
      { id: 'watch', name: 'the gold watch', short: 'the watch', role: 'victim', description: 'her late husband’s gold watch, under a glass dome on the parlour mantel', foundAt: 'flat', object: true },
      { id: 'brandauer', name: 'Mrs. Adele Brandauer', short: 'Mrs. Brandauer', role: 'client', description: 'the widow', foundAt: 'flat' },
      { id: 'dombrowski', name: 'Dombrowski', short: 'Dombrowski', role: 'watcher', description: 'the janitor, in the lobby by the only stair', foundAt: 'flat' },
      { id: 'mulcahy', name: 'Mulcahy', short: 'Mulcahy', role: 'watcher', description: 'the Shamrock’s bartender', foundAt: 'shamrock' },
      { id: 'mrpulaski', name: 'Mr. Pulaski', short: 'Mr. Pulaski', role: 'company', description: 'Mrs. Pulaski’s husband', foundAt: 'pulaskis' },
    ],
    places: [
      { id: 'flat', name: 'the Brandauer flat', short: 'the Brandauer flat', kind: 'home', open: [8, 11], scene: true, street: 'Avenue B' },
      { id: 'pulaskis', name: 'the Pulaskis’ flat, across the hall', short: 'the Pulaskis’', kind: 'home', open: [8, 11], street: 'Avenue B' },
      { id: 'shamrock', name: 'the Shamrock, a bar on the corner', short: 'the Shamrock', kind: 'bar', open: [8, 11], street: 'Avenue B' },
      { id: 'lyric', name: 'the Lyric picture house', short: 'the Lyric', kind: 'theatre', open: [8, 11], street: 'Third Avenue' },
      { id: 'szabo-home', name: 'Szabo’s place, two streets over', short: 'home', kind: 'home', open: [8, 11], street: 'East Fifth Street' },
    ],
    board: {
      hours: HOURS,
      rows: rows(HOURS, {
        oskar: ['shamrock', 'shamrock', 'flat', 'shamrock'],
        pulaski: ['flat', 'pulaskis', 'pulaskis', 'pulaskis'],
        szabo: ['flat', 'shamrock', 'shamrock', 'shamrock'],
        gilchrist: ['flat', 'lyric', 'lyric', 'lyric'],
        mrpulaski: ['pulaskis', 'pulaskis', 'pulaskis', 'pulaskis'],
        watch: ['flat', 'flat', 'flat', 'shamrock'],
      }),
      reasons: {
        oskar: { 10: 'went up to the flat for ten minutes', 11: 'back to the Shamrock, straight to Lou’s booth' },
        pulaski: { 9: 'back across the hall after cards' },
        szabo: { 9: 'to the card table in the Shamrock’s corner' },
        gilchrist: { 9: 'to the pictures with Adele' },
      },
    },
    crime: {
      culprit: 'oskar',
      hour: 10,
      window: [9, 10],
      scene: 'flat',
      victim: 'watch',
      why: 'he owes Lou, and Lou was going to have his legs',
      whereNow: { place: 'shamrock', text: 'in Lou’s waistcoat, in the back booth at the Shamrock' },
      finder: 'brandauer',
    },
    means: {
      kind: 'item',
      name: 'the unlatched door',
      origin: 'flat',
      available: [8],
      delay: [0, 0],
      originText: 'the watch under its dome on the mantel, wound at nine; the door left on the latch',
    },
    accounts: [
      account('oskar', {
        8: ['shamrock', []],
        9: ['shamrock', ['szabo']],
        10: ['shamrock', [], 'the Shamrock till gone midnight; ask Mulcahy'],
        11: ['shamrock', ['szabo']],
      }),
      account('pulaski', {
        8: ['flat', ['szabo', 'gilchrist'], 'cards'],
        9: ['pulaskis', ['mrpulaski'], 'home across the hall, with Mr. Pulaski and the radio'],
        10: ['pulaskis', ['mrpulaski']],
        11: ['pulaskis', ['mrpulaski']],
      }, [{ text: 'We heard the Brandauer door go, once, about ten.', facts: [], side: false }]),
      // The golden: "Cards at eight, then home to bed at nine." That lies about three hours, not one (rule 9).
      account('szabo', {
        8: ['flat', ['pulaski', 'gilchrist'], 'cards'],
        9: ['szabo-home', [], 'home to bed'],
        10: ['szabo-home', []],
        11: ['szabo-home', []],
      }),
      account('gilchrist', {
        8: ['flat', ['pulaski', 'szabo'], 'cards'],
        9: ['lyric', [], 'the pictures with Adele'],
        10: ['lyric', []],
        11: ['lyric', [], 'out at eleven'],
      }),
      account('mrpulaski', {
        8: ['pulaskis', []],
        9: ['pulaskis', ['pulaski']],
        10: ['pulaskis', ['pulaski']],
        11: ['pulaskis', ['pulaski']],
      }),
    ],
    lists: [
      // BLIND SPOT: Dombrowski sees who comes up his stair, not who crosses the hall.
      list(
        'dombrowski',
        'flat',
        { 8: ['szabo', 'gilchrist'], 9: [], 10: ['oskar'], 11: [] },
        [{ text: 'Ten, the nephew. In, up, down again in ten minutes, hands in his pockets, whistling. He doesn’t whistle.', facts: [], side: false }],
        ['pulaski', 'mrpulaski'],
      ),
      list(
        'mulcahy',
        'shamrock',
        // FIX: the golden's eleven o'clock reads "Oskar back … Nobody else I know", but its own truth
        // table has Szabo at the Shamrock at eleven. Szabo is added here.
        { 8: ['oskar'], 9: ['oskar', 'szabo'], 10: ['szabo'], 11: ['oskar', 'szabo'] },
        [
          {
            text: 'Eleven: Oskar back, straight to Lou’s booth, and something went across the table. Lou put it in his waistcoat.',
            facts: [],
            side: false,
            gives: { whereNow: true, why: true },
          },
        ],
      ),
    ],
    finds: [
      {
        id: 'mantel',
        place: 'flat',
        what: 'the mantel',
        text: 'The empty dome. The door on the latch. She wound it at nine.',
        gives: { means: true },
        facts: [],
      },
    ],
    confrontations: [
      {
        person: 'oskar',
        hour: 10,
        response: 'crack',
        text: '“I went up for my key. I’d left it on the hook.” — “Your aunt left the door on the latch because you’d lost your key.” — “Lou was going to have my legs. It’s only in hock. I’ll get it back Saturday.”',
        facts: [],
        gives: { whereNow: true, why: true },
        secondLie: { text: 'I went up for my key', collidesWith: 'the client: the door was on the latch because he’d lost his key' },
      },
      {
        person: 'szabo',
        hour: 9,
        response: 'admit',
        text: 'All right, the card table at the Shamrock. Don’t tell my wife.',
        facts: [{ k: 'at', p: 'szabo', h: 9, place: 'shamrock' }],
      },
    ],
    givens: {
      text: [
        'Mrs. Brandauer’s late husband’s gold watch, under a glass dome on her parlour mantel, is gone.',
        'Her Thursday card party ran from eight until nine: Mrs. Pulaski, Szabo and Mrs. Gilchrist.',
        'At nine she wound the watch, then went to the pictures at the Lyric with Mrs. Gilchrist, and left the flat on the latch because her nephew Oskar, who lodges with her, had lost his key again.',
        'She came home at eleven and the dome was empty.',
        'She points at Mrs. Pulaski, across the hall: “She always said it was wasted on a widow.”',
      ],
      facts: [
        { k: 'at', p: 'pulaski', h: 8, place: 'flat' },
        { k: 'at', p: 'szabo', h: 8, place: 'flat' },
        { k: 'at', p: 'gilchrist', h: 8, place: 'flat' },
        { k: 'at', p: 'gilchrist', h: 9, place: 'lyric' },
        { k: 'at', p: 'gilchrist', h: 10, place: 'lyric' },
        { k: 'at', p: 'gilchrist', h: 11, place: 'lyric' },
      ],
      access: ['oskar'],
      pointer: 'pulaski',
    },
    lies: [
      { person: 'oskar', hour: 10, kind: 'culprit', truth: 'flat', claim: 'shamrock' },
      { person: 'szabo', hour: 9, kind: 'secret', truth: 'shamrock', claim: 'szabo-home' },
      { person: 'szabo', hour: 10, kind: 'secret', truth: 'shamrock', claim: 'szabo-home' },
      { person: 'szabo', hour: 11, kind: 'secret', truth: 'shamrock', claim: 'szabo-home' },
    ],
  };
}

export const LOST_WATCH_GOLDEN_PATH = [
  'search:mantel',
  'list:dombrowski',
  'account:pulaski',
  'account:oskar',
  'list:mulcahy',
  'confront:oskar@10',
];
