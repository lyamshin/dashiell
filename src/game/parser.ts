/**
 * The prompt.
 *
 * One rule above all the others: nothing the player types by mistake costs an
 * action. Every failure here returns a `ParseProblem`, and the reducer charges
 * nothing for a problem. A misspelling, an ambiguity, a verb the book does not
 * know, a man who is not in the room — all free.
 */

import type { Id } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { peopleHere, topicKey, victimReachable } from './derive.js';
import type { ParseResult, TopicRef } from './types.js';

const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Words too common to identify a place by. */
const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'at',
  'on',
  'in',
  'to',
  'and',
  'with',
  'under',
  'outside',
  'over',
  'no',
  'north',
  'south',
  'east',
  'west',
  'end',
  'back',
  'room',
  'house',
  'that',
  'it',
  'its',
  "it's",
  'sign',
]);

const VERBS: { words: string[]; kind: string }[] = [
  { words: ['go', 'goto', 'walk', 'head', 'travel', 'visit'], kind: 'go' },
  { words: ['ask', 'question', 'interview', 'talk', 'speak'], kind: 'ask' },
  { words: ['examine', 'search', 'inspect', 'x', 'check', 'toss'], kind: 'examine' },
  { words: ['look', 'l'], kind: 'look' },
  { words: ['notebook', 'notes', 'n'], kind: 'notebook' },
  { words: ['file', 'report'], kind: 'file' },
  { words: ['help', 'commands', '?'], kind: 'help' },
  { words: ['put', 'confront'], kind: 'confront' },
];

function verbOf(word: string): string | null {
  for (const v of VERBS) if (v.words.includes(word)) return v.kind;
  return null;
}

interface Candidate<T> {
  value: T;
  label: string;
  /** 3 exact, 2 whole-word, 1 prefix. */
  strength: number;
}

