/**
 * M6 §2 — the errand line: why the detective came.
 *
 * Derived, never invented. On arriving at a place the engine looks at the
 * open leads that point there, finds the clue already in the notebook that
 * opened each one, and builds the reason from the two: **because** somebody
 * said it, a paper named it, or a thing found somewhere pointed here; **for**
 * whatever the lead's shape says there is to do. What comes out is a plan —
 * the deck tags and the slot values — and `composePage` deals the card. The
 * same plan rides on the page as its `ErrandTrace`, and the correspondence
 * checker walks it back to the notebook.
 *
 * Pure. Nothing in here touches the dealer or the document.
 */

import type { Clue, Id } from '../gen/types.js';
import type { CaseView } from './derive.js';
import type { ErrandTrace, RunState } from './types.js';

export type ErrandPlan = Omit<ErrandTrace, 'text'>;

const fold = (s: string): string => s.toLowerCase().replace(/[’']/g, "'");

/** Does `text` name `needle` as a whole phrase? */
function names(text: string, needle: string): boolean {
  const hay = fold(text);
  const n = fold(needle);
  let from = 0;
  for (;;) {
    const i = hay.indexOf(n, from);
    if (i < 0) return false;
    const before = hay.charAt(i - 1);
    const after = hay.charAt(i + n.length);
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    from = i + 1;
  }
}

/** The first person a generated topic string names, if it names one. */
function firstPersonIn(view: CaseView, text: string): Id | null {
  let best: { at: number; id: Id } | null = null;
  const hay = fold(text);
  for (const p of view.kase.people) {
    const n = fold(p.surname);
    const at = hay.indexOf(n);
    if (at < 0) continue;
    if (/[a-z]/.test(hay.charAt(at - 1)) || /[a-z]/.test(hay.charAt(at + n.length))) continue;
    if (best === null || at < best.at) best = { at, id: p.id };
  }
  return best?.id ?? null;
}

/** Why the paper or the thing counts as a document rather than a find. */
function becauseOf(clue: Clue): 'said' | 'document' | 'found' {
  if (clue.source.type === 'person') return 'said';
  return clue.kind === 'document' || clue.kind === 'morgue' ? 'document' : 'found';
}

/**
 * The newest clue in the notebook that opened a lead on `targetId`: a found
 * clue whose `leadsTo` includes it. Newest is last found.
 */
export function openerOf(view: CaseView, found: readonly Id[], targetId: Id): { clue: Clue; at: number } | null {
  for (let i = found.length - 1; i >= 0; i--) {
    const clue = view.findableById.get(found[i] as Id);
    if (clue && clue.leadsTo.includes(targetId)) return { clue, at: i };
  }
  return null;
}

/**
 * What the lead's shape says there is to do.
 *
 * A question about somebody else is `ask-person`; a question about the
 * person's own evening, or "their account", is `ask-evening`; a thing or a
 * place in the topic makes it about that; anything else — an hour, "the lock"
 * — is asked about by the lead's own words, which the notebook's lead list
 * prints verbatim.
 */
function forOf(
  view: CaseView,
  source: Clue,
  target: Clue,
  here: Id,
): { for: ErrandTrace['for']; slots: Record<string, string> } {
  if (target.source.type === 'place') {
    // A thing the sending clue named, sitting in this room: go through that.
    // Only a thing the notebook already holds, which the sending clue's own
    // words are.
    const thing = view.kase.objects.find(
      (o) => o.homePlace === here && names(source.textRecord ?? source.text, o.name),
    );
    if (thing) return { for: 'search-thing', slots: { subject: thing.name } };
    return { for: 'search-room', slots: {} };
  }
  const asked = view.personById.get(target.source.personId);
  const who = asked?.surname ?? '';
  const topic = target.source.topic;
  const named = firstPersonIn(view, topic);
  if (named !== null && named !== target.source.personId) {
    return {
      for: 'ask-person',
      slots: { who, subject: view.personById.get(named)?.surname ?? '' },
    };
  }
  if (named !== null || /evening|account/i.test(topic)) {
    return { for: 'ask-evening', slots: { who, subject: who } };
  }
  const thing = view.kase.objects.find((o) => names(topic, o.name));
  if (thing) return { for: 'ask-thing', slots: { who, subject: thing.name } };
  const place = view.places.find((p) => names(topic, p.shortName));
  if (place) return { for: 'ask-place', slots: { who, subject: place.shortName } };
  return { for: 'ask-thing', slots: { who, subject: topic } };
}

/**
 * The errand for a walk to `to`. `firstSight` is the first arrival at the
 * start room, where the client's pointer is the reason (§2.2).
 */
export function planErrand(
  view: CaseView,
  state: Pick<RunState, 'found' | 'threads' | 'log' | 'searched' | 'at'>,
  to: Id,
  firstSight: boolean,
): ErrandPlan {
  const place = view.placeById.get(to);
  const here = place?.shortName ?? '';

  if (to === view.office.id) {
    return { because: 'office', for: 'none', kind: 'office', leads: 0, slots: { place: here } };
  }

  const leads = state.threads.filter((t) => t.placeId === to);

  if (firstSight) {
    // The client said where it happened, or where it was found. The scene
    // opening follows and hands over the report; this only says why.
    const clientClue = state.found
      .map((id) => view.findableById.get(id))
      .find((c): c is Clue => c?.kind === 'client');
    const first = view.kase.starting
      .map((id) => view.findableById.get(id))
      .find((c): c is Clue => c !== undefined && c.kind !== 'client');
    return {
      because: 'said',
      for: 'search-room',
      kind: 'scene',
      ...(clientClue ? { sourceId: clientClue.id } : {}),
      ...(first ? { targetId: first.id } : {}),
      leads: leads.length,
      slots: { name: view.client.surname, place: here },
    };
  }

  // The lead whose opener is newest wins (§2.1 step 2).
  let best: { source: Clue; target: Clue; at: number } | null = null;
  for (const thread of leads) {
    const target = view.findableById.get(thread.clueId);
    if (!target) continue;
    const opener = openerOf(view, state.found, target.id);
    if (!opener) continue;
    if (best === null || opener.at > best.at) best = { source: opener.clue, target, at: opener.at };
  }

  if (best) {
    const because = becauseOf(best.source);
    const shape = forOf(view, best.source, best.target, to);
    const slots: Record<string, string> = { ...shape.slots, place: here };
    if (because === 'said' && best.source.source.type === 'person') {
      slots.name = view.personById.get(best.source.source.personId)?.surname ?? '';
    } else if (best.source.source.type === 'place') {
      slots.from = view.placeById.get(best.source.source.placeId)?.shortName ?? '';
    }
    return {
      because,
      for: shape.for,
      kind: 'lead',
      sourceId: best.source.id,
      targetId: best.target.id,
      leads: leads.length,
      slots,
    };
  }

  const visited = state.log.some((p) => p.at === to);
  if (visited) {
    return {
      because: 'return',
      for: 'none',
      kind: 'return',
      leads: 0,
      searched: state.searched.includes(to),
      slots: { place: here },
    };
  }
  return { because: 'none', for: 'none', kind: 'none', leads: 0, slots: { place: here } };
}

/** §2.2: two leads here, and the page names the newest and nods at the other. */
export const OTHER_THING = 'And there was the other thing.';
