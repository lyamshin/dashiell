/**
 * docs/38 — honest mechanics. Three blind playtesters solved their cases and
 * called the game "opaque more than hard": labels that promised more than the
 * reducer gave, choices that renumbered under them, a narrator who knew what
 * the notebook did not. Each test here is one of their eleven findings, held.
 */
import { describe, expect, it } from 'vitest';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { generateCase } from '../src/gen/index.js';
import type { Case, Clue, Id } from '../src/gen/types.js';
import { ANCHOR_TEMPLATES } from '../src/gen/data/anchors.js';
import { OWED_TO_TIES } from '../src/gen/data/motives.js';
import { ownerOnce } from '../src/gen/place-names.js';
import { choicesFor, stableChoices, type Choice } from '../src/game/choices.js';
import { clockStrip, minutesAfter } from '../src/game/clock.js';
import { checkClaims, checkRun } from '../src/game/correspond-pages.js';
import { buildView, gameBudget, gamePar, type CaseView } from '../src/game/derive.js';
import { gridFrom } from '../src/game/grid.js';
import { renderGridText } from '../src/game/grid-text.js';
import { accountClueOf, accountedFor, clearedOnTwo } from '../src/game/m9.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { caseOptions } from '../src/game/profile.js';
import { newRun, priceOf, stepInput } from '../src/game/reducer.js';
import { parse } from '../src/game/parser.js';
import { peopleHereNow } from '../src/game/derive.js';
import { personName } from '../src/game/derive.js';
import type { Page, RunState } from '../src/game/types.js';
import { renderTruthSheet } from '../src/sheet/truthSheet.js';
import thoughtJson from '../content/decks/thought.json';

const thoughtDeck = thoughtJson as unknown as { id: string; text: string; tags: Record<string, string | undefined> }[];

type Config = { label: string; opts: Parameters<typeof generateCase>[1] };
const CONFIGS: Config[] = [
  { label: 'v1 d1', opts: { difficulty: 1 } },
  { label: 'v1 d3', opts: { difficulty: 3 } },
  { label: 'v1 Raw', opts: caseOptions({ tier: 0, level: 2 }) },
  { label: 'v1 Medium', opts: caseOptions({ tier: 4, level: 2 }) },
  { label: 'v2 Raw', opts: caseOptions({ tier: 0, level: 2, engine: 'v2' }) },
  { label: 'v2 Poached', opts: caseOptions({ tier: 2, level: 2, engine: 'v2' }) },
  { label: 'v2 Medium', opts: caseOptions({ tier: 4, level: 2, engine: 'v2' }) },
];

const views = new Map<string, CaseView>();
function viewOf(c: Config, seed: number): CaseView {
  const key = `${c.label}|${seed}`;
  let v = views.get(key);
  if (!v) {
    v = buildView(generateCase(seed, { ...c.opts, detectiveName: 'Dashiell' }));
    views.set(key, v);
  }
  return v;
}

/** Oracle and wandering runs, shared by the tests that read whole nights. */
const RUN_SEEDS = [1, 2, 3, 4];
const runs = (() => {
  let cache: { label: string; view: CaseView; state: RunState }[] | null = null;
  return () => {
    if (cache) return cache;
    cache = [];
    for (const c of CONFIGS) {
      for (const seed of RUN_SEEDS) {
        const view = viewOf(c, seed);
        cache.push({ label: `${c.label} s${seed} oracle`, view, state: playOracle(view).state });
        cache.push({ label: `${c.label} s${seed} wander`, view, state: playWandering(view, seed).state });
      }
    }
    return cache;
  };
})();

const flat = (groups: ReturnType<typeof choicesFor>): Choice[] => groups.flatMap((g) => [...g.choices, ...(g.more ?? [])]);

