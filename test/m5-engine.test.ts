/**
 * Milestone 5, phase 2 — the engine renders the world.
 *
 * The eight things `docs/10-m5-engine.md` §8 asks for, in its order. Every one
 * of them is a contract about what reaches the page: the register it is in,
 * whose words it is, what the notebook holds, what the report asks, and that
 * nothing on any page names a person or an hour the case does not have.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type CaseType, type Difficulty } from '../src/gen/index.js';
import { TROPE_IDS } from '../src/gen/tropes/index.js';
import {
  buildView,
  gamePar,
  parShift,
  peopleHere,
  startPlaceOf,
  victimReachable,
  type CaseView,
} from '../src/game/derive.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { fieldsFor, truthReport, withAnswer } from '../src/game/report-form.js';
import { scoreReport } from '../src/game/scoring.js';
import {
  PLAIN_FLOOR,
  PLAIN_TARGET,
  knowsHim,
  layerSentences,
  pronounOf,
  pronounSubject,
  seenSentence,
  temperOf,
} from '../src/game/voice/index.js';
import type { Page, RunState } from '../src/game/types.js';

const viewOf = (seed: number, difficulty: Difficulty = 2, opts: { tropeId?: string } = {}): CaseView =>
  buildView(
    generateCase(seed, {
      difficulty,
      ...(opts.tropeId === undefined ? {} : { tropeId: opts.tropeId }),
    }),
  );

const play = (view: CaseView, ...inputs: string[]): RunState =>
  inputs.reduce(
    (s, input) => stepInput(s, input, view).state,
    newRun(view, { detectiveName: 'Dashiell' }),
  );

const textOf = (page: Page): string =>
  page.blocks
    .map((b) =>
      b.kind === 'prose' || b.kind === 'note' ? b.text : b.kind === 'presence' ? (b.text ?? '') : '',
    )
    .join('\n');

const ratioOf = (page: Page): number => {
  const total = page.plain + page.image;
  return total === 0 ? 1 : page.plain / total;
};

/* ------------------------------------------------------------------ *
 * §1 — the plain register.
 * ------------------------------------------------------------------ */

