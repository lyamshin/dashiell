/**
 * The same measurement as `plain-ratio.mjs`, computed from `page.blocks` alone
 * so that it can be run against an engine that does not carry the counts —
 * which is every engine before M5. A sentence is image when its block came off
 * an image-bearing deck (transition, arrival, place, portrait, approach,
 * ambient, aside) and plain otherwise. That is the block-level approximation
 * of §1's rule, and running it on both trees is how the notes get a
 * before-and-after out of one classifier.
 */
import { generateCase } from '../src/gen/index.ts';
import { buildView } from '../src/game/derive.ts';
import { playOracle, playWandering } from '../src/game/oracle.ts';

const IMAGE = new Set(['transition', 'arrival', 'place', 'presence', 'approach', 'ambient', 'aside']);

const sentences = (text) => {
  const t = (text ?? '').trim();
  if (t.length === 0) return 0;
  const hits = t.match(/[.!?…]+(?=["”’')\]]*(\s|$))/g);
  return Math.max(1, hits?.length ?? 1);
};

const countPage = (page) => {
  let plain = 0;
  let image = 0;
  for (const b of page.blocks) {
    if (b.kind === 'prose') {
      const n = sentences(b.text);
      if (IMAGE.has(b.voice)) image += n;
      else plain += n;
    } else if (b.kind === 'note') plain += sentences(b.text);
    else if (b.kind === 'presence') plain += b.text ? sentences(b.text) : Math.max(1, b.personIds.length);
    else if (b.kind === 'timeline') plain += 1 + b.rows.filter((r) => r.placeId !== null).length;
  }
  return { plain, image };
};

let pages = 0;
let total = 0;
let under = 0;
let worst = 2;
const record = (state) => {
  for (const page of state.log) {
    const { plain, image } = countPage(page);
    const sum = plain + image;
    const ratio = sum === 0 ? 1 : plain / sum;
    pages++;
    total += ratio;
    if (ratio < worst) worst = ratio;
    if (ratio < 0.5) under++;
  }
};

for (const difficulty of [1, 2, 3]) {
  for (let seed = 1; seed <= 100; seed++) {
    record(playOracle(buildView(generateCase(seed, { difficulty }))).state);
  }
  for (let seed = 1; seed <= 40; seed++) {
    record(playWandering(buildView(generateCase(seed, { difficulty })), seed).state);
  }
}

process.stdout.write(
  `pages ${pages}\nmean  ${(total / pages).toFixed(4)}\nmin   ${worst.toFixed(4)}\nunder 0.5: ${under}\n`,
);
