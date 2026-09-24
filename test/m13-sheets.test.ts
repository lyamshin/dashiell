/**
 * M13 — sheets (docs/32-m13-sheets.md, golden docs/golden/sheets-arrival.md).
 *
 * A sheet is a hand-written skeleton for part of a page: sheet text (the
 * joins), holes a card or the realizer's own piece fills, and roles a card
 * exports and the sheet brings back later on the page (the callback). About
 * seventy pages in a hundred pay something off; the rest use the plain
 * variants. The chooser never gives a moment the same sheet twice running
 * when another fits. Every required beat still lands, and the sheets change
 * nothing but words: the design test does not move.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { Rng } from '../src/gen/rng.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { allChoices, choicesFor } from '../src/game/choices.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { setSheets } from '../src/game/scene/realize.js';
import {
  CALLBACK_SHARE,
  MOMENTS,
  SHEETS,
  callbackRoll,
  chooseSheet,
  fillSheet,
  fitsWhen,
  holds,
  newRun as newSheetRun,
  runSheet,
  type Holes,
  type Sheet,
} from '../src/game/scene/sheets.js';
import { DECKS, shortOf } from '../src/game/voice/cards.js';
import { machineryIn, recapVerdicts } from '../src/game/reader-lint.js';
import type { RunState } from '../src/game/types.js';

type Tier = 0 | 1 | 2 | 3 | 4 | 5;

function play(view: CaseView, commands: readonly string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

const runs = (() => {
  const out: { label: string; view: CaseView; state: RunState }[] = [];
  for (let seed = 1; seed <= 8; seed++) {
    for (const tier of [0, 2, 4, 5] as Tier[]) {
      const view = buildView(generateCase(seed, { tier }));
      out.push({ label: `T${tier} s${seed} oracle`, view, state: playOracle(view).state });
      out.push({ label: `T${tier} s${seed} wander`, view, state: playWandering(view, seed).state });
    }
  }
  return out;
})();

describe('M13: the format', () => {
  it('has sheets for every moment, in the numbers the spec asks for', () => {
    const n = (m: string): number => SHEETS.filter((s) => s.moment === m).length;
    expect(n('arrival') + n('company')).toBeGreaterThanOrEqual(6);
    expect(n('ask')).toBeGreaterThanOrEqual(5);
    expect(n('telling')).toBeGreaterThanOrEqual(5);
    expect(n('search')).toBeGreaterThanOrEqual(5);
    expect(n('confront')).toBeGreaterThanOrEqual(4);
    expect(n('recap')).toBeGreaterThanOrEqual(3);
    expect(n('office')).toBeGreaterThanOrEqual(3);
    for (const s of SHEETS) expect(MOMENTS as readonly string[]).toContain(s.moment);
  });

  it('gives no sheet more than one joke slot', () => {
    for (const s of SHEETS) {
      const jokes = s.parts.filter((p) => p.joke).length + (s.close?.joke ? 1 : 0);
      expect(jokes, s.id).toBeLessThanOrEqual(1);
    }
  });

  it('keeps Sheet A as the golden wrote it', () => {
    const a = SHEETS.find((s) => s.id === 'com-a') as Sheet;
    expect(a.parts.some((p) => p.text === 'Nobody looked up except the one person paid to.')).toBe(true);
    expect(a.parts.some((p) => p.text?.startsWith('The only one who didn’t look at me at all was {tell}.'))).toBe(true);
    const mirror = DECKS['place-ambient'].find((c) => c.id === 'pam-102');
    expect(mirror?.exports?.prop?.short).toBe('the mirror');
    expect(mirror?.exports?.prop?.pay?.[0]).toBe(
      'I caught myself in the mirror behind the bar. The silvering had gone in the corners, and so, I noticed, had I.',
    );
  });

  it('says no machinery and no verdict in any sheet line, any pay line, or any sheet close', () => {
    const lines: { where: string; text: string }[] = [];
    for (const s of SHEETS) {
      // A role the sheet's own text offers is said as itself, any other as a hat. (A role that is
      // "the notebook" is the engine's to keep out of "the notebook had": see the test below.)
      const own = Object.assign({}, ...s.parts.map((p) => p.exports ?? {})) as Record<string, { short: string }>;
      const said = (t: string): string =>
        t.replace(/\{([Pp]rop|[Tt]rait|[Tt]hing|[Ff]igure|[Mm]ark)[^}]*\}/g, (_m, r: string) => own[r.toLowerCase()]?.short ?? 'the hat');
      for (const p of s.parts) for (const t of [p.text, ...(p.alt ?? []), ...(p.pool ?? [])]) if (t) lines.push({ where: s.id, text: said(t) });
      for (const t of [...(s.close?.callback ?? []), ...(s.close?.plain ?? [])]) lines.push({ where: `${s.id} close`, text: said(t) });
    }
    for (const deck of Object.values(DECKS)) {
      for (const c of deck) {
        for (const e of Object.values(c.exports ?? {})) for (const t of e.pay ?? []) lines.push({ where: c.id, text: t });
        if (c.deck === 'close' && c.tags.outcome === 'sheet') lines.push({ where: c.id, text: c.text });
      }
    }
    expect(lines.length).toBeGreaterThan(500);
    for (const { where, text } of lines) {
      expect(machineryIn(text), `${where}: ${text}`).toEqual([]);
      expect(recapVerdicts(text, []), `${where}: ${text}`).toEqual([]);
    }
  });

  it('cuts a card at its cut, or at its first sentence', () => {
    const est = DECKS.establish.find((c) => c.id === 'est-059');
    expect(est).toBeDefined();
    const filled = (est?.text ?? '').replace('{place}', 'the speakeasy');
    expect(shortOf({ ...(est as NonNullable<typeof est>), cut: undefined }, filled)).toBe(
      'the speakeasy was a long room with a low ceiling, a bar down one side and a scatter of tables along the other.',
    );
  });
});

describe('M13: running a sheet', () => {
  const sheet: Sheet = {
    id: 'test',
    moment: 'company',
    name: 'test',
    parts: [
      { hole: 'prop', deck: 'place-ambient', bind: 'prop' },
      { para: true, text: 'Nobody looked up except the one person paid to.' },
      { text: 'The light from {prop} did nobody any favours.', optional: true },
    ],
    close: { roles: ['prop'], callback: ['I let {prop} be.'], plain: ['It was that kind of room.'] },
  };
  const holes = (): Holes => ({
    random: new Rng(7),
    slots: {},
    engine: () => null,
    deck: () => ({
      text: 'Behind the bar, clean glasses stood in rows under a mirror whose silvering had gone.',
      exports: { prop: { text: 'a mirror', short: 'the mirror', kind: 'glass', pay: ['I caught myself in the mirror.'] } },
    }),
    close: () => null,
  });

  it('binds a role from a card, brings it back, and pays it off with the card’s own line', () => {
    const run = newSheetRun('company', {}, true);
    const out = runSheet(sheet, holes(), run);
    expect(out?.pre.map((p) => p.text)).toEqual([
      'Behind the bar, clean glasses stood in rows under a mirror whose silvering had gone.',
      'Nobody looked up except the one person paid to. The light from the mirror did nobody any favours.',
    ]);
    expect(out?.close).toEqual({ text: 'I caught myself in the mirror.', callback: true, role: 'prop' });
    expect(run.paid).toEqual(['prop']);
  });

  it('on a page that did not roll for one, binds nothing and closes plainly', () => {
    const run = newSheetRun('company', {}, false);
    const out = runSheet(sheet, holes(), run);
    expect(out?.pre.map((p) => p.text)).toEqual([
      'Behind the bar, clean glasses stood in rows under a mirror whose silvering had gone.',
      'Nobody looked up except the one person paid to.',
    ]);
    expect(out?.close).toEqual({ text: 'It was that kind of room.', callback: false });
    expect(run.paid).toEqual([]);
  });

  it('fills people and roles, and puts up a slot that opens a sentence', () => {
    const run = newSheetRun('company', {}, false);
    expect(fillSheet('{tell.He} was {tell.doing}, {tell.tie}.', { 'tell.He': 'She', 'tell.doing': 'reading', 'tell.tie': 'the woman who had found Sirkin' }, run)?.text).toBe(
      'She was reading, the woman who had found Sirkin.',
    );
    expect(fillSheet('{prop} was there.', {}, run)).toBeNull();
  });

  it('never lets a role make the book’s machinery of a line', () => {
    const run = newSheetRun('ask', {}, true);
    run.roles.set('thing', { text: 'a notebook', short: 'the notebook' });
    expect(fillSheet('{Thing} had seen worse.', {}, run)).toBeNull();
    run.roles.set('thing', { text: 'a folded newspaper', short: 'the newspaper' });
    expect(fillSheet('{Thing} had seen worse.', {}, run)?.text).toBe('The newspaper had seen worse.');
  });

  it('reads its conditions', () => {
    expect(holds(3, '>=2')).toBe(true);
    expect(holds(1, '>=2')).toBe(false);
    expect(holds('bar', ['bar', 'counter'])).toBe(true);
    expect(holds(undefined, false)).toBe(true);
    expect(holds('yap', '!enigma')).toBe(true);
  });

  it('never gives a moment the sheet it had last, while another fits, and prefers the least used', () => {
    const random = new Rng(3);
    const history: string[] = [];
    const flags = { temper: 'yap', family: 'evening', callback: false };
    const fitting = SHEETS.filter((x) => x.moment === 'telling' && fitsWhen(x, flags));
    expect(fitting.length).toBeGreaterThan(1);
    const uses = new Map<string, number>();
    for (let i = 0; i < 40; i++) {
      const s = chooseSheet('telling', flags, history, random);
      expect(s).not.toBeNull();
      if (history.length > 0) expect(s?.id).not.toBe(history[history.length - 1]);
      history.push(s?.id as string);
      uses.set(s?.id as string, (uses.get(s?.id as string) ?? 0) + 1);
    }
    // The least used first: forty draws over the sheets that fit come out even, near enough.
    const counts = [...uses.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(uses.size).toBe(fitting.length);
  });

  it('rolls for a callback on about seventy pages in a hundred', () => {
    let on = 0;
    for (let seed = 1; seed <= 40; seed++) for (let page = 0; page < 25; page++) if (callbackRoll(seed, page)) on++;
    expect(on / 1000).toBeGreaterThan(CALLBACK_SHARE - 0.05);
    expect(on / 1000).toBeLessThan(CALLBACK_SHARE + 0.05);
  });
});

describe('M13: the pages', () => {
  it('writes arrivals, questions, searches and the office from sheets', () => {
    const moments = new Set<string>();
    for (const r of runs) for (const page of r.state.log) for (const s of page.sheets ?? []) moments.add(s.moment);
    for (const m of ['arrival', 'company', 'ask', 'telling', 'search', 'recap', 'office']) expect(moments.has(m), m).toBe(true);
  });

  it('pays a role off on about seventy sheeted pages in a hundred', () => {
    let sheeted = 0;
    let paid = 0;
    for (const r of runs) {
      for (const page of r.state.log) {
        if ((page.sheets ?? []).length === 0) continue;
        sheeted++;
        if ((page.sheets ?? []).some((s) => s.callback)) paid++;
      }
    }
    expect(sheeted).toBeGreaterThan(300);
    expect(paid / sheeted).toBeGreaterThan(0.55);
    expect(paid / sheeted).toBeLessThan(0.85);
  });

  it('never gives a moment the same sheet twice running in a night while another fits', () => {
    for (const r of runs) {
      const last = new Map<string, string>();
      for (const page of r.state.log) {
        for (const s of page.sheets ?? []) {
          // Only where the moment had a choice: a telling's sheets are keyed
          // by temper and what is told, and one may be all that fits.
          if ((s.fitting ?? 0) > 1) expect(last.get(s.moment), `${r.label} p${page.n} ${s.moment}`).not.toBe(s.id);
          last.set(s.moment, s.id);
        }
      }
    }
  });

  it('writes every required beat on every sheeted page', () => {
    for (const r of runs) {
      const report = checkRunCoverage(r.view, r.state);
      expect(report.issues, r.label).toEqual([]);
      expect(report.written).toBe(report.required);
    }
  });

  it('seed 3 at Medium: the speakeasy arrival is written from an arrival sheet and a company sheet, and ends on its last line', () => {
    const view = buildView(generateCase(3, { tier: 4 }));
    const state = playOracle(view).state;
    const page = state.log.find((p) => p.shape === 'arrive' && p.at === 'speakeasy');
    expect(page).toBeDefined();
    const moments = (page?.sheets ?? []).map((s) => s.moment);
    expect(moments).toContain('arrival');
    expect(moments).toContain('company');
    const prose = (page?.blocks ?? []).flatMap((b) => (b.kind === 'prose' && b.voice !== 'recap' ? [b.text] : []));
    // The observation lands, and the page does not end on it but on the sheet's last line.
    const observation = (page?.beats ?? []).find((b) => b.kind === 'thought' && b.tag === 'view' && /who had found Sirkin/.test(b.text ?? ''));
    expect(observation?.rendered).toBe(true);
    expect(prose.join(' ')).toContain('Crowninshield');
  });

  it('changes nothing but words: the same commands make the same night with the sheets on or off', () => {
    // And the same choices at every step: a name a page says is a person the
    // player can ask about (M9, "Who knows whom"), so a sheet never names
    // anybody the plan's page would not have.
    const offered = (view: CaseView, commands: readonly string[]): string[][] => {
      let state = newRun(view, { detectiveName: 'Dashiell' });
      const out: string[][] = [];
      for (const c of commands) {
        state = stepInput(state, c, view).state;
        out.push(allChoices(choicesFor(view, state)).map((x) => `${x.command}${x.lead ? '*' : ''}`));
      }
      return out;
    };
    for (let seed = 1; seed <= 4; seed++) {
      for (const tier of [0, 2, 4] as Tier[]) {
        const view = buildView(generateCase(seed, { tier }));
        const commands = playWandering(view, 11, 'Dashiell').steps.map((s) => s.command);
        const on = play(view, commands);
        const choicesOn = offered(view, commands);
        setSheets(false);
        let off: RunState;
        let choicesOff: string[][];
        try {
          off = play(view, commands);
          choicesOff = offered(view, commands);
        } finally {
          setSheets(true);
        }
        expect(choicesOn).toEqual(choicesOff);
        expect(on.found).toEqual(off.found);
        expect(on.accounts).toEqual(off.accounts);
        expect(on.actionsUsed).toBe(off.actionsUsed);
        expect(on.threads).toEqual(off.threads);
        expect(on.volunteered).toEqual(off.volunteered);
        expect(on.log.length).toBe(off.log.length);
        expect(on.confronts ?? []).toEqual(off.confronts ?? []);
        expect(off.log.every((p) => (p.sheets ?? []).length === 0)).toBe(true);
      }
    }
  });
});
