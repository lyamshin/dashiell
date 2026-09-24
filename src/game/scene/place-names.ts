import type { Place } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import type { Block, Page } from '../types.js';

/**
 * Place names on the page (content/places/rules.md §2). A tiered case's
 * places carry a drawn name set; running text says each place's local noun
 * form (`shortName`), and this pass makes the first mention of a place in a
 * night its proper form: "Stuyvesant Square" is "the benches by the dry
 * fountain in Stuyvesant Square" the first time, wherever that falls — the
 * office, an arrival, a recap — and never again that night.
 *
 * It works on the finished page, after every sheet and card has written its
 * words, so nothing that decides what a page says has to know about it. The
 * night so far is the log: a place already named on an earlier page is not
 * named again.
 */

/** The noun forms a place is mentioned by in running text, longest first. */
function mentionForms(place: Place): string[] {
  const n = place.names;
  if (!n) return [];
  const forms = [place.shortName, ...n.local.filter((l) => !/^(?:behind|over|under|by|across|up|upstairs)\b/i.test(l))];
  return [...new Set(forms)].filter((f) => f.length > 2).sort((a, b) => b.length - a.length);
}

/** Where a form first stands as a name in `text`, first letter either case. */
function findForm(text: string, form: string): number {
  const head = form.charAt(0);
  const alts = head.toLowerCase() === head.toUpperCase() ? [form] : [head.toLowerCase() + form.slice(1), head.toUpperCase() + form.slice(1)];
  let best = -1;
  for (const f of alts) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(f, from);
      if (i < 0) break;
      const before = i === 0 ? '' : (text[i - 1] ?? '');
      const after = text[i + f.length] ?? '';
      if (!/[A-Za-z’']/.test(before) && !/[A-Za-z-]/.test(after) && !(after === '’' || after === "'")) {
        if (best < 0 || i < best) best = i;
        break;
      }
      from = i + 1;
    }
  }
  return best;
}

function mentioned(text: string, place: Place): boolean {
  const n = place.names;
  if (!n) return false;
  if (findForm(text, n.proper) >= 0) return true;
  return mentionForms(place).some((f) => findForm(text, f) >= 0);
}

function textOf(block: Block): string | null {
  if (block.kind === 'prose' || block.kind === 'note') return block.text;
  if (block.kind === 'presence') return block.text ?? null;
  return null;
}

function withText(block: Block, text: string): Block {
  if (block.kind === 'prose' || block.kind === 'note') return { ...block, text };
  if (block.kind === 'presence') return { ...block, text };
  return block;
}

/**
 * The page's blocks with each place the night has not named yet named in
 * full at its first mention. `log` is the night's pages before this one.
 */
export function nameFirstMentions(view: CaseView, log: readonly Page[], blocks: Block[]): Block[] {
  // After the naming, a possessive on a name that is one already folds:
  // "Mock’s's sign" is Mock’s sign. (Before it, the doubled form is what keeps
  // the first mention from landing on a possessive.)
  return firstMentions(view, log, blocks).map((b) => {
    const text = textOf(b);
    return text === null ? b : withText(b, text.replace(/([’'])s['’]s\b/g, '$1s'));
  });
}

function firstMentions(view: CaseView, log: readonly Page[], blocks: Block[]): Block[] {
  const named = view.places.filter((p) => p.names !== undefined);
  if (named.length === 0) return blocks;
  const before = log.flatMap((p) => p.blocks.map(textOf).filter((t): t is string => t !== null)).join('\n');
  const todo = named.filter((p) => !mentioned(before, p));
  if (todo.length === 0) return blocks;
  const out = blocks.slice();
  // An anchor's name is not a place's: "the El going over" keeps its El.
  const anchors = view.kase.anchors.map((a) => a.name);
  for (const place of todo) {
    const proper = place.names?.proper as string;
    for (let b = 0; b < out.length; b++) {
      const text = textOf(out[b] as Block);
      if (text === null) continue;
      if (findForm(text, proper) >= 0) break;
      const seen = maskPlaces(text, anchors);
      let at = -1;
      let form = '';
      for (const f of mentionForms(place)) {
        const i = findForm(seen, f);
        if (i >= 0 && (at < 0 || i < at)) {
          at = i;
          form = f;
        }
      }
      if (at < 0) continue;
      const capital = /[A-Z]/.test(text.charAt(at)) && /(?:^|[.!?]\s+|[“"]\s*)$/.test(text.slice(0, at));
      const said = capital ? proper.charAt(0).toUpperCase() + proper.slice(1) : proper;
      // A name that ends on an aside ("…Street, the house with the fanlight")
      // closes it before the sentence goes on.
      const rest = text.slice(at + form.length);
      const close = proper.includes(', ') && /^ [a-z]/.test(rest) ? ',' : '';
      out[b] = withText(out[b] as Block, text.slice(0, at) + said + close + rest);
      break;
    }
  }
  return out;
}

/**
 * An epithet for a place the night has already named, that the night has not
 * used yet: "where the pigeons held court". The first one unused, so it takes
 * no draw from anybody's stream.
 */
export function freshEpithet(place: Place | undefined, log: readonly Page[]): string | undefined {
  const n = place?.names;
  if (!n || n.epithets.length === 0) return undefined;
  const before = log.flatMap((p) => p.blocks.map(textOf).filter((t): t is string => t !== null)).join('\n');
  // Never on the first mention, which the proper form has done the work of.
  if (!mentioned(before, place as Place)) return undefined;
  return n.epithets.find((e) => !before.includes(e));
}

/**
 * Every form the case's named places go by, longest first: what a check
 * that reads names or words out of prose takes out first. "Mrs. Kessler’s"
 * names a rooming house, not the landlady; "the Golden Rule" is a pawnshop,
 * not a rule of the book.
 */
export function placeFormsOf(places: readonly Place[]): string[] {
  const out = new Set<string>();
  for (const p of places) {
    const n = p.names;
    if (!n) continue;
    for (const f of [n.proper, p.shortName, n.short, ...n.local]) if (f.length > 2) out.add(f);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

/** `text` with every place form blanked, letter for letter, so indices still line up. */
export function maskPlaces(text: string, forms: readonly string[]): string {
  let out = text;
  for (const form of forms) {
    const head = form.charAt(0);
    for (const f of new Set([form, head.toUpperCase() + form.slice(1), head.toLowerCase() + form.slice(1)])) {
      if (!out.includes(f)) continue;
      out = out.split(f).join('§'.repeat(f.length));
    }
  }
  return out;
}

/** `text` with each proper form said as the place's running name: what a trace wrote. */
export function unnamePlaces(text: string, places: readonly Place[]): string {
  let out = text;
  for (const p of places) {
    const n = p.names;
    if (!n) continue;
    const cap = n.proper.charAt(0).toUpperCase() + n.proper.slice(1);
    const capShort = p.shortName.charAt(0).toUpperCase() + p.shortName.slice(1);
    out = out.split(cap).join(capShort).split(n.proper).join(p.shortName);
  }
  return out;
}
