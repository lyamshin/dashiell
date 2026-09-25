/**
 * M12 — conversation: the ask and the recap (docs/29-m12-conversation.md,
 * golden docs/golden/seed3-camp.md §3 and §4).
 *
 * Part 1, the ask: every question page and every confrontation is staged —
 * the approach, a look at the person, the ask (often reported), a try when
 * the temper or a second ask calls for it, the outcome, and one dry last
 * word that is never a verdict. A silence is said to be worth something.
 *
 * Part 2, the recap: after something shifts (a story comes apart, a
 * confrontation lands, the hour narrows, a name is pencilled to a face, two
 * hours and two facts go by) and on demand ("Go over what I have", free, not
 * in the office). 80 to 180 words, only what the notebook holds and the
 * absences of it, never a verdict, never an earlier recap again, ending on
 * what he means to do next. Traced clause by clause; the design test does
 * not move.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';

type Tier = 0 | 1 | 2 | 3 | 4 | 5;
import { buildView, type CaseView } from '../src/game/derive.js';
import { gridFrom } from '../src/game/grid.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, priceOf, recapOpen, setRecaps, stepInput } from '../src/game/reducer.js';
import { choicesFor } from '../src/game/choices.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { lintRun, recapVerdicts } from '../src/game/reader-lint.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { plainAction } from '../src/game/scene/people.js';
import { stoppedDoing } from '../src/game/scene/realize.js';
import { DECKS } from '../src/game/voice/cards.js';
import { parse } from '../src/game/parser.js';
import type { Page, RunState } from '../src/game/types.js';

const words = (t: string): number => t.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;

function play(view: CaseView, commands: readonly string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

const cases = (n: number): { label: string; view: CaseView }[] => {
  const out: { label: string; view: CaseView }[] = [];
  for (let seed = 1; seed <= n; seed++) {
    out.push({ label: `d2 s${seed}`, view: buildView(generateCase(seed, { difficulty: 2 })) });
    for (const tier of [3, 4, 5] as Tier[]) out.push({ label: `T${tier} s${seed}`, view: buildView(generateCase(seed, { tier, level: 2 })) });
  }
  return out;
};

/** The oracle's route, then every lie put to the one who told it, twice. */
function confrontRun(view: CaseView): RunState {
  let state = play(view, playOracle(view).steps.map((s) => s.command));
  for (const c of view.kase.logic?.confrontations ?? []) {
    const person = view.personById.get(c.personId);
    const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
    if (!person || !at || state.reportOpen) continue;
    if (state.at !== person.foundAt) state = stepInput(state, `go ${at}`, view).state;
    state = stepInput(state, `ask ${person.surname} about that evening`, view).state;
    const held = new Set(state.found);
    const right = c.contradictions.flat().filter((id) => held.has(id));
    for (const id of right.slice(0, 2)) state = stepInput(state, `put ${id} to ${person.surname}`, view).state;
  }
  return state;
}

const runs = (() => {
  const out: { label: string; view: CaseView; state: RunState }[] = [];
  for (const { label, view } of cases(8)) {
    out.push({ label: `${label} oracle`, view, state: play(view, playOracle(view).steps.map((s) => s.command)) });
    out.push({ label: `${label} wander`, view, state: play(view, playWandering(view, 7, 'Dashiell').steps.map((s) => s.command)) });
    // The oracle's route with a recap asked for after every step.
    out.push({ label: `${label} recaps`, view, state: play(view, playOracle(view).steps.flatMap((s) => [s.command, 'go over what I have'])) });
    if (view.kase.logic) out.push({ label: `${label} confront`, view, state: confrontRun(view) });
  }
  return out;
})();

const staged = (page: Page): boolean => page.shape === 'ask' || page.shape === 'confront';

