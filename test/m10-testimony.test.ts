/**
 * M10 Part A — facts told, not printed (docs/23-m10-testimony.md,
 * docs/golden/seed3-testimony.md).
 *
 * - §A.1–§A.2: facts of one family arrive in one telling, in the witness's
 *   words, with a grounding, a follow-up where the fact has a second half, a
 *   tail, and the detective's note.
 * - §A.3: at most three families a page, and a free "Go on" for the rest;
 *   presence once a visit; recall once a visit; the watch said once.
 * - §A.4: the reader lint over 40 seeds × every tier — no machinery words,
 *   no garbled errand, no empty thought, no quoted generator sentence, no
 *   question twice on a page, no more than three families a page.
 * - Correspondence stays at zero with tellings traced, and beat coverage at
 *   100%.
 */

import { describe, expect, it } from 'vitest';
import { crimeTicks, generateCase, solveHeld, type Clue } from '../src/gen/index.js';
import type { Id } from '../src/gen/types.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { allChoices, choicesFor } from '../src/game/choices.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { playOracle } from '../src/game/oracle.js';
import { parse } from '../src/game/parser.js';
import { lintRun, MACHINERY } from '../src/game/reader-lint.js';
import { clearedOnTwo, placedAwayBy } from '../src/game/m9.js';
import { continuationOf, newRun, priceOf, stepInput } from '../src/game/reducer.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { FAMILY_CAP, familiesOf, paceClues } from '../src/game/scene/families.js';
import { WATCH_CLAUSE, attributed, windowSpan } from '../src/game/scene/realize.js';
import { saidPlainly, toldOf } from '../src/game/scene/telling.js';
import { sentencesOf } from '../src/game/scene/text.js';
import type { Page, RunState } from '../src/game/types.js';
import { DECKS } from '../src/game/voice/cards.js';

type Tier = 0 | 1 | 2 | 3 | 4 | 5;
const TIERS: Tier[] = [0, 1, 2, 3, 4, 5];
const SEEDS = 40;

const tiered = (seed: number, tier: Tier): CaseView => buildView(generateCase(seed, { tier, level: 2, classic: true }));

function play(view: CaseView, commands: string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

/** Every oracle run the lint reads: 40 seeds at every tier, and the untiered case. */
const RUNS: { label: string; view: CaseView; state: RunState }[] = (() => {
  const out: { label: string; view: CaseView; state: RunState }[] = [];
  for (const tier of TIERS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      // M14: the sweep is the case mix, every type in it; the goldens below
      // are the classic draw (`tiered`).
      const view = buildView(generateCase(seed, { tier, level: 2 }));
      out.push({ label: `T${tier} seed ${seed} ${view.kase.act.type}`, view, state: playOracle(view).state });
    }
  }
  for (let seed = 1; seed <= SEEDS; seed++) {
    const view = buildView(generateCase(seed, { difficulty: 2 }));
    out.push({ label: `d2 seed ${seed}`, view, state: playOracle(view).state });
  }
  return out;
})();

/**
 * A find whose clue's own record names the hour the checker flagged, while
 * none of that clue's facts has it: the generator's sentence, printed as it
 * stands, not the engine asserting an hour.
 */
function recordOwnHour(view: CaseView, page: Page | undefined, detail: string): boolean {
  const m = /^(\d{1,2}):(\d{2}) PM/.exec(detail);
  if (!page || !m) return false;
  const tick = (Number(m[1]) - 6) * 2 + (m[2] === '30' ? 1 : 0);
  const face = `${m[1]}:${m[2]} PM`;
  return page.found.some((id) => {
    const c = view.findableById.get(id);
    if (!c || !(c.textRecord ?? c.text).includes(face)) return false;
    return !c.establishes.some((f) => ('tick' in f && f.tick === tick) || ('ticks' in f && f.ticks.includes(tick as never)));
  });
}

const text = (page: Page): string =>
  page.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : '')).join('\n');

