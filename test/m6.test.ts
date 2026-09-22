/**
 * M6 — choices replace the prompt, errand lines, a visible clock.
 *
 * §8's tests, in the spec's order, plus the handful of smaller promises the
 * rest of the spec makes: the deck coverage the build depends on, the clock's
 * beats replacing the transition rather than adding to it, and the ceiling.
 */

import { describe, expect, it } from 'vitest';

import { generateCase, type Difficulty } from '../src/gen/index.js';
import type { Id } from '../src/gen/types.js';
import { allChoices, choicesFor, tiedTo, TOPIC_LIMIT } from '../src/game/choices.js';
import { clockStrip, minutesAfter, usedByPage } from '../src/game/clock.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { buildView, gameBudget, gamePar } from '../src/game/derive.js';
import { buildNotebook, personCard, placeHoverCard } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { renderChoicesText, renderNotebookText, wordsOnPage } from '../src/game/transcript.js';
import type { RunState } from '../src/game/types.js';
import { DECKS, SCHEMA, tagIs, tagOf } from '../src/game/voice/cards.js';
import { PAGE_CEILING, clockBeatKind } from '../src/game/voice/page.js';
import { SEEDS, oracleStates } from './m6-walk.js';

const DIFFICULTIES: Difficulty[] = [1, 2, 3];

/* ------------------------------------------------------------------ *
 * §8 — exact topics (the walk over every choice is in m6-valid-d*.test.ts).
 * ------------------------------------------------------------------ */

describe('§8 exact topics and the collapse', () => {
  it('offers exact generator topics only as marked leads, and each topic once', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      for (const s of oracleStates(view).states) {
        for (const group of choicesFor(view, s)) {
          const commands = [...group.choices, ...(group.more ?? [])].map((c) => c.command);
          expect(new Set(commands).size, `seed ${seed}: a topic twice`).toBe(commands.length);
          if (group.kind !== 'ask') continue;
          // Leads, the evening and themselves are never collapsed; twelve is the most shown.
          expect(group.choices.length).toBeLessThanOrEqual(
            Math.max(TOPIC_LIMIT, group.choices.filter((c) => c.lead).length + 3),
          );
          for (const c of group.more ?? []) expect(c.lead).toBe(false);
          const firstPlain = group.choices.findIndex((c) => !c.lead);
          expect(group.choices.slice(firstPlain).some((c) => c.lead), 'leads come first').toBe(false);
        }
      }
    }
  });
});