describe('M12 Part 1: the ask, staged', () => {
  it('approaches and looks before every question and every first fact put', () => {
    let pages = 0;
    for (const r of runs) {
      for (const page of r.state.log) {
        if (!staged(page)) continue;
        const exchange = (page.beats ?? []).find((b) => b.kind === 'exchange' || b.kind === 'confront');
        const continued = exchange?.tag === 'continued';
        const follow = page.blocks.some((b) => b.kind === 'prose' && /“There’s something else,” I said|“And there’s this,” I said|“I’m not done,” I said|“That’s one thing,” I said/.test(b.text));
        if (continued || follow) continue;
        pages++;
        const approach = page.blocks.find((b) => b.kind === 'prose' && b.voice === 'approach');
        expect(approach, `${r.label} p${page.n}: no approach`).toBeDefined();
        // The approach and the look: two sentences at least, before anything is asked.
        const first = page.blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'approach');
        const asked = page.blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'exchange');
        expect(first, `${r.label} p${page.n}`).toBeLessThan(asked);
      }
    }
    expect(pages).toBeGreaterThan(200);
  });

  it('asks in his narration more often than not, and aloud too', () => {
    let reported = 0;
    let aloud = 0;
    for (const r of runs) {
      for (const page of r.state.log) {
        if (page.shape !== 'ask') continue;
        const q = page.blocks.find((b) => b.kind === 'prose' && b.voice === 'exchange');
        if (!q || q.kind !== 'prose') continue;
        // A carried question is reported with its reason first ("Quill did
        // business with Colquitt. I asked what he had seen of Quill tonight."),
        // and M14's ties beyond money carry more of them.
        if (/(?:^|[.!?]\s+)I asked (?:him|her|what|whether)\b/.test(q.text)) reported++;
        else if (/^“/.test(q.text)) aloud++;
      }
    }
    // Often reported; direct for a question with an edge, and for their life.
    expect(reported / (reported + aloud)).toBeGreaterThan(0.4);
    expect(aloud / (reported + aloud)).toBeGreaterThan(0.2);
  });

  it('tries something on somebody guarded, and after an answer that had nothing in it', () => {
    let guarded = 0;
    for (const r of runs) {
      for (const page of r.state.log) {
        if (page.shape !== 'ask') continue;
        const exchange = (page.beats ?? []).find((b) => b.kind === 'exchange');
        const id = exchange?.personIds?.[0];
        if (!id || exchange?.tag === 'continued') continue;
        const tries = page.cardsUsed.filter((c) => c.startsWith('TRY-'));
        expect(tries.length, `${r.label} p${page.n}: two tries`).toBeLessThanOrEqual(1);
        if (r.state.cast.temper[id] === 'enigma' && tries.length > 0) guarded++;
      }
    }
    expect(guarded).toBeGreaterThan(5);
  });

  it('ends a question or a confrontation on one last word, and none of them is a verdict', () => {
    let closes = 0;
    let quiet = 0;
    for (const r of runs) {
      for (const page of r.state.log) {
        const close = (page.beats ?? []).filter((b) => b.kind === 'close' && b.rendered);
        expect(close.length, `${r.label} p${page.n}`).toBeLessThanOrEqual(1);
        closes += close.length;
        if (close[0]?.tag === 'quiet') quiet++;
      }
    }
    expect(closes).toBeGreaterThan(200);
    expect(quiet).toBeGreaterThan(0);
    const names = ['Marchetti', 'Hauck', 'Vitale'];
    for (const card of DECKS.close) {
      expect(recapVerdicts(card.text.replace(/\{name\}/g, 'Hauck').replace(/\{\w+\}/g, 'her'), names), card.id).toEqual([]);
    }
  });

  it('says what a silence is worth when somebody will not say', () => {
    for (const card of DECKS.close.filter((c) => c.tags.outcome === 'quiet')) {
      expect(card.text, card.id).toMatch(/\b(?:say|saying|silence|wouldn’t|answer)\b/i);
    }
  });

  it('never tells the presence line’s joke twice: the observation and the approach keep only the plain action', () => {
    expect(plainAction('reading a folded newspaper, not turning the page')).toBe('reading a folded newspaper');
    expect(plainAction('tapping ash from a cigarette without breaking a sentence')).toBe('tapping ash from a cigarette');
    expect(plainAction('sitting in a hard chair, and the chair was winning')).toBe('sitting in a hard chair');
    expect(stoppedDoing('Fisk was working the gate open and shut.', 'Fisk')).toBe('Fisk stopped working the gate open and shut and looked up as I came over.');
    for (const r of runs.filter((x) => x.label.endsWith('oracle'))) {
      for (const page of r.state.log) {
        const presence = (page.beats ?? []).find((b) => b.kind === 'presence' && b.rendered)?.text ?? '';
        const observed = (page.beats ?? []).find((b) => b.kind === 'thought' && b.tag === 'view' && /\bwho had\b|\bhad told me to start with\b|\bwho was paying me\b/.test(b.text ?? ''));
        if (!observed?.text) continue;
        // Whatever came after the activity's first comma in the presence line is not said again.
        for (const tail of presence.match(/, [^.]{12,}\./g) ?? []) expect(observed.text, `${r.label} p${page.n}`).not.toContain(tail.slice(2, -1));
      }
    }
  });
});

