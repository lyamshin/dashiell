/**
 * M6 §8's heaviest test, shared by three files so vitest can run the three
 * difficulties side by side: every choice on every page of forty oracle runs
 * is parsed, run, and checked against its own button.
 */

import { generateCase, type Difficulty } from '../src/gen/index.js';
import type { Id } from '../src/gen/types.js';
import { choicesFor, openTargets } from '../src/game/choices.js';
import { minutesAfter } from '../src/game/clock.js';
import { buildView, gameBudget, peopleHereNow, type CaseView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { parse } from '../src/game/parser.js';
import { continuationOf, costOf, newRun, stepInput } from '../src/game/reducer.js';
import type { RunState } from '../src/game/types.js';

export const SEEDS = 40;

export function oracleStates(view: CaseView): { states: RunState[]; commands: string[] } {
  const run = playOracle(view);
  const states: RunState[] = [newRun(view, { detectiveName: 'Dashiell' })];
  for (const step of run.steps) {
    states.push(stepInput(states[states.length - 1] as RunState, step.command, view).state);
  }
  return { states, commands: run.steps.map((s) => s.command) };
}

const present = (view: CaseView, s: RunState): Id[] =>
  peopleHereNow(view, s.at, { clientInOffice: s.clientInOffice, found: s.found }).map((p) => p.id);

/** Every problem with every choice offered on the oracle's route, and how many were checked. */
export function walkChoices(difficulty: Difficulty): { problems: string[]; checked: number } {
  const problems: string[] = [];
  let checked = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const view = buildView(generateCase(seed, { difficulty }));
    const budget = gameBudget(view.kase);
    const { states } = oracleStates(view);
    for (const [n, s] of states.entries()) {
      const targets = openTargets(view, s.found);
      const here = present(view, s);
      for (const group of choicesFor(view, s)) {
        for (const c of [...group.choices, ...(group.more ?? [])]) {
          checked++;
          const where = `d${difficulty} seed ${seed} state ${n} "${c.command}"`;
          const parsed = parse(view, s.at, c.command, here, s.found);
          if (!parsed.ok) {
            problems.push(`${where}: does not parse (${parsed.problem.message})`);
            continue;
          }
          const first = stepInput(s, c.command, view);
          // M10 §A.3: an answer told over two pages is one answer; "Go on" is free.
          let after = first.state;
          const found = [...first.page.found];
          for (let more = continuationOf(view, after); more !== null; more = continuationOf(view, after)) {
            const next = stepInput(after, more, view);
            if (next.page.found.length === 0) break;
            after = next.state;
            found.push(...next.page.found);
          }
          const result = { state: after, page: { ...first.page, found } };
          // Accepted: no refusal page, and a question put to somebody
          // who is actually standing here.
          if (parsed.command.kind === 'ask' && !here.includes(parsed.command.personId)) {
            problems.push(`${where}: asks somebody who is not here`);
          }
          const moved =
            minutesAfter(result.state.actionsUsed, budget) - minutesAfter(s.actionsUsed, budget);
          if (moved !== c.minutes) problems.push(`${where}: said ${c.minutes} min, moved ${moved}`);
          if (costOf(c.command, s, view) !== result.page.cost) {
            problems.push(`${where}: costOf disagrees with step`);
          }
          // The mark: a go is a lead when a lead is in the room it goes
          // to; anything else is a lead when what it fetches is one.
          const volunteered = result.state.volunteered.filter((id) => !s.volunteered.includes(id));
          const took =
            group.kind === 'go'
              ? s.threads.some((t) => t.placeId === result.state.at)
              : result.page.found.some((id) => targets.has(id) && !volunteered.includes(id));
          if (group.kind !== 'free' && took !== c.lead) {
            problems.push(`${where}: marked ${c.lead}, takes a lead ${took}`);
          }
        }
      }
    }
  }
  return { problems, checked };
}
