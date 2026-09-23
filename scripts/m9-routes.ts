/**
 * M9 — a route through a tiered case for the browser check (`check-m9.mjs`):
 * the oracle's route, then one fact put to somebody that lands and one that
 * touches nothing, one stranger's sighting to link, and the report to file,
 * the crime column included. Read from the engine, the way a player who has
 * worked it out would file it.
 *
 *   npx tsx scripts/m9-routes.ts --seed 3 --tier 4 --level 2 > out/m9-route.json
 */

import { generateCase } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { gridFrom } from '../src/game/grid.js';
import { judgeConfront, confrontFacts, canConfront } from '../src/game/m9.js';
import { playOracle } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { columnFor, fieldsFor, truthReport, answerFor } from '../src/game/report-form.js';
import type { RunState } from '../src/game/types.js';

const argv = process.argv.slice(2);
const arg = (name: string, fallback: string): string => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] as string) : fallback;
};
const seed = Number(arg('seed', '3'));
const tier = Number(arg('tier', '4')) as 4 | 5;
const level = Number(arg('level', '2')) as 2;

const view = buildView(generateCase(seed, { tier, level }));
const commands = playOracle(view).steps.map((s) => s.command);
let state: RunState = newRun(view, { detectiveName: 'Dashiell' });
for (const c of commands) state = stepInput(state, c, view).state;

let right: { command: string; personId: string } | null = null;
let wrong: { command: string; personId: string } | null = null;
for (const c of view.kase.logic?.confrontations ?? []) {
  if (right) break;
  const person = view.personById.get(c.personId);
  const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
  if (!person || !at) continue;
  let trial = state;
  const extra: string[] = [];
  if (trial.at !== person.foundAt) {
    extra.push(`go ${at}`);
    trial = stepInput(trial, `go ${at}`, view).state;
  }
  if (!trial.accounts.includes(person.id)) {
    extra.push(`ask ${person.surname} about that evening`);
    trial = stepInput(trial, `ask ${person.surname} about that evening`, view).state;
  }
  if (!canConfront(view, trial, person.id)) continue;
  const facts = confrontFacts(view, trial, person.id);
  const hit = facts.find((f) => judgeConfront(view, trial, person.id, f.id).outcome !== 'wrong');
  const miss = facts.find((f) => judgeConfront(view, trial, person.id, f.id).outcome === 'wrong');
  if (!hit || !miss) continue;
  commands.push(...extra);
  right = { command: `put ${hit.id} to ${person.surname}`, personId: person.id };
  wrong = { command: `put ${miss.id} to ${person.surname}`, personId: person.id };
  commands.push(right.command, wrong.command);
  state = stepInput(stepInput(trial, right.command, view).state, wrong.command, view).state;
}

// A stranger's sighting to link: to the one it truly was, where the case says.
const grid = gridFrom(view, state);
const desc = grid.descriptions[0];
const truthTick = desc?.tick ?? 0;
const fact = desc
  ? view.findableById.get(desc.clueId)?.establishes.find((f) => f.kind === 'describedAt' && f.tick === desc.tick)
  : undefined;
const matches = fact && fact.kind === 'describedAt' ? fact.description.matches : [];
const wasId = matches.find((id) => view.truthOf.get(id)?.[truthTick] === desc?.placeId) ?? matches[0];
const was = wasId ? view.personById.get(wasId) : undefined;

const truth = truthReport(view);
const fields = fieldsFor(view).map((f) => ({ label: f.label, value: answerFor(truth, f.key) }));
const column = columnFor(view).map((c) => ({ label: c.label, personId: c.personId, value: truth.column?.[c.personId] ?? null }));

process.stdout.write(
  JSON.stringify(
    {
      seed,
      tier,
      level,
      commands,
      right,
      wrong,
      link: desc ? { key: desc.key, text: desc.text, tick: desc.tick, name: was?.surname ?? null } : null,
      fields,
      column,
    },
    null,
    2,
  ) + '\n',
);