describe('1. a cost label is what the reducer charges, always', () => {
  it('walks nights and checks every label on every page against the clock', () => {
    const problems: string[] = [];
    let rng = 7;
    const rand = (n: number): number => {
      rng = (rng * 1103515245 + 12345) >>> 0;
      return rng % n;
    };
    let checked = 0;
    for (const c of CONFIGS) {
      for (const seed of [5, 6]) {
        const view = viewOf(c, seed);
        const budget = gameBudget(view.kase);
        let s = newRun(view, { detectiveName: 'Dashiell' });
        for (let i = 0; i < 22 && !s.reportOpen; i++) {
          const offered = flat(choicesFor(view, s)).filter((x) => x.command !== 'file');
          for (const choice of offered) {
            const r = stepInput(s, choice.command, view);
            const moved = minutesAfter(r.state.actionsUsed, budget) - minutesAfter(s.actionsUsed, budget);
            checked++;
            if (moved !== choice.minutes) problems.push(`${c.label} s${seed} p${s.log.length} "${choice.command}": said ${choice.minutes}, moved ${moved}`);
            // A free label that spends an allowance says so; nothing else does.
            const here = peopleHereNow(view, s.at, { clientInOffice: s.clientInOffice, found: s.found }).map((p) => p.id);
            const parsed = parse(view, s.at, choice.command, here, s.found);
            if (parsed.ok) {
              const reason = priceOf(parsed.command, s, view).reason;
              const spends = reason === 'house' || reason === 'familiar';
              if (spends !== (choice.freeNote !== undefined)) problems.push(`${c.label} s${seed} "${choice.command}": ${reason} but freeNote ${choice.freeNote}`);
            }
          }
          // Prefer questions, so the free first ask and the house are spent and the labels after them are read.
          const asks = offered.filter((x) => x.command.startsWith('ask'));
          const pool = asks.length > 0 && rand(3) > 0 ? asks : offered;
          s = stepInput(s, (pool[rand(pool.length)] as Choice).command, view).state;
        }
      }
    }
    expect(checked).toBeGreaterThan(2000);
    expect(problems).toEqual([]);
  });

  it('says which questions are free only by an allowance, and stops saying it once it is spent', () => {
    const view = viewOf(CONFIGS[4] as Config, 11);
    let s = newRun(view, { detectiveName: 'Dashiell' });
    const client = view.client.surname;
    const topics = (st: RunState): Choice[] =>
      choicesFor(view, st).find((g) => g.kind === 'ask' && g.personId === view.client.id)?.choices ?? [];
    expect(topics(s).filter((c) => c.minutes === 0 && !c.done).every((c) => /on the house/.test(c.freeNote ?? ''))).toBe(true);
    s = stepInput(s, `ask ${client} about that evening`, view).state;
    s = stepInput(s, `ask ${client} about themselves`, view).state;
    // Two on the house are gone; nothing says "on the house" any more.
    expect(topics(s).some((c) => /on the house/.test(c.freeNote ?? ''))).toBe(false);
  });
});

describe('2. asking the client about herself does not end the interview', () => {
  it('keeps the client, and her other questions, after both free ones', () => {
    for (const seed of [11, 3, 21]) {
      const view = viewOf(seed === 11 ? (CONFIGS[4] as Config) : (CONFIGS[6] as Config), seed);
      let s = newRun(view, { detectiveName: 'Dashiell' });
      s = stepInput(s, `ask ${view.client.surname} about that evening`, view).state;
      s = stepInput(s, `ask ${view.client.surname} about themselves`, view).state;
      expect(s.clientInOffice).toBe(true);
      const group = choicesFor(view, s).find((g) => g.kind === 'ask' && g.personId === view.client.id);
      expect(group?.choices.some((c) => !c.done)).toBe(true);
    }
  });
});