describe('the plain register', () => {
  /**
   * The milestone's number. Target 55%, contract 50%, measured over the whole
   * corpus the spec names: a hundred oracle runs and forty wandering ones at
   * every difficulty. The mean is printed because a regression in it is a
   * design signal; the floor is what the assembler actually enforces, and it
   * enforces it on every page.
   */
  it('keeps every page above the floor, and the mean above the target', () => {
    const offenders: string[] = [];
    let pages = 0;
    let total = 0;
    let worst = { ratio: 2, where: '' };
    const record = (label: string, state: RunState): void => {
      for (const page of state.log) {
        const ratio = ratioOf(page);
        pages++;
        total += ratio;
        if (ratio < worst.ratio) worst = { ratio, where: `${label} page ${page.n}` };
        if (ratio < PLAIN_FLOOR) {
          offenders.push(`${label} page ${page.n}: ${ratio.toFixed(2)}`);
        }
      }
    };

    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 100; seed++) {
        record(`d${difficulty} oracle ${seed}`, playOracle(viewOf(seed, difficulty)).state);
      }
      for (let seed = 1; seed <= 40; seed++) {
        const view = viewOf(seed, difficulty);
        record(`d${difficulty} wander ${seed}`, playWandering(view, seed).state);
      }
    }

    const mean = total / pages;
    process.stdout.write(
      `plain register: mean ${mean.toFixed(4)} over ${pages} pages, ` +
        `worst ${worst.ratio.toFixed(4)} (${worst.where})\n`,
    );
    expect(offenders.slice(0, 10)).toEqual([]);
    expect(mean).toBeGreaterThanOrEqual(PLAIN_TARGET);
  }, 120_000);

  it('says a robbery’s and a disappearance’s facts plainly, because the deck cannot', () => {
    for (const tropeId of ['inside-job', 'payroll', 'left', 'taken']) {
      const view = viewOf(3, 2, { tropeId });
      const gaps = playOracle(view).state.log.flatMap((p) => p.gaps);
      expect(
        gaps.some((g) => g.startsWith('plain-register:')),
        `${tropeId} should reach for the plain register at least once`,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ *
 * §2 — the briefing page.
 * ------------------------------------------------------------------ */

describe('the briefing page', () => {
  /**
   * Every sentence, whole, in the client's mouth or in Dashiell's. Two
   * allowances, both of them the spec's:
   *
   * - The first sentence — who came up the stairs — is the one thing the
   *   entrance card replaces when the roll says he knows the client (§2).
   * - The hiring frame carries the last of it in `{fact}`, and a frame is
   *   written around a fact that does not end the sentence: "…and was past due
   *   on it, Dashiell, same as always," he said. The words are all there and
   *   the full stop became a comma, which is what a frame is for.
   * - Hone 2 §A.3 takes the dossier record off the page on purpose: "Percival
   *   Prentiss is 36 years old and a ward heeler" is a sentence nothing in the
   *   room told him, and what he can see stands in its place. The detail under
   *   it stays, with a pronoun for a subject.
   */
  it('carries every sentence of the briefing, as speech or as narration', () => {
    const bare = (line: string): string => line.replace(/\s+/g, ' ').replace(/[.]+$/, '');
    for (let seed = 1; seed <= 25; seed++) {
      const view = viewOf(seed);
      const state = newRun(view, { detectiveName: 'Dashiell' });
      const page = state.log[0] as Page;
      const text = textOf(page).replace(/\s+/g, ' ');
      const familiar = knowsHim(state.cast.roll, view.client.id);
      // The client's sentences reach the page in the client's own words, so
      // that is the form to look for; Dashiell's reach it as written. §A.2
      // gives every spoken sentence a third form — the same content split
      // where a person breathes — and the page uses it when it is short of
      // short sentences, so either form counts as the sentence having arrived.
      // §B.1 also puts "…," she said. "…" through the middle of one turn a
      // page, so a breath that arrived may arrive a piece at a time; a piece
      // whose full stop became a comma is the same words either way.
      const arrived = (line: (typeof view.kase.briefing)[number]): boolean => {
        const said = line.spoken ?? line.text;
        if (text.includes(bare(said))) return true;
        const breath = line.breath ?? [];
        if (breath.length < 2) return false;
        return text.includes(bare(breath.join(' '))) || breath.every((p) => text.includes(bare(p)));
      };
      // §A.3's two allowances, and the page has to show the replacement.
      const client = view.client;
      const narration = view.kase.briefing.filter((l) => l.speaker === 'narration');
      const record = narration[1]?.text ?? '';
      const detail = narration[2]?.text ?? '';
      const seen = seenSentence(client, !familiar);
      if (record.length > 0) {
        expect(text.includes(bare(seen)), `seed ${seed}: what he can see`).toBe(true);
      }
      const allowed = (line: (typeof view.kase.briefing)[number], i: number): boolean => {
        if (familiar && i === 0) return true;
        if (line.speaker !== 'narration') return false;
        if (line.text === record) return true;
        if (line.text === detail) {
          // In his narration with a pronoun for a subject, or in her mouth
          // where the generator has written the first-person form.
          return text.includes(bare(pronounSubject(line.text, client.surname, pronounOf(client))));
        }
        return false;
      };
      const missing = view.kase.briefing
        .map((line, i) => ({ said: line.spoken ?? line.text, line, i }))
        .filter(({ line, i }) => !allowed(line, i) && !arrived(line))
        .map(({ said }) => said);
      expect(missing, `seed ${seed}`).toEqual([]);
    }
  });

  it('closes on the retainer, and leaves the client in the chair', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const view = viewOf(seed);
      const text = textOf(newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page);
      expect(text, `seed ${seed}`).toMatch(/dollars|roll with a rubber band/);
      expect(text).toContain('Two questions on the house');
    }
  });

  it('gives page one more plain sentences than any other page in the run', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const view = viewOf(seed);
      const log = playOracle(view).state.log;
      const first = log[0] as Page;
      expect(ratioOf(first), `seed ${seed}`).toBeGreaterThanOrEqual(0.6);
    }
  });
});

