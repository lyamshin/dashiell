/**
 * `npm run story -- --seed 7 [--count 20] [--difficulty 2] [--tier 0..5|over-easy]
 *   [--level 1..4] [--type murder|robbery|missing] [--trope <id>] [--facts]`
 *
 * What really happened, as the closing page tells it, for one seed or a run of
 * them: the designer's way of reading stories in bulk. `--facts` prints under
 * each line the facts it rests on and the card it came from.
 */

import { CASE_TYPES, generateCase, type CaseType, type Difficulty } from '../gen/index.js';
import { TROPE_IDS } from '../gen/tropes/index.js';
import { storyOf, storyParagraphs, storyWords, type StoryFact } from '../game/story.js';
import { wrap } from '../game/transcript.js';
import { ignoreBrokenPipe, parseArgs, parseTierLevel } from './args.js';

ignoreBrokenPipe();

const { flags, values } = parseArgs(process.argv.slice(2));
const seed = Number(values.get('seed') ?? 1);
const count = Number(values.get('count') ?? 1);
const difficulty = Number(values.get('difficulty') ?? 2);
const type = values.get('type');
const trope = values.get('trope');
const dialFlags = parseTierLevel(values);

if (
  !Number.isInteger(seed) ||
  !Number.isInteger(count) ||
  count < 1 ||
  ![1, 2, 3, 4].includes(difficulty) ||
  dialFlags === null ||
  (type !== undefined && !(CASE_TYPES as string[]).includes(type)) ||
  (trope !== undefined && !TROPE_IDS.includes(trope))
) {
  process.stderr.write(
    'usage: npm run story -- --seed <integer> [--count N] [--difficulty 1|2|3|4] ' +
      '[--tier 0..5|over-easy] [--level 1..4] [--type murder|robbery|missing] [--trope <id>] [--facts]\n' +
      `  tropes: ${TROPE_IDS.join(', ')}\n`,
  );
  process.exit(1);
}

function factText(f: StoryFact): string {
  const { kind, ...rest } = f;
  return `${kind} ${JSON.stringify(rest)}`;
}

const out: string[] = [];
for (let s = seed; s < seed + count; s++) {
  const kase = generateCase(s, {
    difficulty: difficulty as Difficulty,
    ...(type === undefined ? {} : { type: type as CaseType }),
    ...(trope === undefined ? {} : { tropeId: trope }),
    ...dialFlags,
  });
  const story = storyOf(kase);
  out.push(
    `── case ${kase.seed} · difficulty ${kase.difficulty} · ${kase.act.type} · ${kase.act.tropeId} · ${storyWords(story)} words`,
    '',
  );
  if (flags.has('facts')) {
    for (const paragraph of story.paragraphs) {
      for (const line of paragraph) {
        out.push(wrap(line.text), `    [${line.beat} ${line.cardId}] ${line.facts.map(factText).join(' · ')}`);
      }
      out.push('');
    }
  } else {
    for (const paragraph of storyParagraphs(story)) out.push(wrap(paragraph), '');
  }
}
process.stdout.write(out.join('\n'));
