/**
 * M11 — people (docs/28-m11-people.md, golden docs/golden/seed3-people.md).
 *
 * - §A.1 the office runs in the order a person tells it, and each of his
 *   questions answers the line in front of it;
 * - §A.2 first sight is a character: what they are doing, how old, their
 *   trade or their look, how the street sees them, their tie if known;
 * - §A.3 asked about themselves, people tell their lives in plain words, to
 *   a plain question;
 * - §A.4 at most one enigma a case, and nobody else's temper moves;
 * - §A.5 the client's rundown: free, once a visit, strangers stay strangers;
 * - §A.6 an arrival closes on an observation of the detective's own;
 * - §A.7 a grounding is about what it grounds;
 * - Part B richer dossiers, the want's pronoun, no shared tie sentence.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { acquaintanceOf } from '../src/gen/index.js';
import { characterFor, ROLE_CHARACTER } from '../src/gen/data/character.js';
import { FIXTURE_CARDS, JOB_WORDS, SUSPECT_ARCHETYPES } from '../src/gen/data/cast.js';
import { buildView, peopleHereNow, type CaseView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { newRun, priceOf, rundownOpen, stepInput } from '../src/game/reducer.js';
import { choicesFor } from '../src/game/choices.js';
import { lintRun, MYSTERY_QUESTIONS, AGE_SELF } from '../src/game/reader-lint.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { atMostOneEnigma, rollCast, type Temper } from '../src/game/voice/cast.js';
import { OFFICE_ASK_POLICE, OFFICE_ASK_START, OFFICE_ASK_WHY } from '../src/game/voice/office.js';
import { thingTopic } from '../src/game/scene/families.js';
import { sentencesOf } from '../src/game/scene/text.js';
import type { Page, RunState } from '../src/game/types.js';

const text = (page: Page): string =>
  page.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : '')).join('\n');

const views = (n: number): CaseView[] => {
  const out: CaseView[] = [];
  for (let seed = 1; seed <= n; seed++) {
    out.push(buildView(generateCase(seed, { difficulty: 2 })));
    out.push(buildView(generateCase(seed, { tier: 4, level: 2 })));
  }
  return out;
};

/** The oracle's route with the rundown taken wherever it is offered, and everybody asked about themselves. */
function peopleRun(view: CaseView): RunState {
  const commands = playOracle(view).steps.map((s) => s.command);
  let state = newRun(view, { detectiveName: 'Dashiell' });
  const asked = new Set<string>();
  for (const c of commands) {
    if (rundownOpen(view, state)) state = stepInput(state, `ask ${view.client.surname} who's here`, view).state;
    const m = /^ask (\S+) about /.exec(c);
    if (m && !asked.has(m[1] as string)) {
      asked.add(m[1] as string);
      state = stepInput(state, `ask ${m[1]} about themselves`, view).state;
    }
    state = stepInput(state, c, view).state;
    if (state.reportOpen) break;
  }
  return state;
}

describe('M11 §A.1: the office in the order a person tells it', () => {
  it('says who she is to him and that he is dead first, and asks each question after the line that invites it', () => {
    const his = new Set([...OFFICE_ASK_POLICE, ...OFFICE_ASK_START, ...Object.values(OFFICE_ASK_WHY).flat()]);
    for (const view of views(40)) {
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const t = text(page).replace(/\s+/g, ' ');
      const label = `seed ${view.kase.seed} ${view.kase.shape?.name ?? 'd2'}`;
      const client = view.client;
      const tie = client.dossier?.tie.text ?? '§';
      const relation = t.indexOf(`I am ${tie.includes(view.victim.surname) ? tie.replace(view.victim.surname, view.victim.name) : tie}`);
      expect(relation, `${label}: the relation`).toBeGreaterThan(0);
      if (view.kase.act.type === 'murder') {
        const dead = t.search(/\b(?:He|She) is dead\b/);
        expect(dead, `${label}: the death`).toBeGreaterThan(relation);
      }
      // His questions are the office's own, never the generator's prompts.
      for (const l of view.kase.briefing) if (l.prompt) expect(t.includes(`“${l.prompt}”`), `${label}: ${l.prompt}`).toBe(false);
      const asked = [...t.matchAll(/“([^”]+\?)”/g)].map((m) => m[1] as string).filter((q) => his.has(q));
      expect(asked.length, label).toBeGreaterThan(0);
      expect(asked.length, label).toBeLessThanOrEqual(3);
      // "And the police?" comes after where he was found, and "Why me?" after the police.
      const police = asked.find((q) => OFFICE_ASK_POLICE.includes(q));
      const discovery = view.kase.victimBio.discovery;
      if (police && discovery) {
        expect(t.indexOf(`“${police}”`), `${label}: police after found`).toBeGreaterThan(t.search(/\bfound\b/));
        const why = asked.find((q) => Object.values(OFFICE_ASK_WHY).flat().includes(q));
        if (why) expect(t.indexOf(`“${why}”`), label).toBeGreaterThan(t.search(/\bprecinct\b/i));
      }
      const start = asked.find((q) => OFFICE_ASK_START.includes(q));
      if (start) expect(t.indexOf(`“${start}”`), label).toBeGreaterThan(t.indexOf(`“${asked[0] as string}”`) - 1);
    }
  });
});