function best<T>(cands: Candidate<T>[]): Candidate<T>[] {
  if (cands.length === 0) return [];
  const top = Math.max(...cands.map((c) => c.strength));
  const kept = cands.filter((c) => c.strength === top);
  const seen = new Set<string>();
  return kept.filter((c) => {
    const k = JSON.stringify(c.value);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function score(needle: string, hay: string[]): number {
  let out = 0;
  for (const h of hay) {
    const f = fold(h);
    if (f === needle) return 3;
    const words = f.split(' ').filter((w) => !STOP.has(w));
    if (words.includes(needle)) out = Math.max(out, 2);
    if (needle.length >= 3 && (f.startsWith(needle) || words.some((w) => w.startsWith(needle))))
      out = Math.max(out, 1);
  }
  return out;
}

export function matchPeople(view: CaseView, text: string): Candidate<Id>[] {
  const n = fold(text);
  if (n.length === 0) return [];
  const out: Candidate<Id>[] = [];
  if (n === 'the victim' || n === 'victim') {
    out.push({ value: view.victim.id, label: view.victim.surname, strength: 3 });
  }
  if (n === 'the client' || n === 'client') {
    out.push({ value: view.client.id, label: view.client.surname, strength: 3 });
  }
  for (const p of view.kase.people) {
    const s = score(n, [p.surname, p.name, ...p.name.split(/\s+/)]);
    if (s > 0) out.push({ value: p.id, label: p.surname, strength: s });
  }
  return best(out);
}

export function matchPlaces(view: CaseView, text: string): Candidate<Id>[] {
  const n = fold(text);
  if (n.length === 0) return [];
  // A place's own short name, the one every "Go to" button prints, is never
  // ambiguous: "go the office" is the detective's office even when a named
  // place (the office over the Imperial) also answers to "the office".
  const own = view.places.find((p) => fold(p.shortName) === n);
  if (own) return [{ value: own.id, label: own.shortName, strength: 3 }];
  const out: Candidate<Id>[] = [];
  for (const p of view.places) {
    // A named place answers to every form it goes by (content/places/rules.md §2.7).
    const s = score(n, p.names ? [p.shortName, p.name, p.names.short, ...p.names.local, p.names.bare] : [p.shortName, p.name]);
    if (s > 0) out.push({ value: p.id, label: p.shortName, strength: s });
  }
  return best(out);
}

export function matchObjects(view: CaseView, text: string): Candidate<Id>[] {
  const n = fold(text);
  if (n.length === 0) return [];
  const out: Candidate<Id>[] = [];
  for (const o of view.kase.objects) {
    const s = score(n, [o.name]);
    if (s > 0) out.push({ value: o.id, label: o.name, strength: s });
  }
  return best(out);
}

function matchAnchors(view: CaseView, text: string): Candidate<Id>[] {
  const n = fold(text);
  if (n.length === 0) return [];
  const out: Candidate<Id>[] = [];
  for (const a of view.kase.anchors) {
    const s = score(n, [a.name]);
    if (s > 0) out.push({ value: a.templateId, label: a.name, strength: s });
  }
  return best(out);
}

/**
 * A topic. Exact generator prose wins — that is what a lead prints, and a lead
 * the player clicks must never be ambiguous. Then the fixed phrases, then the
 * nouns of the case.
 */
export function matchTopics(
  view: CaseView,
  personId: Id,
  text: string,
): Candidate<TopicRef>[] {
  const n = fold(text);
  if (n.length === 0) return [];

  for (const [topic, clues] of view.exactBuckets.get(personId) ?? []) {
    if (fold(topic) === n && clues.length > 0)
      return [{ value: { kind: 'exact', personId, topic }, label: topic, strength: 3 }];
  }

  if (n === 'that evening' || n === 'the evening' || n === 'evening' || n === 'their evening')
    return [{ value: { kind: 'evening' }, label: 'that evening', strength: 3 }];
  // M5 §3. A pseudo-clue like "that evening", and typed the same way.
  if (
    n === 'themselves' ||
    n === 'themself' ||
    n === 'himself' ||
    n === 'herself' ||
    n === 'them' ||
    n === 'himself or herself' ||
    n === 'who they are' ||
    n === 'their life'
  )
    return [{ value: { kind: 'self' }, label: 'themselves', strength: 3 }];
  if (n === 'why i was hired' || n === 'the case' || n === 'why i am here')
    return [{ value: { kind: 'hire' }, label: 'why I was hired', strength: 3 }];

  const out: Candidate<TopicRef>[] = [];
  for (const c of matchPeople(view, text))
    out.push({ value: { kind: 'person', id: c.value }, label: c.label, strength: c.strength });
  for (const c of matchPlaces(view, text))
    out.push({ value: { kind: 'place', id: c.value }, label: c.label, strength: c.strength });
  for (const c of matchObjects(view, text))
    out.push({ value: { kind: 'object', id: c.value }, label: c.label, strength: c.strength });
  for (const c of matchAnchors(view, text))
    out.push({ value: { kind: 'anchor', id: c.value }, label: c.label, strength: c.strength });

  // Two different kinds of thing with the same name is not an ambiguity worth
  // a page: they answer the same question.
  const kept = best(out);
  const keys = new Set(kept.map((c) => topicKey(c.value)));
  if (keys.size <= 1) return kept.slice(0, 1);
  return kept;
}

/**
 * `present` is who is standing in the room, which the reducer knows and this
 * does not: the client is in the office on page one and at his own address
 * from the moment he leaves (M4b §B.2). Left out, it falls back to the
 * generator's own placement, which is right on every page but the first.
 */
export function parse(
  view: CaseView,
  at: Id,
  raw: string,
  present?: Id[],
  found: readonly Id[] = [],
): ParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0)
    return { ok: false, problem: { kind: 'empty', message: '' } };

  // M10 §A.3: "Go on" continues the conversation a page broke off. It is not
  // a walk to somewhere called "on".
  if (/^(?:go on|continue|keep going|and then|go on then)$/.test(fold(trimmed).trim().replace(/\s+/g, ' '))) {
    return { ok: true, command: { kind: 'continue' } };
  }

  // M12 Part 2: "go over what I have" — the detective takes stock. It is not
  // a walk to somewhere called "over".
  if (
    /^(?:go over (?:what i have|it|it all|what i've got|what i got|the notebook|my notes)|recap|take stock|think|think it over|sum up)$/.test(
      fold(trimmed).trim().replace(/\s+/g, ' ').replace(/[’`]/g, "'"),
    )
  ) {
    return { ok: true, command: { kind: 'recap' } };
  }

  // M11 §A.5: "ask Hauck who's here" — the client names the room. "who's
  // here" on its own asks whoever can say, which is only ever the client.
  {
    const folded = fold(trimmed).trim().replace(/\s+/g, ' ');
    const m = /^(?:(?:ask|talk to) (.+?) )?(?:who'?s here|who is here|who all is here|who these people are|who's in the room|who is in the room)\??$/.exec(folded);
    if (m) {
      const named = m[1];
      if (named === undefined) return { ok: true, command: { kind: 'rundown' } };
      const hit = matchPeople(view, named);
      if (hit.some((c) => c.value === view.client.id)) return { ok: true, command: { kind: 'rundown' } };
    }
  }

  const words = fold(trimmed).split(' ');
  const head = words[0] as string;
  let verb = verbOf(head);
  let rest = words.slice(1).join(' ');

  // "talk to Doyle about X", "look around the bar", "look at the desk",
  // "go to the speakeasy", "head over to Kaplan's".
  if (verb === 'ask' && (rest.startsWith('to ') || rest.startsWith('with '))) {
    rest = rest.slice(rest.indexOf(' ') + 1);
  }
  if (verb === 'go' && (rest.startsWith('to ') || rest.startsWith('over to '))) {
    rest = rest.slice(rest.indexOf('to ') + 3);
  }
  if (verb === 'look') {
    const preposition = /^(around|at|in|into|through|over|inside)\b\s*(.*)$/.exec(rest);
    if (preposition) {
      verb = 'examine';
      rest = (preposition[2] ?? '').trim();
    } else if (rest.length > 0) {
      verb = 'examine';
    }
  }

  if (verb === null) {
    // A bare noun is a fair guess at a place: "the speakeasy".
    const place = matchPlaces(view, trimmed);
    if (place.length === 1 && (place[0] as Candidate<Id>).strength === 3) {
      return { ok: true, command: { kind: 'go', placeId: (place[0] as Candidate<Id>).value } };
    }
    return {
      ok: false,
      problem: {
        kind: 'unknown-verb',
        message: `I don’t know how to ${head}. Type help and I’ll list what I do know.`,
      },
    };
  }

  switch (verb) {
    case 'confront': {
      // M9 §3: "put <fact> to <name>", or "confront <name> with <fact>". The
      // fact is a clue in the notebook, by its id: the book's picker types it.
      // M9 polish: "put x012 part 2 to Hauck" puts one fact of the line, the
      // clue's third part (`Clue.ruleParts`).
      const put = /^(\S+)(?: part (\d+))? to (.+)$/.exec(rest);
      const con = /^(.+?) with (\S+)(?: part (\d+))?$/.exec(rest);
      const clueText = head === 'put' ? put?.[1] : con?.[2];
      const partText = head === 'put' ? put?.[2] : con?.[3];
      const whoText = head === 'put' ? put?.[3] : con?.[1];
      if (!clueText || !whoText)
        return { ok: false, problem: { kind: 'incomplete', message: 'Put what to whom?' } };
      const who = matchPeople(view, whoText);
      if (who.length !== 1)
        return {
          ok: false,
          problem: { kind: 'unknown-noun', message: `There’s nobody called ${whoText} in this case.` },
        };
      const personId = (who[0] as Candidate<Id>).value;
      const part = partText === undefined ? undefined : Number(partText);
      const clueId = found.find((id) => id.toLowerCase() === clueText.toLowerCase());
      if (clueId === undefined)
        return {
          ok: false,
          problem: { kind: 'unknown-noun', message: 'That isn’t anything written in the notebook.' },
        };
      const here = present ?? peopleHere(view, at, found).map((p) => p.id);
      if (!here.includes(personId)) {
        return {
          ok: false,
          problem: {
            kind: 'absent-person',
            message: `${(who[0] as Candidate<Id>).label} isn’t here.`,
            personId,
          },
        };
      }
      return { ok: true, command: { kind: 'confront', personId, clueId, ...(part === undefined ? {} : { part }) } };
    }
    case 'look':
      return { ok: true, command: { kind: 'look' } };
    case 'notebook':
      return { ok: true, command: { kind: 'notebook' } };
    case 'file':
      return { ok: true, command: { kind: 'file' } };
    case 'help':
      return { ok: true, command: { kind: 'help' } };
    case 'go': {
      if (rest.length === 0)
        return { ok: false, problem: { kind: 'incomplete', message: 'Go where?' } };
      const cands = matchPlaces(view, rest);
      if (cands.length === 0)
        return {
          ok: false,
          problem: { kind: 'unknown-noun', message: `There’s no ${rest} in this neighbourhood.` },
        };
      if (cands.length > 1)
        return {
          ok: false,
          problem: {
            kind: 'ambiguous',
            message: `Which one?`,
            options: cands.map((c) => `go ${c.label}`),
          },
        };
      return { ok: true, command: { kind: 'go', placeId: (cands[0] as Candidate<Id>).value } };
    }
    case 'examine': {
      if (rest.length === 0) return { ok: true, command: { kind: 'examine', placeId: at } };
      const objects = matchObjects(view, rest);
      const places = matchPlaces(view, rest);
      const strongest = Math.max(
        objects[0]?.strength ?? 0,
        places[0]?.strength ?? 0,
      );
      if (strongest === 0)
        return {
          ok: false,
          problem: { kind: 'unknown-noun', message: `There’s no ${rest} to go through.` },
        };
      const objHit = objects.filter((o) => o.strength === strongest);
      const placeHit = places.filter((p) => p.strength === strongest);
      if (objHit.length + placeHit.length > 1 && !(placeHit.length === 1 && objHit.length === 0)) {
        // Prefer an object that is actually in this room.
        const local = objHit.filter((o) => view.objectById.get(o.value)?.homePlace === at);
        if (local.length === 1)
          return {
            ok: true,
            command: { kind: 'examine', placeId: at, objectId: (local[0] as Candidate<Id>).value },
          };
        if (objHit.length + placeHit.length > 1)
          return {
            ok: false,
            problem: {
              kind: 'ambiguous',
              message: 'Which?',
              options: [...objHit, ...placeHit].map((c) => `examine ${c.label}`),
            },
          };
      }
      if (objHit.length === 1) {
        const objId = (objHit[0] as Candidate<Id>).value;
        const home = view.objectById.get(objId)?.homePlace;
        if (home !== at)
          return {
            ok: false,
            problem: {
              kind: 'unknown-noun',
              message: `${(objHit[0] as Candidate<Id>).label} isn’t here. Last it was at ${
                view.placeById.get(home ?? '')?.shortName ?? 'somewhere else'
              }.`,
            },
          };
        return { ok: true, command: { kind: 'examine', placeId: at, objectId: objId } };
      }
      const placeId = (placeHit[0] as Candidate<Id>).value;
      if (placeId !== at)
        return {
          ok: false,
          problem: {
            kind: 'unknown-noun',
            message: `You’d have to be at ${(placeHit[0] as Candidate<Id>).label} to go through it. Type go ${
              (placeHit[0] as Candidate<Id>).label
            }.`,
          },
        };
      return { ok: true, command: { kind: 'examine', placeId: at } };
    }
    case 'ask': {
      if (rest.length === 0)
        return { ok: false, problem: { kind: 'incomplete', message: 'Ask who, about what?' } };
      const idx = rest.indexOf(' about ');
      const whoText = idx < 0 ? rest : rest.slice(0, idx);
      const topicText = idx < 0 ? '' : rest.slice(idx + 7);
      const who = matchPeople(view, whoText);
      if (who.length === 0)
        return {
          ok: false,
          problem: { kind: 'unknown-noun', message: `There’s nobody called ${whoText} in this case.` },
        };
      if (who.length > 1)
        return {
          ok: false,
          problem: {
            kind: 'ambiguous',
            message: 'Which of them?',
            options: who.map((c) => `ask ${c.label} about ${topicText || 'that evening'}`),
          },
        };
      const personId = (who[0] as Candidate<Id>).value;
      // M5 §7. A murder's victim is on a slab and always was. A robbery's
      // owner is alive, and the engine may never say otherwise. A missing
      // person cannot be asked anything until the case has put them somewhere.
      if (personId === view.victim.id && !victimReachable(view.kase, found)) {
        const type = view.kase.act.type;
        return {
          ok: false,
          problem: {
            kind: 'unknown-noun',
            message:
              type === 'missing'
                ? `Nobody knows where ${view.victim.surname} is. That is the job.`
                : type === 'affair'
                  ? `${view.victim.surname} is not going to talk to anybody ${view.client.surname} is paying. Ask somebody else.`
                : `${view.victim.surname} is on a slab. Ask somebody else about ${view.victim.surname}.`,
          },
        };
      }
      const here = present ?? peopleHere(view, at, found).map((p) => p.id);
      if (!here.includes(personId)) {
        return {
          ok: false,
          problem: {
            kind: 'absent-person',
            message: `${(who[0] as Candidate<Id>).label} isn’t here.`,
            personId,
          },
        };
      }
      if (topicText.length === 0)
        return {
          ok: false,
          problem: {
            kind: 'incomplete',
            message: `Ask ${(who[0] as Candidate<Id>).label} about what?`,
            options: [`ask ${(who[0] as Candidate<Id>).label} about that evening`],
          },
        };
      const topics = matchTopics(view, personId, topicText);
      if (topics.length === 0)
        return {
          ok: false,
          problem: {
            kind: 'unknown-topic',
            message: `I wouldn’t know how to put ${topicText} to ${(who[0] as Candidate<Id>).label}.`,
            personId,
            topicText,
          },
        };
      if (topics.length > 1)
        return {
          ok: false,
          problem: {
            kind: 'ambiguous',
            message: 'Which?',
            options: topics.map((c) => `ask ${(who[0] as Candidate<Id>).label} about ${c.label}`),
          },
        };
      return {
        ok: true,
        command: { kind: 'ask', personId, topic: (topics[0] as Candidate<TopicRef>).value },
      };
    }
    default:
      return {
        ok: false,
        problem: { kind: 'unknown-verb', message: 'Type help and I’ll list what I do know.' },
      };
  }
}