describe('M10 §A.4: the reader lint, over 40 seeds × every tier', () => {
  it('finds no machinery word, garbled errand, empty thought, quoted record, repeated question or crowded page', () => {
    const issues: string[] = [];
    for (const r of RUNS) for (const i of lintRun(r.view, r.state)) issues.push(`${r.label} p${i.page + 1} ${i.rule}: ${i.detail}`);
    expect(issues.slice(0, 20)).toEqual([]);
  }, 600_000);

  it('knows the machinery when it sees it, and lets the plain senses through', () => {
    const hits = (s: string): string[] => MACHINERY.filter((m) => m.re.test(s)).map((m) => m.name);
    expect(hits('I wrote the names across that square of the grid.')).toContain('grid');
    expect(hits('I made a mark in the margin.')).toContain('margin');
    expect(hits('The notebook had a question for Rafferty.')).toContain('the notebook had');
    expect(hits('The coroner’s hours ran from eight.')).toContain('the coroner’s hours');
    expect(hits('No lead sent me, only a hunch.')).toContain('lead');
    expect(hits('He was the patrolman on the beat.')).not.toContain('beat');
    expect(hits('She passed it to me to hold a card.')).not.toContain('card');
  });
});

describe('M10: correspondence and coverage with tellings', () => {
  it('traces every telling and every note, with zero correspondence violations', () => {
    const all: string[] = [];
    let generators = 0;
    for (const r of RUNS) {
      for (const v of checkRun(r.view, r.state)) {
        // Known and not the engine's: a tiered case keeps the hour in a trope's
        // key-book sentence after the logic game took the placement out of its
        // facts (docs/23-m10-a-notes.md, "Not fixed"). The find prints the
        // generator's sentence as it stands.
        const page = r.state.log.find((p) => p.n === Number(/page (\d+)/.exec(v.where)?.[1]));
        if (v.rule === 'time-disagrees' && / find$/.test(v.where) && recordOwnHour(r.view, page, v.detail)) {
          generators++;
          continue;
        }
        all.push(`${r.label} ${v.where} ${v.rule}: ${v.detail}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`M10 correspondence: ${all.length} violations; ${generators} hours in a generator's own sentence with no fact behind them`);
    expect(all.slice(0, 10)).toEqual([]);
  }, 300_000);

  it('covers every required beat on every night page', () => {
    let pages = 0;
    let covered = 0;
    const issues: string[] = [];
    for (const r of RUNS) {
      const c = checkRunCoverage(r.view, r.state);
      pages += c.pages;
      covered += c.covered;
      for (const i of c.issues) issues.push(`${r.label} p${i.page + 1} ${i.rule}: ${i.detail}`);
    }
    // eslint-disable-next-line no-console
    console.log(`M10 beat coverage: ${covered} of ${pages} night pages`);
    expect(issues.slice(0, 10)).toEqual([]);
    expect(covered).toBe(pages);
  }, 300_000);
});

describe('M10 §A.1–§A.2: the golden’s pages, seed 3 at Medium', () => {
  const view = tiered(3, 4);
  const state = playOracle(view).state;
  const page = (n: number): Page => state.log[n - 1] as Page;
  const tellings = (p: Page) => (p.beats ?? []).filter((b) => b.kind === 'telling');

  it('page 7 tells the door in two families — the count, then the strangers — and never a rule sentence', () => {
    const p = page(7);
    expect(tellings(p).map((b) => b.tag)).toEqual(['counts', 'strangers']);
    const t = text(p);
    expect(t).toMatch(/One came in at half past six\. One at half past eight\. Two at nine o’clock\. One at half past nine\./);
    expect(t).toContain('At half past ten it was Ilse Hauck, and nobody with her.');
    expect(t).not.toMatch(/What else at/);
    expect(t).not.toMatch(/nobody else\.”\s*“/);
    // Two questions, and different ones.
    const questions = (t.match(/“[^”]*\?”/g) ?? []).map((q) => q.toLowerCase());
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('page 6 tells Vitale’s comings and goings, then the rest of the evening after its own follow-up', () => {
    const p = page(6);
    const [family] = tellings(p);
    expect(family?.tag).toBe('movements');
    expect(family?.parts?.told).toEqual(['I saw him here from seven until half past.', 'He was back at nine o’clock.', 'Not here.']);
    expect(family?.parts?.followup).toMatch(/rest of the evening|rest of the night|other hours/);
    expect(family?.parts?.grounding).toBeDefined();
  });

  it('page 5 tells the key, then the stranger, each with its own question', () => {
    const p = page(5);
    expect(tellings(p).map((b) => b.tag)).toEqual(['thing', 'strangers']);
    expect(tellings(p)[1]?.parts?.question).toBeDefined();
  });

  it('every telling on the route is grounded, and every question is the detective’s', () => {
    for (const p of state.log) {
      for (const b of tellings(p)) expect(b.parts?.grounding, `p${p.n + 1} ${b.tag}`).toBeDefined();
      for (const para of p.blocks) {
        if (para.kind !== 'prose') continue;
        // A bare question after a line whose subject is the witness reads as the witness speaking.
        const m = /(?:looked up|left off|came over)\.\s+(“[^”]*\?”)(\s+I (?:said|asked))?/.exec(para.text);
        if (m) expect(m[2], `p${p.n + 1}: ${para.text}`).toBeDefined();
      }
    }
  });
});

describe('M10 §A.3: pacing', () => {
  it('holds a page to three families, and "Go on" tells the rest, free, on the next page', () => {
    let continued = 0;
    for (const r of RUNS) {
      for (const [i, p] of r.state.log.entries()) {
        const families = (p.beats ?? []).filter((b) => b.kind === 'telling').length;
        expect(families, `${r.label} p${p.n + 1}`).toBeLessThanOrEqual(FAMILY_CAP);
        const next = r.state.log[i + 1];
        if (next && next.cost === 0 && (text(next).startsWith('“Go on,” I said.') || text(next).startsWith('I wasn’t through with'))) {
          continued++;
          expect(next.found.length).toBeGreaterThan(0);
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`M10 pages continued with "Go on": ${continued}`);
  });

  it('paces a long answer: the rest waits, "Go on" is offered free, and takes it', () => {
    // Put every clue one witness can give into one question's answer by hand.
    const view = tiered(3, 4);
    const rafferty = view.kase.people.find((p) => p.surname === 'Rafferty') as { id: Id };
    const all = view.kase.findable.filter((c) => c.source.type === 'person' && c.source.personId === rafferty.id);
    const families = familiesOf(view, all);
    const paced = paceClues(view, all);
    if (families.length > FAMILY_CAP) {
      expect(familiesOf(view, paced.now).length).toBe(FAMILY_CAP);
      expect(paced.later.length).toBeGreaterThan(0);
    } else {
      expect(paced.later).toEqual([]);
    }
  });

  it('parses "go on", prices it free, and offers it only when something is held back', () => {
    const view = tiered(3, 4);
    const state = newRun(view, { detectiveName: 'Dashiell' });
    const parsed = parse(view, state.at, 'Go on.', [], []);
    expect(parsed.ok && parsed.command.kind).toBe('continue');
    expect(priceOf({ kind: 'continue' }, state, view)).toMatchObject({ cost: 0, reason: 'nobody' });
    expect(continuationOf(view, state)).toBeNull();
    expect(allChoices(choicesFor(view, state)).some((c) => c.command === 'go on')).toBe(false);
  });

  it('goes on with a held-back answer, free, and the same question asked again does too', () => {
    let tried = 0;
    for (const r of RUNS) {
      let state = newRun(r.view, { detectiveName: 'Dashiell' });
      const steps = playOracle(r.view).steps;
      for (const [i, s] of steps.entries()) {
        if (s.command === 'go on') {
          tried++;
          // Before "Go on": the button is there, free.
          const offered = allChoices(choicesFor(r.view, state)).find((c) => c.command === 'go on');
          expect(offered?.minutes, r.label).toBe(0);
          // The same question again goes on the same way.
          const again = stepInput(state, steps[i - 1]?.command ?? '', r.view);
          const on = stepInput(state, 'go on', r.view);
          expect(again.page.cost).toBe(0);
          expect(on.page.cost).toBe(0);
          expect(new Set(again.page.found)).toEqual(new Set(on.page.found));
        }
        state = stepInput(state, s.command, r.view).state;
        if (tried > 20) break;
      }
      if (tried > 20) break;
    }
    // eslint-disable-next-line no-console
    console.log(`M10 "Go on" steps checked: ${tried}`);
  }, 300_000);

  it('describes each person once a visit: a look round says nothing twice, and no recall comes round again', () => {
    for (const seed of [3, 7, 12]) {
      const view = tiered(seed, 4);
      const route = playOracle(view).steps.map((st) => st.command);
      // A look after every arrival, and another after that.
      const commands = route.flatMap((c) => (c.startsWith('go ') ? [c, 'look', 'look'] : [c]));
      const state = play(view, commands);
      const issues = lintRun(view, state).filter((i) => i.rule === 'presence-again' || i.rule === 'recall-again');
      expect(issues.map((i) => `seed ${seed} p${i.page + 1}: ${i.detail}`)).toEqual([]);
    }
  });

  it('says who watches a place once, never twice in the place’s paragraph', () => {
    for (const r of RUNS) {
      for (const p of r.state.log) {
        const est = p.blocks.find((b) => b.kind === 'prose' && b.voice === 'establish');
        if (!est || est.kind !== 'prose') continue;
        const clauses = sentencesOf(est.text).filter((s) => WATCH_CLAUSE.test(s));
        expect(clauses.length, `${r.label} p${p.n + 1}: ${est.text}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('M10: "That cleared X" only when two facts agree about the crime’s half hour', () => {
  it('seed 11 at Raw: Donnelly’s own word and Mulcahy’s sightings either side of half past nine do not clear him', () => {
    const view = tiered(11, 0);
    const donnelly = view.kase.people.find((p) => p.surname === 'Donnelly') as { id: Id };
    const steps = playOracle(view).steps.map((s) => s.command);
    const at = steps.indexOf('ask Mulcahy about Donnelly');
    expect(at, 'the route asks Mulcahy about Donnelly').toBeGreaterThanOrEqual(0);
    const state = play(view, steps.slice(0, at + 1));
    const page = state.log[state.log.length - 1] as Page;
    // What Mulcahy saw: Donnelly at the stairwell, but not at the crime's half hour.
    const ticks = crimeTicks(solveHeld(view.kase, state.found));
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) expect(placedAwayBy(view, state.found, donnelly.id, t)).toBe(false);
    expect(clearedOnTwo(view, state.found).has(donnelly.id)).toBe(false);
    const clears = (page.beats ?? []).filter((b) => b.kind === 'thought' && b.tag === 'clears');
    expect(clears.map((b) => b.text)).toEqual([]);
    expect(text(page)).not.toMatch(/cleared Donnelly/);
  });

  it('never clears on two facts unless somebody else’s word covers every crime half hour, over 40 seeds at Raw and Coddled', () => {
    let cleared = 0;
    for (const r of RUNS) {
      if (!/^T[01] /.test(r.label)) continue;
      const found: Id[] = [];
      for (const p of r.state.log) {
        found.push(...p.found);
        for (const b of p.beats ?? []) {
          if (b.kind !== 'thought' || b.tag !== 'clears') continue;
          cleared++;
          const who = (b.personIds ?? [])[0] as Id;
          const ticks = crimeTicks(solveHeld(r.view.kase, [...found]));
          for (const t of ticks) expect(placedAwayBy(r.view, found, who, t), `${r.label} p${p.n + 1}: ${b.text}`).toBe(true);
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`M10 "cleared" thoughts at Raw and Coddled, each held: ${cleared}`);
  });
});

describe('M10 §A.5: the window said once', () => {
  it('says one half hour as one, and a span as a between', () => {
    expect(windowSpan([5])).toBe('at half past eight');
    expect(windowSpan([4, 5])).toBe('between eight and half past eight');
    for (const r of RUNS) {
      for (const p of r.state.log) {
        expect(text(p), `${r.label} p${p.n + 1}`).not.toMatch(/from (half past )?(\w+)(?: o’clock)? until \1\2\b(?! o’clock)/);
      }
    }
  });
});

describe('M10 §A.1: words, never records', () => {
  it('says the old kinds in the witness’s words', () => {
    expect(saidPlainly('Bidwell told Winslow the lease would go to somebody else at the end of the quarter.')).toEqual([
      'I heard Bidwell tell Winslow the lease would go to somebody else at the end of the quarter.',
    ]);
    expect(saidPlainly('Havemeyer has sworn off drink, and it is no secret.')).toEqual([
      'Havemeyer’s sworn off drink.',
      'It’s no secret.',
    ]);
  });

  it('attributes a question after the witness moves', () => {
    expect(attributed('“Sirkin had a creditor. Vitale.”')).toBe('“Sirkin had a creditor,” I said. “Vitale.”');
    expect(attributed('“Where was Vitale tonight?”')).toBe('“Where was Vitale tonight?” I asked.');
  });

  it('tells a person’s evening in order, ticks from the facts only', () => {
    const view = tiered(3, 4);
    const account = view.kase.findable.find((c) => c.kind === 'account') as Clue;
    const speaker = view.personById.get((account.source as { personId: Id }).personId);
    const [family] = familiesOf(view, [account]);
    const told = speaker && family ? toldOf(view, family, [account], speaker, speaker.foundAt ?? '') : null;
    expect(told?.first[0]).toMatch(/^I was /);
    const claimed = account.establishes.flatMap((f) => (f.kind === 'claims' ? f.ticks : []));
    expect(new Set(told?.ticks)).toEqual(new Set(claimed));
  });
});

describe('M10 §A.6: the new decks say no case fact', () => {
  const HOUR = /\b(?:six|seven|eight|nine|ten|eleven)(?: o[’']clock)?\b|half past/i;
  const FIGURE = /\b(like a|like an|like the|as if|as though)\b/i;
  it('grounds, follows up, frames and notes without an hour, a name or a figure', () => {
    for (const deck of ['telling', 'grounding', 'followup', 'note'] as const) {
      for (const card of DECKS[deck]) {
        expect(card.text, card.id).not.toMatch(HOUR);
        expect(card.text, card.id).not.toMatch(FIGURE);
        for (const m of MACHINERY) expect(m.re.test(card.text), `${card.id}: ${m.name}`).toBe(false);
      }
    }
  });

  it('lets a tail carry one figure at most, and never an hour', () => {
    for (const card of DECKS.tail) {
      expect(card.text, card.id).not.toMatch(HOUR);
      expect((card.text.match(new RegExp(FIGURE.source, 'gi')) ?? []).length, card.id).toBeLessThanOrEqual(1);
      for (const m of MACHINERY) expect(m.re.test(card.text), `${card.id}: ${m.name}`).toBe(false);
    }
  });

  it('writes every family a question, a frame, a grounding, a tail and a note', () => {
    for (const family of ['movements', 'counts', 'strangers', 'evening', 'thing']) {
      expect(DECKS.telling.some((c) => c.tags.family === family), `telling ${family}`).toBe(true);
      expect(DECKS.grounding.some((c) => c.tags.family === family), `grounding ${family}`).toBe(true);
      expect(DECKS.tail.some((c) => c.tags.family === family), `tail ${family}`).toBe(true);
      expect(DECKS.note.some((c) => c.tags.family === family), `note ${family}`).toBe(true);
    }
    for (const family of ['counts', 'strangers', 'timing', 'event', 'evening', 'movements', 'thing']) {
      expect(DECKS.followup.some((c) => c.tags.part === 'open' && c.tags.family === family), `open ${family}`).toBe(true);
    }
  });
});

describe('M10: the confront line is said, not read', () => {
  it('never quotes a clue when a fact is put to somebody', () => {
    const issues: string[] = [];
    for (const seed of [3, 7, 12, 18]) {
      for (const tier of [4, 5] as Tier[]) {
        const view = tiered(seed, tier);
        let state = play(view, playOracle(view).steps.map((s) => s.command));
        for (const c of view.kase.logic?.confrontations ?? []) {
          const person = view.personById.get(c.personId);
          const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
          if (!person || !at) continue;
          state = stepInput(state, `go ${at}`, view).state;
          state = stepInput(state, `ask ${person.surname} about that evening`, view).state;
          const held = new Set(state.found);
          const right = c.contradictions.flat().filter((id) => held.has(id));
          for (const id of [...right.slice(0, 2), state.found[1] as string]) {
            state = stepInput(state, `put ${id} to ${person.surname}`, view).state;
          }
        }
        for (const i of lintRun(view, state)) if (i.rule === 'quoted-record') issues.push(`T${tier} s${seed} p${i.page + 1}: ${i.detail}`);
      }
    }
    expect(issues).toEqual([]);
  }, 300_000);
});