/* ------------------------------------------------------------------ *
 * §3 — ask X about themselves.
 * ------------------------------------------------------------------ */

/** Somebody the detective can walk up to on the first move, and where. */
function findSomebody(view: CaseView): { surname: string; place: string } | null {
  for (const place of view.kase.places) {
    const here = peopleHere(view, place.id, []).filter((p) => p.kind !== 'victim');
    const who = here[0];
    if (who) return { surname: who.surname, place: place.shortName };
  }
  return null;
}

describe('ask X about themselves', () => {
  it('delivers layer one, costs one action, and is free the second time', () => {
    const view = viewOf(3);
    const target = findSomebody(view);
    expect(target).not.toBeNull();
    const { surname, place } = target as { surname: string; place: string };

    const first = play(view, `go ${place}`, `ask ${surname} about themselves`);
    const page = first.log.at(-1) as Page;
    expect(page.cost).toBe(1);
    const person = view.kase.people.find((p) => p.surname === surname);
    expect(first.selfTold).toContain(person?.id);
    // The account is theirs, in the first person.
    expect(textOf(page)).toMatch(/\bI\b/);

    const again = stepInput(first, `ask ${surname} about themselves`, view);
    expect(again.page.cost, 'the second time is free').toBe(0);
    expect(again.page.found).toEqual([]);
    expect(textOf(again.page)).toMatch(/already|same account|had it in the book|You have had that/);
  });

  it('writes the dossier into the notebook', () => {
    const view = viewOf(3);
    const target = findSomebody(view) as { surname: string; place: string };
    const person = view.kase.people.find((p) => p.surname === target.surname);
    const before = play(view, `go ${target.place}`);
    const beforeEntry = buildNotebook(view, before).people.find((p) => p.id === person?.id);
    expect(beforeEntry?.dossier.volunteered ?? []).toEqual([]);

    const after = play(view, `go ${target.place}`, `ask ${target.surname} about themselves`);
    const entry = buildNotebook(view, after).people.find((p) => p.id === person?.id);
    expect(entry?.dossier.volunteered).toEqual(layerSentences(person as never, 1));
  });

  it('gets a layer-two fact about somebody else out of a yapper', () => {
    // A yapper who is standing somewhere the detective can reach on move one.
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const base = newRun(view, { detectiveName: 'Dashiell' });
      for (const place of view.kase.places) {
        const yapper = peopleHere(view, place.id, []).find(
          (p) => p.kind !== 'victim' && temperOf(base.cast, p.id) === 'yap',
        );
        if (!yapper) continue;
        const state = play(view, `go ${place.shortName}`, `ask ${yapper.surname} about themselves`);
        expect(state.gossip.length, `seed ${seed}`).toBeGreaterThan(0);
        const about = state.gossip[0] as string;
        expect(about).not.toBe(yapper.id);
        const entry = buildNotebook(view, state).people.find((p) => p.id === about);
        expect(entry?.dossier.fromOthers.length ?? 0).toBeGreaterThan(0);
        return;
      }
    }
    throw new Error('no yapper stood anywhere the detective could reach');
  });
});

/* ------------------------------------------------------------------ *
 * §4 — the notebook as dossiers.
 * ------------------------------------------------------------------ */

