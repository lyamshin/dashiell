/**
 * The three decks M4b §B.4 asks the content track for — `office.json`,
 * `entrances.json`, `hiring.json` — loaded if they are there and shrugged off
 * if they are not.
 *
 * They are being written on another branch while this one is being written, so
 * the engine must run before they land and pick them up the moment they do,
 * without a code change and without a build that fails on a missing file. A
 * static `import` of a file that does not exist is a compile error, so the
 * three are read at load time instead: `process.getBuiltinModule` is Node 22's
 * synchronous way to a builtin from an ES module, and it is simply absent in
 * the browser, where the whole attempt costs one `?.` and yields nothing.
 *
 * What a missing deck costs: the opening falls back to the two hand-written
 * lines in `voice-data.ts` and logs `missing-deck` on the page, which is the
 * gap log the content team already works from.
 *
 * **When the three decks land**, delete this file's reading and put three
 * ordinary `import … from '../../../content/decks/office.json'` lines in
 * `cards.ts` beside the other fourteen. That is the only thing standing
 * between the browser build and these decks; nothing else has to change,
 * because everything downstream reads `OPTIONAL_DECKS`.
 */

export type OptionalDeckName = 'office' | 'entrances' | 'hiring';

export const OPTIONAL_DECK_NAMES: OptionalDeckName[] = ['office', 'entrances', 'hiring'];

const FILES: Record<OptionalDeckName, string> = {
  office: 'office.json',
  entrances: 'entrances.json',
  hiring: 'hiring.json',
};

function readDeckFile(file: string): unknown[] | null {
  try {
    const proc = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } })
      .process;
    const get = proc?.getBuiltinModule;
    if (typeof get !== 'function') return null;
    const fs = get.call(proc, 'node:fs') as
      | { readFileSync: (p: URL, enc: string) => string; existsSync: (p: URL) => boolean }
      | undefined;
    if (!fs) return null;
    const url = new URL(`../../../content/decks/${file}`, import.meta.url);
    if (!fs.existsSync(url)) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(url, 'utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const loaded: Partial<Record<OptionalDeckName, unknown[]>> = {};
const missing: OptionalDeckName[] = [];

for (const name of OPTIONAL_DECK_NAMES) {
  const cards = readDeckFile(FILES[name] as string);
  if (cards === null) missing.push(name);
  else loaded[name] = cards;
}

/** The cards of whichever of the three are on disk. Absent decks are empty. */
export const OPTIONAL_DECKS: Record<OptionalDeckName, unknown[]> = {
  office: loaded.office ?? [],
  entrances: loaded.entrances ?? [],
  hiring: loaded.hiring ?? [],
};

/** Which of the three were not there. Reported by the loader and on the page. */
export const MISSING_OPTIONAL_DECKS: readonly OptionalDeckName[] = missing;
