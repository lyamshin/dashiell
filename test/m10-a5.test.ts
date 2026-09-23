/**
 * M10 §A.5 — the read-through's bugs (docs/23-m10-testimony.md).
 *
 * Every check here that can be made by machine, over 40 seeds × every tier,
 * each case played by the oracle and filed with the truth:
 *
 * 1. a relation word agrees with the sex of the person it is about;
 * 2. the scene's traces never give the victim the wrong pronoun;
 * 3. the client calls him by name, or says "same as always", only when the
 *    roll says the two of them know each other;
 * 4. no portrait card is worn by somebody outside its age band;
 * 5. page one closes on the client in the chair, in the past tense, and
 *    carries none of the old filler lines;
 * 6. the closing page never says the case closed "the way it opened";
 * 7. nobody whose sex the case knows is "their own evening";
 * 8. none of the garbled errand forms seen in play.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import type { Case, Person } from '../src/gen/types.js';
import { METHOD_TEMPLATES } from '../src/gen/data/methods.js';
import { MISSING_MEANS, ROBBERY_MEANS } from '../src/gen/data/means.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { fileReport } from '../src/game/reducer.js';
import { truthReport } from '../src/game/report-form.js';
import { scoreReport } from '../src/game/scoring.js';
import { renderPageText, renderVerdictText } from '../src/game/transcript.js';
import type { Page, RunState } from '../src/game/types.js';
import { DECKS, knowsTheDetective, tagOf, type DeckName } from '../src/game/voice/cards.js';
import { ageFits } from '../src/game/voice/cast.js';
import { officeCloseLine } from '../src/game/voice/page.js';
import { knowsHim } from '../src/game/voice/roll.js';

const SEEDS = 40;
const TIERS = [0, 1, 2, 3, 4, 5] as const;

interface Played {
  where: string;
  kase: Case;
  view: CaseView;
  state: RunState;
  pages: string[];
  verdict: string;
}

/** Every page as one line of text, with the transcript's wrapping undone. */
const flat = (text: string): string => text.replace(/\s+/g, ' ');

const runs: Played[] = (() => {
  const out: Played[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const tier of TIERS) {
      const kase = generateCase(seed, { tier, level: 2 });
      const view = buildView(kase);
      const { state } = playOracle(view);
      const report = truthReport(view);
      const verdict = flat(renderVerdictText(scoreReport(view, fileReport(state, report), report)));
      const pages = state.log.map((p) => flat(renderPageText(p, view, state, { gaps: false })));
      out.push({ where: `seed ${seed} tier ${tier}`, kase, view, state, pages, verdict });
    }
  }
  return out;
})();

const sexOf = (p: Person): 'm' | 'f' | undefined => p.gender ?? p.dossier?.gender;

/** The man's form and the woman's form of every relation word the case can write. */
const RELATION_WORDS: [string, string][] = [
  ['brother-in-law', 'sister-in-law'],
  ['landlord', 'landlady'],
  ['husband', 'wife'],
  ['widower', 'widow'],
  ['nephew', 'niece'],
  ['uncle', 'aunt'],
];

/** A relation word said of `p` that belongs to the other sex, if any. */
function wrongRelation(p: Person, text: string): string | null {
  const sex = sexOf(p);
  if (sex === undefined) return null;
  for (const [his, hers] of RELATION_WORDS) {
    const wrong = sex === 'f' ? his : hers;
    if (new RegExp(`\\b${wrong}\\b`, 'i').test(text)) return wrong;
  }
  return null;
}

const blockText = (page: Page): string[] =>
  page.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''));