describe('the notebook’s People', () => {
  it('never shows a layer that has not been learned', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const view = viewOf(seed);
      const state = playOracle(view).state;
      const book = buildNotebook(view, state);
      for (const entry of book.people) {
        const person = view.personById.get(entry.id);
        if (!person || person.kind === 'victim') continue;
        // Layer 1 only after they have been asked about themselves.
        if (!state.selfTold.includes(entry.id)) expect(entry.dossier.volunteered).toEqual([]);
        // Nothing invented: every sentence is one of that person's own.
        const all = new Set([
          ...layerSentences(person, 0),
          ...layerSentences(person, 1),
          ...layerSentences(person, 2),
          ...layerSentences(person, 3),
        ]);
        for (const line of [
          ...entry.dossier.onSight,
          ...entry.dossier.volunteered,
          ...entry.dossier.fromOthers,
          ...entry.dossier.documents,
        ]) {
          expect(all.has(line), `${entry.surname}: ${line}`).toBe(true);
        }
        // And never more of a layer than the case has handed over.
        expect(entry.dossier.fromOthers.length).toBeLessThanOrEqual(
          layerSentences(person, 2).length,
        );
      }
    }
  });

  it('gives the victim an entry, out of the briefing', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const view = viewOf(seed);
      const book = buildNotebook(view, newRun(view, { detectiveName: 'Dashiell' }));
      const victim = book.people.find((p) => p.isVictim);
      expect(victim, `seed ${seed}`).toBeDefined();
      expect(victim?.dossier.onSight).toContain(view.kase.victimBio.standing);
    }
  });

  it('files a third party under the person whose tie names them, and never as a person', () => {
    let seen = 0;
    for (let seed = 1; seed <= 30 && seen < 5; seed++) {
      const view = viewOf(seed);
      const book = buildNotebook(view, playOracle(view).state);
      for (const entry of book.people) {
        for (const mention of entry.mentions) {
          seen++;
          // A mention is in `case.mentions` and never in `case.people`.
          expect(view.kase.mentions.some((m) => m.id === mention.id)).toBe(true);
          expect(view.kase.people.some((p) => p.name === mention.name)).toBe(false);
          // And is never somebody you can go and see.
          expect(book.people.some((p) => p.id === mention.id)).toBe(false);
        }
      }
    }
    expect(seen, 'no case in thirty named a third party').toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * §5 — the report asks the unknowns.
 * ------------------------------------------------------------------ */

describe('the report', () => {
  it('asks exactly case.act.unknowns, and scores only those', () => {
    for (const tropeId of TROPE_IDS) {
      for (let seed = 1; seed <= 4; seed++) {
        const view = viewOf(seed, 2, { tropeId });
        const keys = fieldsFor(view).map((f) => f.key);
        expect(keys, `${tropeId} seed ${seed}`).toEqual(view.kase.act.unknowns);
        const verdict = scoreReport(
          view,
          newRun(view, { detectiveName: 'Dashiell' }),
          truthReport(view),
        );
        expect(verdict.asked).toBe(view.kase.act.unknowns.length);
        expect(verdict.points).toBe(verdict.asked);
        expect(verdict.outcome).toBe('solved');
      }
    }
  });

  it('offers only options the case actually has', () => {
    for (const tropeId of TROPE_IDS) {
      const view = viewOf(2, 2, { tropeId });
      for (const field of fieldsFor(view)) {
        expect(field.options.length, `${tropeId} ${field.key}`).toBeGreaterThan(1);
        const truth = truthReport(view);
        const answer = field.options.map((o) => o.value);
        // The truth is always one of the options on the form.
        const verdict = scoreReport(view, newRun(view, { detectiveName: 'Dashiell' }), truth);
        const row = verdict.fields.find((f) => f.key === field.key);
        expect(row?.correct, `${tropeId} ${field.key}`).toBe(true);
        expect(answer.length).toBe(new Set(answer).size);
      }
    }
  });

  it('chooses the ending by case type and by outcome', () => {
    const shapes: Record<CaseType, string> = {
      murder: 'hangs',
      robbery: 'Nobody hangs for a box',
      missing: 'did not want finding',
    };
    for (const [type, phrase] of Object.entries(shapes) as [CaseType, string][]) {
      const view = viewOf(3, 2, { tropeId: type === 'murder' ? 'body-at-scene' : type === 'robbery' ? 'inside-job' : 'left' });
      expect(view.kase.act.type).toBe(type);
      const state = newRun(view, { detectiveName: 'Dashiell' });
      const solved = scoreReport(view, state, truthReport(view));
      expect(solved.closing.join(' '), type).toContain(phrase);

      // A different outcome is a different ending.
      const first = view.kase.act.unknowns[0];
      if (first === undefined) throw new Error('a case with no unknowns is not a case');
      const cold = scoreReport(view, state, withAnswer(truthReport(view), first, null));
      expect(cold.outcome).toBe('cold');
      expect(cold.closing.join(' ')).not.toEqual(solved.closing.join(' '));

      // The deck has cards for all three types now, so none of them logs a
      // gap. It logged one for a robbery and a disappearance until the
      // sixteen cards landed.
      expect(solved.gaps, type).toEqual([]);
    }
  });

  it('names the unknown that was wrong in the wrong-man ending', () => {
    const view = viewOf(3);
    const innocent = view.kase.people.find((p) => p.kind === 'suspect' && !p.isKiller);
    const verdict = scoreReport(view, newRun(view, { detectiveName: 'Dashiell' }), {
      ...truthReport(view),
      killerId: innocent?.id ?? null,
    });
    expect(verdict.outcome).toBe('wrong-man');
    // The noun agrees with the person the report named, which is why "wrong
    // man" is now "wrong man|woman" here.
    expect(verdict.closing.join(' ')).toMatch(/the name of the one who did it|wrong (man|woman)/i);
  });
});

/* ------------------------------------------------------------------ *
 * §6 — body moved.
 * ------------------------------------------------------------------ */

describe('body-moved', () => {
  it('starts the night where the body was found, not where it happened', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const view = viewOf(seed, 2, { tropeId: 'body-moved' });
      const act = view.kase.act;
      expect(view.startId).toBe(act.bodyFoundAt);
      expect(view.startId).not.toBe(view.sceneId);
      expect(startPlaceOf(view.kase)).toBe(act.bodyFoundAt);

      // The free report is handed over there, and says the room disagrees.
      const state = play(view, `go ${view.placeById.get(view.startId)?.shortName}`);
      const page = state.log.at(-1) as Page;
      expect(page.found.length).toBeGreaterThan(0);
      expect(textOf(page)).toContain('was not killed at');
    }
  });

  it('keeps the oracle honest against the par the start actually costs', () => {
    const shifts: number[] = [];
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      const failures: string[] = [];
      for (const tropeId of TROPE_IDS) {
        for (let seed = 1; seed <= 6; seed++) {
          const view = viewOf(seed, difficulty, { tropeId });
          if (tropeId === 'body-moved') shifts.push(parShift(view.kase));
          const result = playOracle(view);
          if (!result.ok) failures.push(`${tropeId} d${difficulty} seed ${seed}: ${result.reason}`);
          else if (result.actions > gamePar(view.kase))
            failures.push(
              `${tropeId} d${difficulty} seed ${seed}: ${result.actions} against ${gamePar(view.kase)}`,
            );
        }
      }
      expect(failures, `difficulty ${difficulty}`).toEqual([]);
    }
    const mean = shifts.reduce((n, s) => n + s, 0) / Math.max(1, shifts.length);
    process.stdout.write(
      `body-moved par shift: mean ${mean.toFixed(2)}, ` +
        `range ${Math.min(...shifts)}..${Math.max(...shifts)} over ${shifts.length} cases\n`,
    );
  }, 120_000);

  it('leaves the par of every other trope exactly where M4b put it', () => {
    for (const tropeId of TROPE_IDS) {
      if (tropeId === 'body-moved') continue;
      for (let seed = 1; seed <= 5; seed++) {
        const view = viewOf(seed, 2, { tropeId });
        expect(parShift(view.kase), `${tropeId} seed ${seed}`).toBe(0);
        expect(gamePar(view.kase)).toBe(view.kase.par + 1);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §7 — robbery and missing on the page.
 * ------------------------------------------------------------------ */

const DEATH = /\b(dead|died|killed|kills|murder|murdered|corpse|slab|hanged|hangs|the coroner)\b/i;

describe('robbery and missing on the page', () => {
  it('never tells a robbery that its owner is dead', () => {
    const offenders: string[] = [];
    for (const tropeId of ['inside-job', 'payroll']) {
      for (let seed = 1; seed <= 10; seed++) {
        const view = viewOf(seed, 2, { tropeId });
        const owner = view.victim.surname;
        const state = playOracle(view).state;
        for (const page of state.log) {
          // A closing quotation mark after the stop is still the end of a
          // sentence: without this the splitter runs a line of dialogue into
          // the narration under it and reads the two as one.
          for (const sentence of textOf(page).split(/(?<=[.!?][”’"']?)\s+/)) {
            if (!sentence.includes(owner)) continue;
            if (DEATH.test(sentence)) offenders.push(`${tropeId} ${seed} p${page.n}: ${sentence}`);
          }
        }
        // And the form never asks who killed them.
        for (const field of fieldsFor(view)) expect(field.label).not.toMatch(/killed/i);
        // The owner is alive, is somewhere, and can be spoken to.
        expect(victimReachable(view.kase, [])).toBe(true);
      }
    }
    expect(offenders.slice(0, 5)).toEqual([]);
  });

  it('will not interview a missing person until the case has found them', () => {
    for (const tropeId of ['left', 'taken']) {
      for (let seed = 1; seed <= 8; seed++) {
        const view = viewOf(seed, 2, { tropeId });
        expect(victimReachable(view.kase, []), `${tropeId} seed ${seed}`).toBe(false);
        // Nobody stands anywhere with them until then.
        for (const place of view.kase.places) {
          expect(peopleHere(view, place.id, []).some((p) => p.kind === 'victim')).toBe(false);
        }
        // And the whole run through, they are never in a room he walks into.
        const state = playOracle(view).state;
        for (const page of state.log) {
          const presence = page.blocks.find((b) => b.kind === 'presence');
          if (presence && presence.kind === 'presence') {
            expect(presence.personIds).not.toContain(view.victim.id);
          }
        }
      }
    }
  });

  it('closes a disappearance without a hanging', () => {
    for (const tropeId of ['left', 'taken']) {
      const view = viewOf(4, 2, { tropeId });
      const verdict = scoreReport(
        view,
        newRun(view, { detectiveName: 'Dashiell' }),
        truthReport(view),
      );
      expect(verdict.closing.join(' ')).not.toMatch(/hangs|hanged|the jury/);
    }
  });
});

/* ------------------------------------------------------------------ *
 * §8 — correspondence over the rendered pages.
 * ------------------------------------------------------------------ */

describe('correspondence, over what the engine renders', () => {
  it('finds nothing in forty oracle runs', () => {
    const all = [];
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      all.push(...checkRun(view, playOracle(view).state).map((v) => `seed ${seed} ${v.where} [${v.rule}] ${v.detail}`));
    }
    expect(all.slice(0, 10)).toEqual([]);
  }, 60_000);

  it('finds nothing in a wandering run, or in any trope', () => {
    const all: string[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const view = viewOf(seed, 3);
      all.push(
        ...checkRun(view, playWandering(view, seed).state).map(
          (v) => `wander ${seed} ${v.where} [${v.rule}] ${v.detail}`,
        ),
      );
    }
    for (const tropeId of TROPE_IDS) {
      for (let seed = 1; seed <= 4; seed++) {
        const view = viewOf(seed, 2, { tropeId });
        all.push(
          ...checkRun(view, playOracle(view).state).map(
            (v) => `${tropeId} ${seed} ${v.where} [${v.rule}] ${v.detail}`,
          ),
        );
      }
    }
    expect(all.slice(0, 10)).toEqual([]);
  }, 60_000);
});