describe('M11 §A.2: first sight is a character', () => {
  it('gives somebody met for the first time three to five sentences on an arrival with no finds', () => {
    let seen = 0;
    for (const view of views(20)) {
      for (const page of playOracle(view).state.log) {
        if (page.shape !== 'arrive' || page.found.length > 0) continue;
        for (const b of page.blocks) {
          if (b.kind !== 'prose' || b.voice !== 'presence') continue;
          const who = view.kase.people.find((p) => b.text.startsWith(`${p.surname}, a `));
          if (!who) continue;
          const n = sentencesOf(b.text).length;
          seen++;
          expect(n, `seed ${view.kase.seed} p${page.n}: ${b.text}`).toBeGreaterThanOrEqual(3);
          expect(n, `seed ${view.kase.seed} p${page.n}: ${b.text}`).toBeLessThanOrEqual(5);
        }
      }
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('M11 §A.3 and §A.7: lives in plain words, groundings about what they ground', () => {
  it('finds no mystery question, no "I am N years old", no grounding of the wrong family, and no correspondence violation, asking everybody about themselves', () => {
    const issues: string[] = [];
    const violations: string[] = [];
    for (const view of views(12)) {
      const state = peopleRun(view);
      for (const i of lintRun(view, state)) issues.push(`seed ${view.kase.seed} p${i.page + 1} ${i.rule}: ${i.detail}`);
      for (const v of checkRun(view, state)) {
        // The two generator sentences docs/23 lists under "Not fixed".
        if (v.rule === 'time-disagrees' && / find$/.test(v.where)) continue;
        violations.push(`seed ${view.kase.seed} ${v.where} ${v.rule}: ${v.detail}`);
      }
    }
    expect(issues.slice(0, 10)).toEqual([]);
    expect(violations.slice(0, 10)).toEqual([]);
  }, 300_000);

  it('knows the old lines when it sees them', () => {
    expect(MYSTERY_QUESTIONS.some((re) => re.test('Who are you when nobody is asking?'))).toBe(true);
    expect(MYSTERY_QUESTIONS.some((re) => re.test('How long have you had the house?'))).toBe(false);
    expect(AGE_SELF.test('I am 45 years old and the landlady.')).toBe(true);
  });

  it('tells a key from a debt', () => {
    const view = buildView(generateCase(3, { tier: 4, level: 2, classic: true }));
    const key = view.kase.findable.find((c) => c.establishes.some((f) => f.kind === 'hadAccess') && /\bkey\b/.test(c.text));
    const debt = view.kase.findable.find((c) => c.establishes.some((f) => f.kind === 'hasMotive' && f.motiveType === 'debt'));
    if (key) expect(thingTopic([key])).toBe('keys');
    if (debt) expect(thingTopic([debt])).toBe('money');
  });
});

describe('M11 §A.4: at most one enigma a case', () => {
  it('rolls at most one, over 300 cases', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const cast = rollCast(generateCase(seed, { difficulty: 2 }));
      const n = Object.values(cast.temper).filter((t) => t === 'enigma').length;
      expect(n, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps one of the enigmas it rolled, moves the rest to plain, and touches nobody else', () => {
    const kase = generateCase(3, { difficulty: 2 });
    const ids = kase.people.filter((p) => p.kind !== 'victim').map((p) => p.id);
    const rolled: Record<string, Temper> = {};
    ids.forEach((id, i) => (rolled[id] = i < 3 ? 'enigma' : i % 2 === 0 ? 'yap' : 'plain'));
    const out = atMostOneEnigma(kase, 3, rolled);
    expect(Object.values(out).filter((t) => t === 'enigma')).toHaveLength(1);
    for (const id of ids.slice(3)) expect(out[id]).toBe(rolled[id]);
    for (const id of ids.slice(0, 3)) expect(['enigma', 'plain']).toContain(out[id]);
    // Reproducible.
    expect(atMostOneEnigma(kase, 3, rolled)).toEqual(out);
  });
});

describe('M11 §A.5: the client’s rundown', () => {
  it('is offered only with the client and somebody else in the room, is free, and comes once a visit', () => {
    let offered = 0;
    for (const view of views(20)) {
      let state = newRun(view, { detectiveName: 'Dashiell' });
      // Never at the office: nobody else is there.
      expect(choicesFor(view, state).some((g) => g.kind === 'rundown')).toBe(false);
      for (const c of playOracle(view).steps.map((s) => s.command)) {
        state = stepInput(state, c, view).state;
        if (state.reportOpen) break;
        const here = peopleHereNow(view, state.at, { clientInOffice: state.clientInOffice, found: state.found });
        const open = rundownOpen(view, state);
        const withOthers = here.some((p) => p.id === view.client.id) && here.some((p) => p.id !== view.client.id);
        if (open) expect(withOthers).toBe(true);
        expect(choicesFor(view, state).some((g) => g.kind === 'rundown')).toBe(open);
        if (!open) continue;
        offered++;
        expect(priceOf({ kind: 'rundown' }, state, view).cost).toBe(0);
        const before = state;
        const step = stepInput(state, `ask ${view.client.surname} who's here`, view);
        // Nothing is found, the clock does not move, and the grid learns nothing.
        expect(step.state.found).toEqual(before.found);
        expect(step.state.actionsUsed).toBe(before.actionsUsed);
        expect(step.page.shape).toBe('rundown');
        // Strangers stay strangers: nobody the client does not know is named.
        const said = text(step.page);
        for (const p of here) {
          if (p.id === view.client.id || p.kind === 'fixture') continue;
          const knows = acquaintanceOf(view.kase, view.client.id, p.id)?.strength;
          if (knows === 'stranger' || knows === 'sight') {
            expect(said.includes(`is ${p.surname}.`), `seed ${view.kase.seed}: ${p.surname} (${knows})`).toBe(false);
          }
        }
        // Once a visit.
        expect(rundownOpen(view, step.state)).toBe(false);
        const again = stepInput(step.state, `ask ${view.client.surname} who's here`, view);
        expect(again.page.shape).toBe('repeat');
        state = step.state;
      }
    }
    expect(offered).toBeGreaterThan(5);
  });
});

describe('M11 §A.6: an arrival gives something to think about', () => {
  it('closes a first visit with no finds on an observation when somebody tied to the case is there', () => {
    let closed = 0;
    for (const view of views(20)) {
      for (const page of playOracle(view).state.log) {
        if (page.shape !== 'arrive' || page.found.length > 0) continue;
        const observation = (page.beats ?? []).find((b) => b.kind === 'thought' && b.tag === 'view' && /\bwho had\b|\bhad told me to start with\b|\bwho was paying me\b/.test(b.text ?? ''));
        if (!observation) continue;
        closed++;
        // M13: a page written from sheets says the observation where its
        // company sheet puts it ("The only one who didn't look at me at all
        // was Crowninshield.") and ends on the sheet's last line.
        if ((page.sheets ?? []).some((s) => s.moment === 'company')) {
          expect(page.blocks.some((b) => b.kind === 'prose' && b.text.includes(observation.text ?? '§'))).toBe(true);
          continue;
        }
        // M12: a recap that follows the page comes after it.
        const last = [...page.blocks].reverse().find((b) => b.kind === 'prose' && b.voice !== 'recap');
        expect(last && last.kind === 'prose' ? last.text : '').toContain(observation.text ?? '§');
      }
    }
    expect(closed).toBeGreaterThan(10);
  });
});

describe('M11: the plain fact first', () => {
  // The designer: "It should often be 'I write tickets at the pawn shop. I
  // know what a thing is worth.' … Nobody talks that way." When somebody says
  // what they do, the first sentence says the job in words anyone knows.
  const firstSentence = (s: string): string => (s.split(/(?<=[.!?])\s+/)[0] ?? s).trim();
  it('opens every account of somebody’s work on the plain job', () => {
    for (const a of SUSPECT_ARCHETYPES) {
      const job = JOB_WORDS[a.id];
      expect(job, a.id).toBeDefined();
      for (const line of a.professionFirst) expect(firstSentence(line), a.id).toMatch(job as RegExp);
    }
    for (const [role, card] of Object.entries(FIXTURE_CARDS)) {
      const job = JOB_WORDS[role];
      expect(job, role).toBeDefined();
      for (const line of card.detailsFirst) expect(firstSentence(line), role).toMatch(job as RegExp);
    }
  });

  it('says the job in front of a trade the office narrates without one', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const client = view.client;
      const job = JOB_WORDS[client.archetypeId ?? ''];
      if (!job || !client.dossier) continue;
      const pronoun = client.dossier.gender === 'f' ? 'She' : 'He';
      const trade = page.blocks.find(
        (b) => b.kind === 'prose' && b.voice === 'narrator' && b.text.startsWith(`${pronoun} `) && job.test(b.text),
      );
      expect(trade, `seed ${seed}: ${client.dossier.profession.detail}`).toBeDefined();
    }
  });
});

describe('M11: the office is not always two rooms over a shop', () => {
  it('opens on several kinds of place across forty nights, and no phrase night after night', () => {
    const kinds = new Set<string>();
    let last = '';
    let repeats = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const name = buildView(generateCase(seed, { difficulty: 2 })).office.name;
      const head = name.split(' ').slice(0, 4).join(' ');
      kinds.add(head);
      if (head === last) repeats++;
      last = head;
    }
    expect(kinds.size).toBeGreaterThan(8);
    expect(repeats).toBeLessThan(6);
  });
});

describe('M11 Part B: richer dossiers', () => {
  it('writes character lines for every suspect archetype and every fixture', () => {
    for (const a of SUSPECT_ARCHETYPES) expect(characterFor(a.id), a.id).toBeDefined();
    for (const f of Object.keys(FIXTURE_CARDS)) expect(characterFor(f), f).toBeDefined();
    expect(Object.keys(ROLE_CHARACTER).length).toBe(SUSPECT_ARCHETYPES.length + Object.keys(FIXTURE_CARDS).length);
  });

  it('gives everybody but the victim three to five details, a history and a talk register', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const p of generateCase(seed, { difficulty: 2 }).people) {
        const c = p.dossier?.character;
        if (p.kind === 'victim') {
          expect(c).toBeUndefined();
          continue;
        }
        expect(c, `${seed} ${p.surname}`).toBeDefined();
        expect(c?.details.length).toBeGreaterThanOrEqual(3);
        expect(c?.details.length).toBeLessThanOrEqual(5);
        expect(c?.details.some((d) => d.layer === 2)).toBe(true);
        expect(c?.history.text.startsWith(p.surname)).toBe(true);
        for (const d of c?.details ?? []) {
          expect(d.text, `${seed} ${p.surname}`).not.toMatch(/\{/);
          expect(d.first, `${seed} ${p.surname}`).not.toMatch(/\{/);
        }
      }
    }
  });

  it('says a want in the person’s own pronoun', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const p of generateCase(seed, { difficulty: 2 }).people) {
        const want = p.dossier?.layers.find((f) => f.kind === 'want')?.text ?? '';
        expect(want, `${seed} ${p.surname}`).not.toMatch(/\bwhat they have\b/);
      }
    }
  });

  it('never gives two people in one case the same tie sentence', () => {
    const shape = (text: string, surname: string): string => text.split(surname).join('§').replace(/’\d\d/g, '’NN');
    for (const difficulty of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 200; seed++) {
        const kase = generateCase(seed, { difficulty });
        const seen = new Map<string, string>();
        for (const p of kase.people.filter((x) => x.kind === 'suspect')) {
          const tie = p.dossier?.tie;
          if (!tie) continue;
          const key = shape(tie.backstory, p.surname);
          const other = seen.get(key);
          expect(other, `d${difficulty} seed ${seed}: ${p.surname} and ${other}: ${tie.backstory}`).toBeUndefined();
          seen.set(key, p.surname);
        }
      }
    }
  });
});