describe('M12 Part 2: the recap', () => {
  it('is 80 to 180 words, never a verdict, at most one a page, and traced clause by clause', () => {
    let recaps = 0;
    const violations: string[] = [];
    for (const r of runs) {
      for (const page of r.state.log) {
        const beats = (page.beats ?? []).filter((b) => b.kind === 'recap');
        expect(beats.length, `${r.label} p${page.n}`).toBeLessThanOrEqual(1);
        const b = beats[0];
        if (!b?.text) continue;
        recaps++;
        const n = words(b.text);
        // Playtest round 2: asked for, it goes over what there is, however little.
        if (b.tag !== 'demand') expect(n, `${r.label} p${page.n}: ${b.text}`).toBeGreaterThanOrEqual(80);
        expect(n, `${r.label} p${page.n}: ${b.text}`).toBeLessThanOrEqual(180);
      }
      for (const v of checkRun(r.view, r.state)) violations.push(`${r.label} ${v.where} ${v.rule} ${v.detail}`);
      for (const i of lintRun(r.view, r.state)) violations.push(`${r.label} p${i.page} ${i.rule} ${i.detail}`);
      const cov = checkRunCoverage(r.view, r.state);
      for (const i of cov.issues) violations.push(`${r.label} p${i.page} ${i.rule} ${i.detail}`);
    }
    expect(violations.slice(0, 10)).toEqual([]);
    expect(recaps).toBeGreaterThan(100);
  }, 300_000);

  it('never says a clause an earlier recap tonight said, but the frame of when and where', () => {
    for (const r of runs) {
      const said = new Set<string>();
      for (const page of r.state.log) {
        const b = (page.beats ?? []).find((x) => x.kind === 'recap');
        for (const c of b?.clauses ?? []) {
          if (/^(?:frame|when|anchor|method|next)\|/.test(c.key)) continue;
          // Playtest round 2: "Go over what I have" goes over all of it, said before or not.
          if (b?.tag !== 'demand') expect(said.has(c.key), `${r.label} p${page.n}: ${c.key} again`).toBe(false);
          said.add(c.key);
        }
      }
    }
  });

  it('ends on what he means to do next', () => {
    for (const r of runs) {
      for (const page of r.state.log) {
        const b = (page.beats ?? []).find((x) => x.kind === 'recap');
        if (!b?.clauses) continue;
        expect(b.clauses[b.clauses.length - 1]?.key, `${r.label} p${page.n}`).toMatch(/^next\|/);
        const last = page.blocks[page.blocks.length - 1];
        expect(last?.kind === 'prose' && /\b(?:next|I wanted|It was time)\b/.test(last.text), `${r.label} p${page.n}`).toBe(true);
      }
    }
  });

  it('names nobody as unplaced whom the grid has somewhere at that half hour', () => {
    for (const r of runs.filter((x) => x.label.endsWith('oracle'))) {
      let state = newRun(r.view, { detectiveName: 'Dashiell' });
      for (const c of playOracle(r.view).steps.map((s) => s.command)) {
        state = stepInput(state, c, r.view).state;
        const page = state.log[state.log.length - 1] as Page;
        const b = (page.beats ?? []).find((x) => x.kind === 'recap');
        if (!b) continue;
        const grid = gridFrom(r.view, { ...state, links: {}, marks: {} });
        for (const c2 of b.clauses ?? []) {
          for (const part of c2.key.split('+')) {
            const m = /^unplaced\|([\d,]+)\|(.+)$/.exec(part);
            if (!m) continue;
            const ticks = (m[1] as string).split(',').map(Number);
            const row = grid.rows.find((x) => x.personId === m[2]);
            for (const t of ticks) {
              expect((row?.cells[t]?.entries ?? []).filter((e) => e.present && e.source !== 'linked'), `${r.label} p${page.n} ${part}`).toEqual([]);
            }
          }
        }
      }
    }
  });

  it('“Go over what I have” is free, anywhere but the office, and changes nothing in the notebook', () => {
    const v0 = runs[0]!.view;
    expect(parse(v0, v0.startId, 'go over what I have')).toEqual({ ok: true, command: { kind: 'recap' } });
    expect(parse(v0, v0.startId, 'take stock')).toEqual({ ok: true, command: { kind: 'recap' } });
    for (const { view } of cases(4)) {
      let state = newRun(view, { detectiveName: 'Dashiell' });
      expect(recapOpen(view, state)).toBe(false);
      expect(choicesFor(view, state).some((g) => g.kind === 'recap')).toBe(false);
      const office = stepInput(state, 'go over what I have', view);
      expect(office.page.shape).toBe('repeat');
      for (const c of playOracle(view).steps.map((s) => s.command).slice(0, 8)) {
        state = stepInput(state, c, view).state;
        if (state.reportOpen) break;
        const open = recapOpen(view, state);
        expect(choicesFor(view, state).some((g) => g.kind === 'recap')).toBe(open);
        if (!open) continue;
        expect(priceOf({ kind: 'recap' }, state, view).cost).toBe(0);
        const step = stepInput(state, 'go over what I have', view);
        expect(step.state.actionsUsed).toBe(state.actionsUsed);
        expect(step.state.found).toEqual(state.found);
        expect(step.state.accounts).toEqual(state.accounts);
        expect(step.page.found).toEqual([]);
        expect(['recap', 'repeat']).toContain(step.page.shape);
      }
    }
  });

  it('gives a marks-follower nothing: the same commands make the same night with the recaps on or off', () => {
    for (const { view } of cases(6)) {
      const commands = playWandering(view, 11, 'Dashiell').steps.map((s) => s.command);
      const on = play(view, commands);
      setRecaps(false);
      let off: RunState;
      try {
        off = play(view, commands);
      } finally {
        setRecaps(true);
      }
      expect(on.found).toEqual(off.found);
      expect(on.accounts).toEqual(off.accounts);
      expect(on.actionsUsed).toBe(off.actionsUsed);
      expect(on.threads).toEqual(off.threads);
      expect(on.volunteered).toEqual(off.volunteered);
      expect(on.log.length).toBe(off.log.length);
      // And nothing the report reads: what was found, what was said when a fact was put.
      expect(on.confronts ?? []).toEqual(off.confronts ?? []);
    }
  });
});