describe('M6 review — ask topics are the person’s own', () => {
  it('offers a place or a thing only when it is a lead or the notebook ties it to the person asked', () => {
    const counts: number[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      for (const s of oracleStates(view).states) {
        for (const group of choicesFor(view, s)) {
          if (group.kind !== 'ask') continue;
          const person = view.personById.get(group.personId as string);
          if (!person) continue;
          const tied = tiedTo(view, s, person);
          const tiedNames = new Set([
            ...tied.places.map((id) => view.placeById.get(id)?.shortName),
            ...tied.objects.map((id) => view.objectById.get(id)?.name),
          ]);
          const all = [...group.choices, ...(group.more ?? [])];
          counts.push(all.length);
          for (const c of all) {
            if (c.lead) continue;
            const isPlace = view.places.some((p) => p.shortName === c.label);
            const isThing = view.kase.objects.some((o) => o.name === c.label);
            if (isPlace || isThing) expect(tiedNames.has(c.label), `seed ${seed}: ${person.surname} × ${c.label}`).toBe(true);
          }
        }
      }
    }
    counts.sort((a, b) => a - b);
    // Before the review: median 20, max 28. The notes record the numbers.
    expect(counts[Math.floor(counts.length / 2)]).toBeLessThanOrEqual(12);
  });

  it('never writes "is a The bartender" in a dossier line', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const state = playOracle(view).state;
      const book = buildNotebook(view, state);
      for (const p of book.people) {
        for (const line of [...p.dossier.onSight, ...p.dossier.volunteered]) {
          expect(line, `seed ${seed}`).not.toMatch(/\b(a|an) (The|the|A|An|a|an) /);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §8 — the choices are enough.
 * ------------------------------------------------------------------ */

describe('§8 the choices are enough', () => {
  it('offers every command the oracle issues, and the oracle solves every seed within par plus one', () => {
    const problems: string[] = [];
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const view = buildView(generateCase(seed, { difficulty }));
        const run = playOracle(view);
        if (!run.ok) problems.push(`d${difficulty} seed ${seed}: ${run.reason}`);
        if (run.actions > gamePar(view.kase) + 1) {
          problems.push(`d${difficulty} seed ${seed}: ${run.actions} against par ${gamePar(view.kase)}`);
        }
        const { states, commands } = oracleStates(view);
        for (const [i, command] of commands.entries()) {
          const offered = allChoices(choicesFor(view, states[i] as RunState)).map((c) => c.command);
          if (!offered.includes(command)) problems.push(`d${difficulty} seed ${seed}: "${command}" not offered`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * §8 — no leaks.
 * ------------------------------------------------------------------ */

describe('§8 no leaks', () => {
  it('never offers a person, thing or topic, or puts one on a card, before the notebook holds it', () => {
    const problems: string[] = [];
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const view = buildView(generateCase(seed, { difficulty }));
        for (const [n, s] of oracleStates(view).states.entries()) {
          const book = buildNotebook(view, s);
          const people = new Set(book.people.map((p) => p.surname));
          const objects = new Set(book.places.flatMap((p) => p.objects));
          const records = [
            ...book.people.flatMap((p) => p.records.map((r) => r.text)),
            ...book.places.flatMap((p) => p.clues.map((r) => r.text)),
          ].join('\n');
          const leadLabels = book.threads.flatMap((t) => t.leads.map((l) => l.label));
          // Held by the notebook: written anywhere on its page, the list of
          // leads included — a lead prints the name of the person to ask.
          const notebookText = renderNotebookText(view, s);
          const held = (surname: string): boolean => new RegExp(`\\b${surname}\\b`).test(notebookText);
          const where = `d${difficulty} seed ${seed} state ${n}`;
          for (const group of choicesFor(view, s)) {
            if (group.kind !== 'ask') continue;
            const asked = view.personById.get(group.personId as Id);
            if (!asked || !people.has(asked.surname)) problems.push(`${where}: asks somebody unknown`);
            for (const c of [...group.choices, ...(group.more ?? [])]) {
              if (c.lead) {
                if (!leadLabels.some((l) => l.endsWith(` about ${c.label}`))) {
                  problems.push(`${where}: lead "${c.label}" is not in the notebook's leads`);
                }
                continue;
              }
              const person = view.kase.people.find((p) => p.surname === c.label);
              if (person && !people.has(person.surname)) problems.push(`${where}: offers ${c.label}`);
              const object = view.kase.objects.find((o) => o.name === c.label);
              if (object && !objects.has(object.name) && !records.toLowerCase().includes(object.name.toLowerCase())) {
                problems.push(`${where}: offers ${c.label}`);
              }
            }
          }
          // Cards: nobody the notebook does not hold is named on anybody's card.
          for (const p of view.kase.people) {
            const card = personCard(view, s, p.id, book);
            if (!card) continue;
            if (!people.has(p.surname)) {
              expect(card.lines).toEqual(['Not in the notebook yet.']);
              continue;
            }
            const text = card.lines.join(' ');
            for (const q of view.kase.people) {
              if (held(q.surname) || q.id === p.id) continue;
              if (new RegExp(`\\b${q.surname}\\b`).test(text)) problems.push(`${where}: ${p.surname}'s card names ${q.surname}`);
            }
          }
          for (const place of view.places) {
            const card = placeHoverCard(view, s, place.id, book);
            const text = card?.lines.join(' ') ?? '';
            for (const q of view.kase.people) {
              if (held(q.surname)) continue;
              if (new RegExp(`\\b${q.surname}\\b`).test(text)) problems.push(`${where}: ${place.shortName}'s card names ${q.surname}`);
            }
          }
        }
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it('lists every place from the start, the office last, minus the one he is in', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    const s = newRun(view, { detectiveName: 'Dashiell' });
    const go = choicesFor(view, s).find((g) => g.kind === 'go');
    expect(go?.choices.length).toBe(view.places.length - 1);
    expect(go?.choices.map((c) => c.command)).not.toContain(`go ${view.office.shortName}`);
    const later = oracleStates(view).states[2] as RunState;
    const go2 = choicesFor(view, later).find((g) => g.kind === 'go');
    expect(go2?.choices.at(-1)?.command).toBe(`go ${view.office.shortName}`);
  });
});

/* ------------------------------------------------------------------ *
 * §8 — repeats are free.
 * ------------------------------------------------------------------ */

describe('§8 repeats are free', () => {
  it('charges nothing for a second identical ask or search, and finds nothing new', () => {
    let repeats = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const view = buildView(generateCase(seed, { difficulty }));
        const { states, commands } = oracleStates(view);
        for (const [i, command] of commands.entries()) {
          if (!command.startsWith('ask ') && !command.startsWith('examine ')) continue;
          const after = states[i + 1] as RunState;
          const again = stepInput(after, command, view);
          repeats++;
          expect(again.page.cost, `seed ${seed}: ${command}`).toBe(0);
          expect(again.page.found).toEqual([]);
          expect(again.state.actionsUsed).toBe(after.actionsUsed);
          expect(again.state.found).toEqual(after.found);
          const said = again.page.blocks.map((b) => (b.kind === 'note' ? b.text : '')).join(' ');
          expect(said).toMatch(/already/);
          // And the button said so before it was pressed.
          const offered = allChoices(choicesFor(view, after)).find((c) => c.command === command);
          if (offered) {
            expect(offered.done).toBe(true);
            expect(offered.minutes).toBe(0);
          }
        }
      }
    }
    expect(repeats).toBeGreaterThan(500);
  });
});

/* ------------------------------------------------------------------ *
 * §8 — errands trace.
 * ------------------------------------------------------------------ */

describe('§8 errands trace', () => {
  it('passes the correspondence checker with zero violations over forty seeds, errands on', () => {
    const all: string[] = [];
    let errands = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const view = buildView(generateCase(seed, { difficulty }));
        for (const state of [playOracle(view).state, playWandering(view, seed).state]) {
          all.push(...checkRun(view, state).map((v) => `d${difficulty} ${seed} ${v.where} [${v.rule}] ${v.detail}`));
          for (const page of state.log) {
            // Every page that moved him opens on why he came.
            const moved = page.n > 0 && page.cost > 0 && page.at !== state.log[page.n - 1]?.at;
            if (!moved) continue;
            errands++;
            expect(page.errand, `seed ${seed} page ${page.n}`).toBeDefined();
            const first = page.blocks[0];
            expect(first?.kind === 'prose' && first.voice === 'errand').toBe(true);
          }
        }
      }
    }
    expect(errands).toBeGreaterThan(1000);
    expect(all).toEqual([]);
  });

  it('holds about fifteen generated cards for every tag pair the engine can reach', () => {
    // The M6 content pass (§2.3): the placeholder decks are filled to about
    // fifteen cards a pair and every placeholder is gone.
    const reachable = (SCHEMA.decks.errand as unknown as { reachable: [string, string][] }).reachable;
    expect(reachable.length).toBeGreaterThan(0);
    for (const [because, forWhat] of reachable) {
      const cards = DECKS.errand.filter(
        (c) => tagIs('errand', c, 'because', because) && tagIs('errand', c, 'for', forWhat),
      );
      expect(cards.length, `${because} × ${forWhat}`).toBeGreaterThanOrEqual(10);
      // M8 §6's short form (`bridged: yes`) is dealt only after a bridge, and
      // ships as placeholders until the scene content lands.
      for (const c of cards) {
        if (tagOf('errand', c, 'bridged') === 'yes') continue;
        expect(c.status).not.toBe('placeholder');
      }
    }
    for (const searched of ['yes', 'no']) {
      const cards = DECKS.errand.filter(
        (c) => tagIs('errand', c, 'because', 'return') && tagIs('errand', c, 'searched', searched),
      );
      expect(cards.length, `return, searched ${searched}`).toBeGreaterThanOrEqual(10);
      for (const c of cards) expect(c.status).not.toBe('placeholder');
    }
    for (const beat of ['hour', 'two-left', 'last-call']) {
      const cards = DECKS.hours.filter((c) => tagIs('hours', c, 'beat', beat));
      expect(cards.length).toBeGreaterThanOrEqual(10);
      for (const c of cards) expect(c.status).not.toBe('placeholder');
    }
  });

  it('names the newest lead, and nods at the other only when there are exactly two', () => {
    let two = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      for (const page of playWandering(view, seed).state.log) {
        const e = page.errand;
        if (!e || e.kind !== 'lead') continue;
        expect(e.text.includes('And there was the other thing.')).toBe(e.leads === 2);
        if (e.leads === 2) two++;
      }
    }
    expect(two).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * §8 — the clock.
 * ------------------------------------------------------------------ */

describe('§8 the clock', () => {
  it('fills exactly as many notches as actions used, on every page', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const view = buildView(generateCase(seed, { difficulty }));
        const budget = gameBudget(view.kase);
        const { states } = oracleStates(view);
        const final = states[states.length - 1] as RunState;
        for (const [n, s] of states.entries()) {
          const strip = clockStrip(usedByPage(final.log, n), budget);
          expect(strip.notches.length).toBe(budget);
          expect(strip.notches.filter((k) => k === 'spent').length).toBe(s.actionsUsed);
          expect(strip.notches.filter((k) => k === 'next').length).toBe(s.actionsUsed < budget ? 1 : 0);
        }
      }
    }
  });

  it('says how many calls are left in words up to twenty', () => {
    expect(clockStrip(0, 19).left).toBe('Nineteen calls left before the DA files at eight.');
    expect(clockStrip(18, 19).left).toBe('One call left before the DA files at eight.');
    expect(clockStrip(0, 22).left).toBe('22 calls left before the DA files at eight.');
  });

  it('replaces the transition with an hour line, two calls left, or the last call, and never adds to it', () => {
    let beats = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const budget = gameBudget(view.kase);
      const state = playWandering(view, seed).state;
      for (const page of state.log) {
        if (page.cost === 0 || page.n === 0) continue;
        const used = usedByPage(state.log, page.n);
        const kind = clockBeatKind({
          cost: page.cost,
          minutes: minutesAfter(used, budget),
          minutesBefore: minutesAfter(used - page.cost, budget),
          actionsLeft: budget - used,
        });
        const transitions = page.blocks.filter((b) => b.kind === 'prose' && b.voice === 'transition');
        if (kind === null) continue;
        beats++;
        expect(transitions, `seed ${seed} page ${page.n}`).toEqual([]);
        const text = page.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : '')).join(' ');
        if (kind.beat === 'hour') expect(text).toContain(kind.hour);
        else expect(text).toMatch(kind.beat === 'two-left' ? /[Tt]wo/ : /[Oo]ne/);
      }
    }
    expect(beats).toBeGreaterThan(100);
  });
});

/* ------------------------------------------------------------------ *
 * §5 and §7 — the page and the transcript.
 * ------------------------------------------------------------------ */

describe('§5 the page', () => {
  it('holds pages to 220 words, and only goes past it when there is nothing left to cut', () => {
    expect(PAGE_CEILING).toBe(220);
    const words: number[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      for (const page of playOracle(view).state.log) {
        if (page.n === 0) continue;
        const n = wordsOnPage(page);
        words.push(n);
        if (n <= PAGE_CEILING) continue;
        // Thinking goes first: a page past the ceiling has none left.
        const thinking = page.blocks.filter(
          (b) => b.kind === 'prose' && ['aside', 'ambient', 'monologue'].includes(b.voice),
        );
        expect(thinking, `seed ${seed} page ${page.n}: ${n} words`).toEqual([]);
      }
    }
    const over = words.filter((n) => n > PAGE_CEILING).length;
    expect(over / words.length).toBeLessThan(0.05);
  });

  it('offers no choices once the report form is open', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    const s = stepInput(newRun(view, { detectiveName: 'Dashiell' }), 'file', view).state;
    expect(choicesFor(view, s)).toEqual([]);
  });

  it('gives the client’s two questions on the house as free buttons on page one', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const view = buildView(generateCase(seed, { difficulty: 2 }));
      const s = newRun(view, { detectiveName: 'Dashiell' });
      const ask = choicesFor(view, s).find((g) => g.kind === 'ask');
      expect(ask?.personId).toBe(view.client.id);
      for (const c of ask?.choices ?? []) expect(c.minutes).toBe(0);
      expect(ask?.choices.map((c) => c.label)).toContain('why I was hired');
    }
  });
});

describe('§7 the transcript', () => {
  it('prints one line per group, the lead mark, and the oracle’s choice', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    const { states, commands } = oracleStates(view);
    const text = renderChoicesText(choicesFor(view, states[0] as RunState), commands[0]);
    expect(text).toMatch(/^ {2}Ask \S+ about:/m);
    expect(text).toMatch(/^ {2}Go to:/m);
    expect(text).toContain('*');
    expect(text).toContain('>');
  });
});