function memoryIo(): PlayIo & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return { files, read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

/** "  24. * Bellucci   25 min" → { 24: 'Bellucci' } under its heading. */
function numbers(text: string): Map<number, string> {
  const out = new Map<number, string>();
  let heading = '';
  for (const line of text.split('\n')) {
    if (/^[A-Z][^:]*:$/.test(line.trim())) heading = line.trim();
    const m = /^\s*(\d+)\.\s+\*?\s*(.+?)(?:\s{2,}\S.*)?$/.exec(line);
    if (m) out.set(Number(m[1]), `${heading} ${(m[2] as string).replace(/ ✓$/, '')}`);
  }
  return out;
}

describe('3. choices keep their numbers across a free action', () => {
  it('keeps every number, and the spent free choice stays listed as done', () => {
    const io = memoryIo();
    const play = (...argv: string[]): string => {
      const r = runPlay([...argv, '--save', 'n.json'], io);
      expect(r.code, r.out).toBe(0);
      return r.out;
    };
    play('new', '--seed', '21', '--tier', '4', '--engine', 'v2');
    const before = numbers(play('do', 'the Lyric stand').split('WHAT NEXT')[1] ?? '');
    const rundown = [...before].find(([, v]) => /who’s here/.test(v));
    expect(rundown).toBeDefined();
    const after = play('do', String(rundown?.[0])).split('WHAT NEXT')[1] ?? '';
    const now = numbers(after);
    for (const [n, what] of before) expect(now.get(n), `${n}`).toBe(what);
    expect(after).toMatch(/who’s here ✓/);
  });

  it('lays out a free page as the page before, in the model the book draws from', () => {
    for (const r of runs().slice(0, 16)) {
      const { view, state } = r;
      // Replay, and at every free page compare against the layout before it.
      void state;
      let s = newRun(view, { detectiveName: 'Dashiell' });
      let prev = choicesFor(view, s);
      const run = playOracle(view);
      for (const st of run.steps) {
        const next = stepInput(s, st.command, view).state;
        const laid = stableChoices(view, next, prev);
        const last = next.log[next.log.length - 1] as Page;
        if (last.cost === 0 && last.at === s.at && !next.reportOpen) {
          const oldCommands = prev.flatMap((g) => (g.kind === 'confront' ? [] : g.choices.map((c) => c.command)));
          const nowCommands = laid.flatMap((g) => (g.kind === 'confront' ? [] : g.choices.map((c) => c.command)));
          // Every choice the page before offered is still there, in the same order.
          const old = new Set(oldCommands);
          expect(nowCommands.filter((c) => old.has(c)), r.label).toEqual(oldCommands);
        }
        s = next;
        prev = laid;
      }
    }
  });
});

describe('4. a room search says it went through the things it marks done', () => {
  it('never marks a thing done while the page says it was left alone', () => {
    const problems: string[] = [];
    for (const r of runs()) {
      for (const page of r.state.log) {
        if (page.shape !== 'search') continue;
        const text = page.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
        if (/left (?:it|them both) (?:where|alone)|I left \S+ where it (?:was|stood)|never got round to|hadn’t touched/.test(text)) {
          problems.push(`${r.label} p${page.n}: ${text.slice(0, 160)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('5. the narrator claims nothing about a person the notebook does not hold', () => {
  it('finds no unheld claim and no "only seen" in a room nobody was shown in, over whole nights', () => {
    const problems: string[] = [];
    for (const r of runs()) {
      for (const v of checkRun(r.view, r.state)) {
        if (v.rule === 'claim-unheld' || /only seen/.test(v.detail)) problems.push(`${r.label} ${v.where}: ${v.detail}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('catches a tie said before any clue carries it', () => {
    const view = viewOf(CONFIGS[6] as Config, 21);
    const suspect = view.kase.people.find((p) => p.kind === 'suspect' && p.id !== view.client.id && p.relationshipToVictim) as Case['people'][number];
    const page = {
      n: 3,
      head: '',
      blocks: [{ kind: 'prose', text: `${suspect.surname} was ${suspect.relationshipToVictim}.`, voice: 'bridge' }],
      cost: 1,
      cardsUsed: [],
      found: [],
      at: view.office.id,
      gaps: [],
      imageMotifs: [],
      plain: 0,
      image: 0,
    } as unknown as Page;
    expect(checkClaims(view, page, []).map((v) => v.rule)).toEqual(['claim-unheld']);
    // Said out loud by a witness on the same page, it is theirs to say.
    const quoted = { ...page, blocks: [{ kind: 'prose', text: `“${suspect.surname} was ${suspect.relationshipToVictim},” she said.`, voice: 'exchange' }] } as unknown as Page;
    expect(checkClaims(view, quoted, [])).toEqual([]);
  });
});

describe('6. an anchor that happens more than once is never pinned as if unique', () => {
  it('has every recurring scene fact say it is one of several', () => {
    for (const t of ANCHOR_TEMPLATES) {
      if (t.ticks !== 'recurring') continue;
      expect(t.sceneFact, t.id).toMatch(/one of the|more than once/);
    }
  });

  it('never says "hour not known" on the grid for an anchor a found clue gave an hour', () => {
    const problems: string[] = [];
    for (const r of runs()) {
      if (!r.view.kase.logic) continue;
      const grid = gridFrom(r.view, r.state);
      const held = r.state.found.map((id) => r.view.findableById.get(id)).filter((c): c is Clue => c !== undefined);
      for (const m of grid.margins) {
        const anchor = r.view.anchorById.get(m.anchorId);
        const named = held.some((c) => c.anchorId === m.anchorId && anchor?.ticks.some((t) => (c.textRecord ?? c.text).includes(clockOf(t))));
        if (named && m.when === 'hour not known') problems.push(`${r.label}: ${m.name}`);
        if (anchor && anchor.ticks.length > 1 && m.ticks.length === 1) problems.push(`${r.label}: ${m.name} pinned to one hour`);
      }
    }
    expect(problems).toEqual([]);
  });
});

function clockOf(t: number): string {
  const h = 6 + Math.floor(t / 2);
  const words = ['six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  return t % 2 === 0 ? `${words[h - 6]} o’clock` : `half past ${words[h - 6]}`;
}

describe('7. the grid prints every count the notebook holds', () => {
  it('has a counted cell for every count and every "nobody came in"', () => {
    const problems: string[] = [];
    for (const r of runs()) {
      if (!r.view.kase.logic) continue;
      const grid = gridFrom(r.view, r.state);
      const want = new Set(grid.counts.map((c) => `${c.placeId}|${c.tick}`));
      const absences = r.state.found
        .map((id) => r.view.findableById.get(id))
        .flatMap((c) => c?.establishes ?? [])
        .filter((f) => f.kind === 'absentFrom');
      for (const f of absences) for (const t of f.ticks) if (!want.has(`${f.place}|${t}`)) problems.push(`${r.label}: absence ${f.place} ${t} not counted`);
      const text = renderGridText(r.view, r.state);
      const rows = text.split('\n');
      const start = rows.findIndex((l) => l.startsWith('counted'));
      if (want.size === 0) continue;
      let cells = 0;
      for (let i = start; i < rows.length && (i === start || rows[i]?.startsWith(' ')); i++) cells += ((rows[i] ?? '').match(/\S+=\d+/g) ?? []).length;
      if (cells !== want.size) problems.push(`${r.label}: ${cells} counted cells for ${want.size} counts`);
    }
    expect(problems).toEqual([]);
  });
});

describe('8. "accounted for" is who the notebook clears, at every tier', () => {
  it('lists everybody two agreeing facts keep away from the scene, on every page of every night', () => {
    let nonEmpty = 0;
    for (const r of runs()) {
      if (!r.view.kase.logic) continue;
      const { view } = r;
      const found: Id[] = [];
      for (const page of r.state.log) {
        found.push(...page.found);
        const snap = { ...r.state, found: [...found], log: r.state.log.slice(0, page.n + 1) };
        const book = buildNotebook(view, snap);
        const two = accountedFor(view, found);
        for (const id of two) expect(book.established.cleared, r.label).toContain(personName(view, id));
        // Whatever a page says "That cleared X" of, the panel lists too.
        for (const id of clearedOnTwo(view, found).keys()) expect(two).toContain(id);
        // Never the one who did it.
        expect(two).not.toContain(view.kase.solution.killerId);
        if (two.length > 0) nonEmpty++;
      }
    }
    expect(nonEmpty).toBeGreaterThan(0);
  });
});

describe('9. nobody is offered an evening they have none of', () => {
  it('offers "their evening" only to somebody with an account, in a tiered case', () => {
    for (const r of runs()) {
      if (!r.view.kase.logic) continue;
      const s = r.state.reportOpen ? { ...r.state, reportOpen: false } : r.state;
      for (const g of choicesFor(r.view, s)) {
        if (g.kind !== 'ask' || !g.personId) continue;
        const evening = g.choices.some((c) => /about that evening$/.test(c.command));
        if (evening) expect(accountClueOf(r.view, g.personId), r.label).not.toBeNull();
      }
    }
  });
});

describe('10. what the pages say agrees with itself', () => {
  it('never says a zero count names anybody', () => {
    const cards = thoughtDeck.filter((c) => c.tags.basis === 'empty');
    expect(cards.length).toBeGreaterThan(1);
    for (const c of cards) expect(c.text).not.toMatch(/named|short list/);
  });

  it('writes a dead-by thought as "by then", never as "before then"', () => {
    for (const c of thoughtDeck as { id: string; text: string; tags: Record<string, string> }[]) {
      if (c.tags.basis !== 'dead-by') continue;
      expect(c.text, c.id).not.toMatch(/before (?:then|that|it)\b|came earlier/);
    }
  });

  it("keeps murder words out of thoughts a mundane case can be dealt", () => {
    for (const c of thoughtDeck as { id: string; text: string; tags: Record<string, string> }[]) {
      if ((c.tags.case ?? 'any') !== 'any') continue;
      expect(c.text.replace(/dead end/g, ''), c.id).not.toMatch(/\{victim\} gone|\b(?:killed|killer|murder(?:ed)?|dead|corpse|died)\b/);
    }
  });

  it('gives one rival for one heart, one age band for one face, and one direction to one debt', () => {
    for (const c of CONFIGS) {
      for (let seed = 1; seed <= 30; seed++) {
        const kase = viewOf(c, seed).kase;
        for (const p of kase.people) {
          if (p.motive?.type === 'jealousy') {
            const over = /over (.+)$/.exec(p.motive.description)?.[1];
            const tie = p.dossier?.layers.find((l) => l.kind === 'tie')?.text ?? '';
            if (over && /separated over|divorced over|came along|turned .* down|sweet on/.test(tie)) expect(tie, `${c.label} ${seed}`).toContain(over);
          }
          if (p.motive?.type === 'debt' && OWED_TO_TIES.includes(p.relationshipId ?? '')) {
            expect(p.motive.description, `${c.label} ${seed}`).toMatch(/^was owed/);
          }
        }
        for (const clue of kase.findable) {
          const text = clue.textRecord ?? clue.text;
          expect(text, `${c.label} ${seed} ${clue.id}`).not.toMatch(/says there was [^.]* I know by sight/);
          for (const f of clue.establishes) {
            if (f.kind === 'describedAt' && /says there was/.test(text)) expect(text).toContain(f.description.text);
          }
        }
        for (const text of [kase.victimBio.discovery?.foundText ?? '', ...kase.findable.map((x) => x.textRecord ?? x.text)]) {
          for (const p of kase.people) {
            expect(text, `${c.label} ${seed}`).not.toMatch(new RegExp(`\\b${p.surname}\\b[^.:;]*\\bat ${p.surname}[’']s place`));
          }
        }
      }
    }
  });

  it('says what is somebody’s with a pronoun once they are named', () => {
    const people = [{ surname: 'Lefkowitz', gender: 'm' }, { surname: 'Ruggiero', gender: 'm' }];
    expect(ownerOnce('Lefkowitz was found at Lefkowitz’s place.', people)).toBe('Lefkowitz was found at his place.');
    expect(ownerOnce('Lefkowitz’s rooms at Lefkowitz’s place were quiet.', people)).toBe('Lefkowitz’s rooms were quiet.');
    expect(ownerOnce('Found at Lefkowitz’s place: a page in Lefkowitz’s file.', people)).toBe('Found at Lefkowitz’s place: a page in Lefkowitz’s file.');
    expect(ownerOnce('Lefkowitz told Ruggiero about Lefkowitz’s debts.', people)).toBe('Lefkowitz told Ruggiero about Lefkowitz’s debts.');
  });

  it('never has somebody in a cell who is out on the street', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const kase = viewOf(CONFIGS[6] as Config, seed).kase;
      const brief = JSON.stringify(kase.clientBrief) + JSON.stringify(kase.victimBio) + kase.findable.map((c) => c.text).join(' ');
      expect(brief).not.toMatch(/had somebody for it|since Tuesday/);
    }
  });
});

describe('11. every place that shows par and budget agrees', () => {
  it('prints the night’s own par and budget on the curtain, the clock and the closing', () => {
    for (const c of CONFIGS) {
      for (const seed of [1, 2]) {
        const view = viewOf(c, seed);
        const par = gamePar(view.kase);
        const budget = gameBudget(view.kase);
        const sheet = renderTruthSheet(view.kase);
        expect(sheet).toContain(`**Par** ${par} calls`);
        expect(sheet).toContain(`**Budget** ${budget} calls`);
        expect(sheet).not.toMatch(/, par \d+–\d+\)/);
        const pars = [...sheet.matchAll(/Par is \*\*(\d+) calls\*\*|Par route: .*?(\d+) calls/g)].map((m) => Number(m[1] ?? m[2]));
        for (const p of pars) expect(p).toBe(par);
        expect(clockStrip(0, budget).notches).toHaveLength(budget);
      }
    }
  });
});
