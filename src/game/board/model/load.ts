/**
 * docs/50: loading the export over `fetch`, in the page or in a worker.
 *
 * The export is two files (`model/export.py`): the int8 weights and a JSON
 * header. They live in `model/export/` in the repo, outside `public/`, so the
 * built book doesn't carry them; whoever loads the model says where they are
 * (the dev server serves `model/export/` as `/model/export/`).
 */

import { TinyLM, type ModelHeader } from './gpt.js';

/** The export's two files, by name, in whatever directory `base` points at. */
export const MODEL_FILES = { header: 'dashiell.json', weights: 'dashiell.bin' } as const;

/** Load the export over `fetch` from `base`, a URL or path ending in "/" (e.g. "/model/export/"). */
export async function fetchModel(base: string, f: typeof fetch = fetch): Promise<TinyLM> {
  const dir = base.endsWith('/') ? base : `${base}/`;
  const [h, b] = await Promise.all([f(`${dir}${MODEL_FILES.header}`), f(`${dir}${MODEL_FILES.weights}`)]);
  if (!h.ok || !b.ok) throw new Error(`model: could not fetch the export from ${dir} (${h.status}, ${b.status})`);
  const header = (await h.json()) as ModelHeader;
  return new TinyLM(header, await b.arrayBuffer());
}