describe('M10 §A.5.1: relation words agree with the person', () => {
  it('every tie, backstory and role a person carries uses the form for their sex', () => {
    const bad: string[] = [];
    for (const { where, kase } of runs) {
      for (const p of kase.people) {
        const texts = [
          p.role,
          p.relationshipToVictim ?? '',
          p.dossier?.tie.text ?? '',
          p.dossier?.tie.backstory ?? '',
          p.dossier?.tie.backstoryFirst ?? '',
          p.dossier?.profession.role ?? '',
        ];
        for (const text of texts) {
          const wrong = wrongRelation(p, text);
          if (wrong) bad.push(`${where}: ${p.surname} (${sexOf(p)}) "${text}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('the client never names herself with a man’s relation word on page one', () => {
    const bad: string[] = [];
    for (const { where, view, pages } of runs) {
      for (const m of (pages[0] ?? '').matchAll(/I am (?:his|her|[A-Z]\w+’s) ([\w-]+)/g)) {
        const wrong = wrongRelation(view.client, m[1] as string);
        if (wrong) bad.push(`${where}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('M10 §A.5.2: the victim’s pronoun in the scene’s traces', () => {
  it('no method or means trace writes a pronoun for the victim', () => {
    const traces = [...METHOD_TEMPLATES, ...ROBBERY_MEANS, ...MISSING_MEANS].flatMap((m) => [
      m.sceneTrace,
      m.bodyEvidence,
      m.evidenceNote,
    ]);
    for (const t of traces) expect(t).not.toMatch(/\b(he|him|his|himself|she|her|herself)\b/i);
  });

  it('the scene report and the coroner’s note never call a woman “him” or a man “her”', () => {
    const bad: string[] = [];
    for (const { where, kase } of runs) {
      const sex = sexOf(kase.people.find((p) => p.kind === 'victim') as Person);
      const wrong = sex === 'f' ? /\b(he|him|his|himself)\b/i : /\b(she|her|herself)\b/i;
      for (const c of [...kase.candidates, ...kase.findable]) {
        if (c.kind !== 'scene' && c.kind !== 'morgue') continue;
        // The anchor's own sentence is about its own people ("the regular took
        // his stool"), so the check stops where it starts.
        const anchor = kase.anchors.find((a) => c.text.includes(a.sceneFact.split('{T}')[0] as string));
        const cut = anchor ? c.text.indexOf(anchor.sceneFact.split('{T}')[0] as string) : -1;
        const head = cut >= 0 ? c.text.slice(0, cut) : c.text;
        if (wrong.test(head)) bad.push(`${where} ${c.id}: ${head}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('M10 §A.5.3: a stranger does not call him by name', () => {
  it('every card that uses his name is one only an acquaintance is dealt', () => {
    for (const deck of ['hiring', 'entrances', 'frames'] as DeckName[]) {
      for (const card of DECKS[deck] ?? []) {
        if (card.text.includes('{detective}')) expect(knowsTheDetective(deck, card), card.id).toBe(true);
      }
    }
  });

  it('on page one the client says his name, or "same as always", only when the roll says they know each other', () => {
    const bad: string[] = [];
    let strangers = 0;
    for (const { where, view, state, pages } of runs) {
      if (knowsHim(state.cast.roll, view.client.id)) continue;
      strangers++;
      const first = state.log[0] as Page;
      const familiar = first.cardsUsed.filter((id) =>
        (['hiring', 'entrances'] as DeckName[]).some((deck) => {
          const card = (DECKS[deck] ?? []).find((c) => c.id === id);
          return card !== undefined && knowsTheDetective(deck, card);
        }),
      );
      if (familiar.length > 0) bad.push(`${where}: dealt ${familiar.join(', ')}`);
      // What is said aloud: his own narration may find the office "the same
      // as always", and that is his to say.
      for (const quote of (pages[0] ?? '').match(/[“"][^”"]*[”"]/g) ?? []) {
        if (/Dashiell|same as always/.test(quote)) bad.push(`${where}: ${quote}`);
      }
    }
    expect(strangers).toBeGreaterThan(SEEDS);
    expect(bad).toEqual([]);
  });
});

describe('M10 §A.5.4: portraits by age', () => {
  it('no portrait card is worn by a person outside its age band', () => {
    const bad: string[] = [];
    let banded = 0;
    for (const { where, kase, state } of runs) {
      for (const p of kase.people) {
        const age = p.dossier?.age;
        for (const id of state.cast.portraits[p.id]?.cardIds ?? []) {
          for (const deck of ['portraits', 'portrait-pairs'] as DeckName[]) {
            const card = (DECKS[deck] ?? []).find((c) => c.id === id);
            if (!card) continue;
            const band = tagOf(deck, card, 'ageBand');
            if (band === 'old' || band === 'young') banded++;
            if (!ageFits(band, age)) bad.push(`${where}: ${p.surname}, ${age}, wears ${id} (${band})`);
          }
        }
      }
    }
    expect(banded).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });

  it('a voice thinned with age is never on somebody under fifty', () => {
    expect(ageFits('old', 35)).toBe(false);
    expect(ageFits('old', 58)).toBe(true);
    expect(ageFits('young', 60)).toBe(false);
    expect(ageFits('any', 30)).toBe(true);
  });
});

describe('M10 §A.5.5: page one closes on the scene', () => {
  const FILLER = [
    'Down it went.',
    'It was late.',
    'I did not linger.',
    'I moved on.',
    'still in the chair. Two questions',
    'on the house',
  ];

  it('ends on the client still in the chair, in the past tense, with none of the old filler', () => {
    const bad: string[] = [];
    for (const { where, view, state, pages } of runs) {
      const first = state.log[0] as Page;
      const last = blockText(first).filter((t) => t.length > 0).at(-1) ?? '';
      if (last !== officeCloseLine(view.client)) bad.push(`${where}: ends "${last}"`);
      const text = pages[0] ?? '';
      for (const f of FILLER) if (text.includes(f)) bad.push(`${where}: "${f}"`);
      if (/\b(?:She|He) is still in the chair\b/.test(text)) bad.push(`${where}: present-tense aside`);
    }
    expect(bad).toEqual([]);
  });
});

describe('M10 §A.5.6: the closing line is true', () => {
  it('never says the case closed the way it opened', () => {
    const bad = runs.filter((r) => /the way it opened/.test(r.verdict)).map((r) => r.where);
    expect(bad).toEqual([]);
  });
});

describe('M10 §A.5.7: a person of known sex is never “their”', () => {
  it('no page asks anybody about “their own evening”, and every topic of one’s own evening agrees', () => {
    const bad: string[] = [];
    for (const { where, kase, pages } of runs) {
      pages.forEach((text, i) => {
        const m = /[^.]*\btheir own evening\b[^.]*/.exec(text);
        if (m) bad.push(`${where} p${i + 1}: ${m[0]}`);
      });
      for (const c of kase.findable) {
        if (c.source.type !== 'person' || !/own evening/.test(c.source.topic)) continue;
        const p = kase.people.find((x) => x.id === (c.source as { personId: string }).personId) as Person;
        const want = sexOf(p) === 'f' ? 'her own evening' : 'his own evening';
        if (c.source.topic !== want) bad.push(`${where} ${c.id}: ${c.source.topic}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('M10 §A.5.8: the errand says it plainly', () => {
  const GARBLED: RegExp[] = [
    // "On Crowninshield’s word, I asked Crowninshield about the speakeasy."
    /On (\w+)[’']s word, I [^.]*\b\1\b/,
    // "Kavanagh had sent me. The question was for Kavanagh."
    /(\w+) had sent me\. The question (?:was )?for \1\b/,
    /(\w+) had pointed me (?:here|to (\w+))\. I [^.]*\bask \1\b/,
    /I came on (\w+)['’]s word[^.]*\b\1\b/,
    // "I came to put Steinbach to Donnelly."
    /\bcame to put\b/,
    /\bput [A-Z]\w+ to [A-Z]\w+/,
    /\b[Tt]he notebook had\b/,
  ];

  it('none of the garbled forms seen in play', () => {
    const bad: string[] = [];
    for (const { where, pages } of runs) {
      pages.forEach((text, i) => {
        for (const re of GARBLED) {
          const m = re.exec(text);
          if (m) bad.push(`${where} p${i + 1}: ${m[0]}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it('no errand, carry or bridge card writes "put X to Y" or "the notebook had"', () => {
    for (const deck of ['errand', 'carry', 'bridge'] as DeckName[]) {
      for (const card of DECKS[deck] ?? []) {
        expect(card.text, card.id).not.toMatch(/put \{\w+\} to \{\w+\}|\b[Tt]he notebook had\b/);
      }
    }
  });
});
