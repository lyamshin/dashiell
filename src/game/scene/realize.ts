/**
 * M8 — prose realization: the planned beats, rendered.
 *
 * Every beat the planner laid out is written from the decks and the engine's
 * own templates, in the order the plan gives, into paragraphs the golden would
 * recognise: the reason set apart, the place, who is in it, what was found,
 * what it means, and what to do next. Required beats are always written; the
 * only thing the length rule may take off is texture (§8).
 */

import type { Clue, Id, Person, Tick } from '../../gen/types.js';
import { MISSING_MEANS, MURDER_MEANS, ROBBERY_MEANS } from '../../gen/data/means.js';
import { windowOf } from './thought.js';
import { spokenClock } from '../../gen/types.js';
import type { Block, BeatTrace, ErrandTrace, ProseVoice } from '../types.js';
import { OTHER_THING } from '../errand.js';
import { hedged, restates, figuresIn, hourAgrees, introduceNames, nameables, pastTense, sentencesOf, stripHere, wordCount, isSubjectless, bandOf } from './text.js';
import { APPROACH, APPROACH_AGAIN, COUNT_WORDS, OUTDOOR_PLACES, RELATION_PLAIN, RELATION_WHY, SEARCH_THING_ACTS as THING_ACTS, isPluralPlace } from './lines.js';
import { clueAbout, layerCredit, layerOfClue, layerSentences } from '../voice/plain.js';
import type { Beat, Plan, PresencePerson } from './plan.js';
import type { Thought } from './thought.js';
import { m9Answer, whenSaid } from './testimony.js';
import { acquaintanceOf } from '../../gen/index.js';
import { pronounsOf, saidPlainly, toldOf, type Told } from './telling.js';
import type { Family } from './families.js';
import { verdictsOn } from '../m9.js';
import { temperOf } from '../voice/cast.js';
import {
  CARRIED_QUESTIONS,
  CARRIED_QUESTIONS_PLAIN,
  LEFT_ONE,
  LEFT_TWO,
  LOOKED_AGAIN,
  WROTE_IT_DOWN,
  MORGUE_LEADS,
  NOBODY_ELSE,
  NOBODY_HERE,
  NOTHING_ASKED,
  PRECINCT_LINES,
  SCENE_BODY,
  SCENE_BODY_AGAIN,
  SCENE_BODY_OUTSIDE,
  SCENE_MISSING,
  SCENE_ROBBERY,
  SEARCH_ROOM_ACTS,
  SIGHT_LINES,
  STOP_LINES,
} from '../voice-data.js';
import { fill, tagIs, tagOf, type Card, type Match, type Slots } from '../voice/cards.js';
import { genderHintOf, possessiveOf, pronounOf } from '../voice/cast.js';
import { dashiellLine, registerFor, speakClue, type AskKind } from '../voice/exchange.js';
import { spokenSpan, spokenSpans } from '../voice/facts.js';
import { findKindOf } from '../voice/facts.js';
import { SELF_ALREADY, SELF_QUESTIONS, briefingQuestion, pickShape } from '../voice/plain.js';
import { tidyPunctuation } from '../voice/prose.js';
import { knowsHim } from '../voice/roll.js';
import { clientLeavingLine } from '../voice/office.js';
import type { Scene, Stage } from '../voice/page.js';
import { hourBandOf } from '../voice/page.js';
import { NO_CONTEXT } from '../voice/motifs.js';
import { PLAIN_FLOOR, openingNote, opensOnSubject, pronounSubject, countSentences } from '../voice/plain.js';

/** §8: night pages have no hard ceiling below this. */
export const NIGHT_CEILING = 600;

/** §8: what the golden runs to, per shape. Under the low end, texture may be added. */
export const NIGHT_TARGETS: Record<string, [number, number]> = {
  arrive: [220, 350],
  return: [120, 280],
  search: [180, 280],
  ask: [180, 280],
  look: [80, 200],
};

/** Night Hone 1 §1: a question page under this many words gets its room's texture. */
export const ASK_TEXTURE_BELOW = 130;

/** §8: texture only, in this order. */
export const CUT_ORDER = ['simile', 'ambient', 'place', 'weather'] as const;

interface Para {
  text: string;
  voice: ProseVoice;
  clueId?: Id;
  /** Indexes into the plan's beats that wrote into this paragraph. */
  beats: number[];
  /** Texture, which the length rule may cut. */
  texture?: 'weather' | 'ambient' | 'simile' | 'place';
  /** §1's measurement: how many of its sentences came off an image card. */
  imageN?: number;
  /** The "I wrote it down" that opens the thinking. */
  noted?: boolean;
  /** Texture riding inside a paragraph of something else, and which beat it was. */
  riders?: { text: string; kind: 'weather' | 'ambient' | 'simile' | 'place'; beat: number }[];
}

export interface Realized {
  blocks: Block[];
  /** M5 §1's counts: sentences that carry no image, and sentences off an image card. */
  plain: number;
  image: number;
  traces: BeatTrace[];
  errand?: ErrandTrace;
  gaps: string[];
}

const DECADES: Record<number, string> = {
  1: 'teens',
  2: 'twenties',
  3: 'thirties',
  4: 'forties',
  5: 'fifties',
  6: 'sixties',
  7: 'seventies',
};

function fillTemplate(template: string, slots: Record<string, string | undefined>): string {
  let out = template;
  for (const m of new Set(template.match(/\{(\w+)\}/g) ?? [])) {
    const key = m.slice(1, -1);
    const value = slots[key];
    if (value === undefined || value.length === 0) return '';
    out = out.split(m).join(value);
  }
  if (/^\{/.test(template)) out = `${out.charAt(0).toUpperCase()}${out.slice(1)}`;
  return tidyPunctuation(out);
}

function capitalize(s: string): string {
  return s.length === 0 ? s : `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

function endStop(s: string): string {
  const t = s.trim();
  return /[.!?”"]$/.test(t) ? t : `${t}.`;
}

/**
 * Deal from a deck through a ladder, refusing any card whose text names an
 * hour the clock does not agree with (§7). Null when nothing fits, and the
 * caller logs the gap.
 */
function deal(
  stage: Stage,
  deck: Parameters<Stage['dealer']['draw']>[0],
  ladder: Match[],
  slots: Slots,
): { text: string; cardId: string } | null {
  // Night Hone 1 §4: a card that sends him into "the room" is not dealt out
  // of doors, and a card that calls the place "it" is not dealt for a place
  // whose name is plural ("the benches").
  const outdoors = OUTDOOR_PLACES.has(stage.at);
  const plural = typeof slots.place === 'string' && isPluralPlace(slots.place);
  const fitsPlace = (c: Card): boolean =>
    !(outdoors && c.tags.setting === 'indoor') &&
    !(!outdoors && c.tags.setting === 'outdoor') &&
    !(plural && c.tags.number === 'singular');
  const agrees = (c: Card): boolean => hourAgrees(c.text, stage.minutes) && fitsPlace(c);
  const drawn = stage.dealer.draw(
    deck,
    ladder.map((m) => (c: Card) => m(c) && agrees(c)),
    slots,
    true,
    // The night's sky: a card that names another is never dealt (M4b §A.5).
    NO_CONTEXT(stage.cast.roll.weather),
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

/**
 * M10 §A.3: a sentence that says who does or does not watch the door —
 * "Nobody was posted to mind who went down it", "There was no one to notice
 * who passed through".
 */
export const WATCH_CLAUSE =
  /\b(?:no ?one|nobody|nothing)\b[^.]*\b(?:posted|watch(?:ed|ing)?|mind(?:ed|s)?|notic(?:e|ed)|see who|saw who|kept track)\b/i;

/** The deck name a place is keyed under in `establish`. */
function placeKey(stage: Stage, placeId: Id): string {
  return placeId === stage.view.office.id ? 'office' : placeId;
}

export function realize(plan: Plan, stage: Stage, scene: Scene): Realized {
  const { view, cast, dealer } = stage;
  const gaps: string[] = [];
  const paras: Para[] = [];
  const traces: BeatTrace[] = plan.beats.map((b) => ({ kind: b.kind, required: b.required, rendered: false }));
  const place = view.placeById.get(stage.at);
  const here = place?.shortName ?? '';
  const victim = view.victim;
  const people = nameables(view);
  /** Who has been said who they are: on an earlier page, or already on this one. */
  const named = new Set<Id>(stage.namedBefore ?? []);
  let errand: ErrandTrace | undefined;
  /** A clock line waits for the paragraph after the reason (see `clock`). */
  let pendingClock: { text: string; beat: number } | null = null;
  /** M10: "I wrote it down." once a page, at the first note. */
  let notedOnce = false;
  /** M10: the family whose telling the paragraphs now belong to. */
  let lastFamily: { family: Family; told: Told | null } | null = null;

  const mark = (i: number, patch: Partial<BeatTrace>): void => {
    traces[i] = { ...(traces[i] as BeatTrace), rendered: true, ...patch };
  };
  const push = (para: Para): Para => {
    if (pendingClock && para.voice !== 'errand') {
      para.text = `${pendingClock.text} ${para.text}`;
      para.beats.unshift(pendingClock.beat);
      pendingClock = null;
    }
    paras.push(para);
    return para;
  };
  const last = (): Para | undefined => paras[paras.length - 1];
  /** Golden page 3: the things in the room, named and left, after the finds. */
  let pendingLeft: { text: string; beat: number } | null = null;
  const flushLeft = (): void => {
    if (!pendingLeft) return;
    push({ text: pendingLeft.text, voice: 'act', beats: [pendingLeft.beat] });
    pendingLeft = null;
  };

  const beats = plan.beats;
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i] as Beat;
    if (beat.kind !== 'find' && beat.kind !== 'act') flushLeft();
    switch (beat.kind) {
      /* ------------------------------------------------------ the clock */
      case 'clock': {
        const slots: Slots = beat.hour ? { hour: beat.hour } : {};
        const drawn = deal(stage, 'hours', [(c) => tagIs('hours', c, 'beat', beat.beat)], slots);
        const text =
          drawn?.text ??
          (beat.beat === 'hour'
            ? `It was past ${beat.hour}.`
            : beat.beat === 'two-left'
              ? 'Two calls left before eight.'
              : 'One call left before eight.');
        if (!drawn) gaps.push(`no-card: hours has nothing for ${beat.beat}; a hand-written line stood in`);
        pendingClock = { text, beat: i };
        mark(i, { tag: beat.beat, text });
        break;
      }

      /* ----------------------------------------------------- the reason */
      case 'errand': {
        if (beat.form === 'carry') {
          const c = beat.carry;
          const lead = c.lead ? 'yes' : 'no';
          const slots: Slots = { ...c.slots, victim: victim.surname };
          const drawn = deal(
            stage,
            'carry',
            [(card) => tagIs('carry', card, 'for', c.for) && tagIs('carry', card, 'lead', lead)],
            slots,
          );
          let text = drawn?.text ?? '';
          if (text.length === 0) {
            gaps.push(`no-card: carry has nothing for ${c.for} × ${lead}; a hand-written line stood in`);
            text = c.lead ? 'I had been pointed at it.' : 'No one sent me to it.';
          }
          push({ text, voice: 'errand', beats: [i] });
          mark(i, {
            tag: 'carry',
            ...(c.sourceId ? { clueIds: [c.sourceId] } : {}),
            ...(c.targetId ? { targetId: c.targetId } : {}),
          });
          break;
        }
        const plan = beat.plan;
        const searched = plan.searched === true ? 'yes' : 'no';
        const fits: Match = (c) =>
          tagIs('errand', c, 'because', plan.because) &&
          tagIs('errand', c, 'for', plan.for) &&
          (plan.because !== 'return' || tagIs('errand', c, 'searched', searched));
        const short: Match = (c) => fits(c) && tagOf('errand', c, 'bridged') === 'yes';
        const long: Match = (c) => fits(c) && tagOf('errand', c, 'bridged') !== 'yes';
        const ladder = beat.form === 'short' ? [short, long] : [long];
        const drawn = deal(stage, 'errand', ladder, { detective: stage.detectiveName, place: here, ...plan.slots });
        let text = drawn?.text ?? '';
        if (text.length === 0) {
          gaps.push(`no-card: errand has nothing for ${plan.because} × ${plan.for}; a hand-written line stood in`);
          text = plan.kind === 'office' ? `I went back to ${here} to think.` : 'Nobody sent me. I came to see.';
        }
        if (plan.kind === 'lead' && plan.leads === 2) text = `${text} ${OTHER_THING}`;
        push({ text, voice: 'errand', beats: [i] });
        mark(i, {
          tag: beat.form,
          ...(plan.sourceId ? { clueIds: [plan.sourceId] } : {}),
          ...(plan.targetId ? { targetId: plan.targetId } : {}),
        });
        errand = { ...plan, text };
        break;
      }

      /* ------------------------------------------------------ the place */
      case 'establish': {
        const key = placeKey(stage, beat.placeId);
        const watcher = beat.watcherId ? view.personById.get(beat.watcherId) : undefined;
        const owner = beat.ownerId ? view.personById.get(beat.ownerId) : undefined;
        // §3–§4: a watcher in the room is introduced by the presence line and
        // the arrival thought, so a card that names {watcher} is not dealt here.
        void watcher;
        const slots: Slots = { place: here, owner: owner?.surname };
        const drawn = deal(stage, 'establish', [(c) => tagIs('establish', c, 'place', key)], slots);
        const parts: string[] = [];
        if (drawn) parts.push(drawn.text);
        else {
          gaps.push(`no-card: establish has nothing for ${key}; the place's own name stood in`);
          parts.push(`${capitalize(place?.name.replace('{V}', victim.surname) ?? here)}.`);
        }
        // The weather comes first, on the walk up to the door (§1 lets the
        // establish paragraph hold it), and it is texture: only a card written
        // for tonight's sky, this kind of place and this hour.
        const weatherAt = beats.findIndex((b, j) => j > i && b.kind === 'texture' && b.texture === 'weather');
        let weather: { text: string; beat: number } | null = null;
        if (weatherAt >= 0) {
          const band = hourBandOf(stage.minutes);
          const kind = place?.kind ?? 'semi';
          const sky = (c: Card): boolean =>
            tagOf('arrivals', c, 'weather') === cast.roll.weather && tagIs('arrivals', c, 'hourBand', band);
          const w = deal(
            stage,
            'arrivals',
            [(c) => sky(c) && tagOf('arrivals', c, 'placeKind') === kind, (c) => sky(c) && tagIs('arrivals', c, 'placeKind', kind)],
            { place: here },
          );
          if (w && !isSubjectless(w.text) && figuresIn(w.text) === 0) {
            weather = { text: w.text, beat: weatherAt };
            mark(weatherAt, { tag: 'weather', text: w.text });
          }
        }
        const watchRole = place?.watcher ?? 'none';
        // M8 §3–§4: a watcher in the room is introduced once, by the presence
        // line and the arrival thought; the watch clause is folded into that
        // thought, never said here as well. Only an unwatched place — "nobody
        // minds who uses the stairs" — gets the clause in the place's paragraph.
        // M10 §A.3: the watch is stated once — never when the place's own card
        // already says nobody minds the door.
        const stated = WATCH_CLAUSE.test(parts[0] ?? '') || WATCH_CLAUSE.test(weather?.text ?? '');
        const watch =
          watchRole === 'none' && !stated
            ? deal(stage, 'watch', [(c) => tagIs('watch', c, 'watcher', 'none')], { place: here })
            : null;
        const precinct = beat.precinct ? PRECINCT_LINES[beat.precinct] : undefined;
        const given = beat.precinct !== undefined ? sceneGiven(stage) : '';
        const para = push({
          text: [weather?.text, parts[0], watch?.text, precinct, given]
            .filter((s): s is string => !!s && s.length > 0)
            .join(' '),
          voice: 'establish',
          beats: weather ? [i, weather.beat] : [i],
          imageN: (drawn ? countSentences(drawn.text) : 0) + (weather ? countSentences(weather.text) : 0),
          ...(weather ? { riders: [{ text: weather.text, kind: 'weather' as const, beat: weather.beat }] } : {}),
        });
        mark(i, {
          tag: key,
          placeIds: [beat.placeId],
          personIds: [beat.watcherId, beat.ownerId].filter((x): x is Id => x !== undefined),
          text: para.text,
        });
        break;
      }
      case 'return': {
        const drawn = deal(stage, 'return', [(c) => tagIs('return', c, 'placeKind', beat.placeKind)], { place: here });
        const text = drawn?.text ?? `I was back at ${here}.`;
        if (!drawn) gaps.push(`no-card: return has nothing for ${beat.placeKind}`);
        push({ text, voice: 'establish', beats: [i] });
        mark(i, { tag: beat.placeKind, placeIds: [beat.placeId], text });
        break;
      }

      /* -------------------------------------------------- who is here */
      case 'presence': {
        const lines: string[] = [];
        const he = pronounOf(victim);
        const victimSlots = {
          victim: victim.surname,
          he,
          him: he === 'she' ? 'her' : 'him',
          his: possessiveOf(victim),
          object: view.kase.act.taken?.name,
        };
        if (beat.scene) {
          const pool =
            beat.scene === 'body'
              ? place?.kind === 'public'
                ? SCENE_BODY_OUTSIDE
                : SCENE_BODY
              : beat.scene === 'body-again'
                ? SCENE_BODY_AGAIN
                : beat.scene === 'robbery'
                  ? SCENE_ROBBERY
                  : SCENE_MISSING;
          // The empty shelf is said once: by the find, when the opening report
          // carries it, and by this line only when nothing else will.
          const taken = view.kase.act.taken?.name ?? '§';
          const shelfFound =
            beat.scene === 'robbery' &&
            (plan.beats.some((b) => b.kind === 'establish' && b.precinct !== undefined) ||
              plan.beats.some(
                (b) => b.kind === 'find' && (view.findableById.get(b.clueId)?.text ?? '').includes(taken),
              ));
          const line = shelfFound ? '' : pickShape(dealer.random, pool, victimSlots);
          if (line.length > 0) lines.push(line);
          if (beat.people.length === 0 && (beat.scene === 'body' || beat.scene === 'body-again')) {
            lines.push(dealer.random.pick(NOBODY_ELSE));
          }
        }
        // Who is here is always said, if only that it is nobody (§3).
        if (lines.length === 0 && beat.people.length === 0) {
          lines.push(pickShape(dealer.random, NOBODY_HERE, { place: here }));
        }
        const opened = lines.length > 0 ? push({ text: lines.join(' '), voice: 'presence', beats: [i] }) : null;
        const texts: string[] = opened ? [opened.text] : [];
        for (const p of beat.people) {
          if (p.grouped) continue;
          const text = presenceLine(stage, p, named);
          texts.push(text);
          push({ text, voice: 'presence', beats: [i] });
        }
        // Night Hone 1 §3: the ones the case has given no reason to single
        // out yet, said together, and named only if the detective knows them.
        const grouped = beat.people.filter((p) => p.grouped);
        if (grouped.length > 0) {
          const text = crowdLine(stage, grouped.map((p) => p.personId));
          texts.push(text);
          push({ text, voice: 'presence', beats: [i] });
        }
        mark(i, {
          ...(beat.scene ? { tag: beat.scene } : { tag: beat.people.length === 0 ? 'empty' : 'people' }),
          personIds: beat.people.map((p) => p.personId),
          ...(grouped.length > 0 ? { grouped: grouped.map((p) => p.personId) } : {}),
          text: texts.join(' '),
        });
        break;
      }

      /* ---------------------------------------------------- the search */
      case 'act': {
        const object = beat.objectId ? view.objectById.get(beat.objectId)?.name : undefined;
        // Night Hone 1 §1: how he went through this place, in its own terms.
        const room = object
          ? null
          : deal(stage, 'search-act', [(c) => tagIs('search-act', c, 'place', stage.at)], {});
        const text = object
          ? pickShape(dealer.random, THING_ACTS, { object: object.replace(/^(?:a|an) /, 'the ') })
          : (room?.text ?? dealer.random.pick(SEARCH_ROOM_ACTS));
        push({ text, voice: 'act', beats: [i] });
        const names = beat.left.map((id) => view.objectById.get(id)?.name).filter((n): n is string => !!n);
        const leftText =
          names.length >= 2
            ? pickShape(dealer.random, LEFT_TWO, { object: names[0], other: names[1] })
            : names.length === 1
              ? pickShape(dealer.random, LEFT_ONE, { object: names[0] })
              : '';
        if (leftText.length > 0) pendingLeft = { text: leftText, beat: i };
        mark(i, { tag: beat.objectId ? 'search-thing' : 'search-room', text: `${text} ${leftText}`.trim() });
        break;
      }

      /* ------------------------------------------------------ the finds */
      case 'find': {
        if (plan.shape === 'ask') {
          // An ask's finds are in the witness's mouth: the exchange wrote them.
          break;
        }
        const clue = view.findableById.get(beat.clueId) as Clue;
        const text = findText(stage, clue, plan, gaps);
        // M9 page bug: the generator can deal the same noise sentence twice in
        // one room (seed 21 at difficulty 3). The page says it once; the
        // notebook keeps every record.
        if (paras.some((p) => p.clueId !== undefined && p.text.includes(text))) {
          const again = 'The same thing turned up a second time.';
          push({ text: again, voice: 'find', clueId: clue.id, beats: [i] });
          mark(i, { clueIds: [clue.id], text: again });
          break;
        }
        // The first find of a search goes in the paragraph the search opened;
        // the first thing found beside the body goes in the body's paragraph.
        const prev = last();
        const besideBody =
          prev !== undefined &&
          prev.voice === 'presence' &&
          prev.clueId === undefined &&
          plan.beats.some((b) => b.kind === 'presence' && b.people.length === 0 && (b.scene === 'body' || b.scene === 'body-again'));
        if (prev && ((prev.voice === 'act' && prev.clueId === undefined) || besideBody)) {
          prev.text = `${prev.text} ${text}`;
          prev.clueId = clue.id;
          prev.voice = 'find';
          prev.beats.push(i);
        } else {
          push({ text, voice: 'find', clueId: clue.id, beats: [i] });
        }
        mark(i, { clueIds: [clue.id], text });
        break;
      }

      /* ------------------------------------------------- the question */
      case 'exchange': {
        if (scene.kind !== 'ask') break;
        const written = exchange(stage, scene, beat, gaps, plan.beats);
        for (const p of written) push({ ...p, beats: [i] });
        mark(i, {
          tag: beat.carried ? 'carried' : 'asked',
          personIds: [beat.personId, ...(beat.subjectId ? [beat.subjectId] : [])],
          clueIds: beat.clueIds,
          text: written.map((p) => p.text).join(' '),
        });
        // The finds rode in the answer — unless tellings say them, a family
        // at a time, and mark their own.
        for (let j = i + 1; j < beats.length && !beat.told; j++) {
          const b = beats[j] as Beat;
          if (b.kind !== 'find') continue;
          const answer = written.find((p) => p.clueId === b.clueId);
          mark(j, { clueIds: [b.clueId], ...(answer ? { text: answer.text } : {}) });
        }
        break;
      }

      /* ------------------------------------------ M10: a family told */
      case 'telling': {
        if (scene.kind !== 'ask') break;
        const t = tellingParas(stage, scene, beat, gaps);
        for (const p of t.paras) push({ ...p, beats: [i] });
        lastFamily = { family: beat.family, told: t.told };
        mark(i, {
          tag: beat.family.kind,
          clueIds: beat.family.clueIds,
          personIds: t.personIds,
          ...(beat.family.placeId ? { placeIds: [beat.family.placeId] } : {}),
          text: t.paras.map((p) => p.text).join(' '),
          parts: t.parts,
          ticks: t.ticks,
        });
        for (let j = i + 1; j < beats.length; j++) {
          const b = beats[j] as Beat;
          if (b.kind === 'telling') break;
          if (b.kind !== 'find') continue;
          mark(j, { clueIds: [b.clueId], text: t.parts.told.join(' ') });
        }
        break;
      }

      /* ------------------------------------------ M10: what it is worth */
      case 'note': {
        const host = last();
        // One or two sentences: the thought, and the note after it when the
        // thought left room.
        if (host && host.voice === 'thought' && countSentences(host.text) > 2) break;
        const fam = beat.family;
        const subject = fam.subjectId ? view.personById.get(fam.subjectId) : undefined;
        const pro = subject ? pronounsOf(subject) : undefined;
        const band = verdictsOn(view) ? 'teach' : 'play';
        const seen = lastFamily?.family.key === fam.key && (lastFamily.told?.first.some((s) => /\bI saw\b|\bwas (?:here|at|back)\b/.test(s)) ?? false);
        const polarity = fam.kind === 'movements' ? (seen ? 'seen' : 'unseen') : 'any';
        const is = (c: Card, tag: string, want: string): boolean => tagIs('note', c, tag, want);
        const drawn = deal(
          stage,
          'note',
          [
            (c) => is(c, 'family', fam.kind) && tagOf('note', c, 'family') !== 'any' && is(c, 'band', band) && is(c, 'polarity', polarity),
            (c) => is(c, 'family', fam.kind) && is(c, 'band', band) && is(c, 'polarity', polarity),
          ],
          pro ? { ...pro } : {},
        );
        if (!drawn) break;
        if (host && host.voice === 'thought') {
          host.text = `${host.text} ${drawn.text}`;
          host.beats.push(i);
        } else {
          push({ text: drawn.text, voice: 'thought', beats: [i] });
        }
        mark(i, { tag: fam.kind, text: drawn.text, ...(fam.subjectId ? { personIds: [fam.subjectId] } : {}) });
        break;
      }

      /* -------------------------------------------------- the thought */
      case 'thought': {
        // Consecutive thoughts are one paragraph (golden page 5).
        const run: number[] = [];
        for (let j = i; j < beats.length && (beats[j] as Beat).kind === 'thought'; j++) run.push(j);
        const found = scene.kind === 'ask' && plan.beats.some((b) => b.kind === 'find');
        const onlyContext = run.every((j) => (beats[j] as Extract<Beat, { kind: 'thought' }>).thought.cls === 'context');
        const telling = plan.beats.some((b) => b.kind === 'telling');
        let noting = '';
        if (telling) {
          // M10: the note opens on what he did with it, once a page.
          if (found && !notedOnce) noting = `${dealer.random.pick(WROTE_IT_DOWN)} `;
          notedOnce = true;
        } else if (found && !onlyContext) {
          const noted = dealer.random.pick(WROTE_IT_DOWN);
          // Golden page 5: "Then I looked at what I'd written." — when what he
          // wrote down is going to take more than one thought.
          const again =
            run.some((j) => (beats[j] as Extract<Beat, { kind: 'thought' }>).thought.cls === 'observer-placed') || run.length > 1
              ? ` ${dealer.random.pick(LOOKED_AGAIN)}`
              : '';
          push({ text: `${noted}${again}`, voice: 'narrator', beats: [], noted: true });
        }
        const lines: string[] = [];
        for (const j of run) {
          const t = (beats[j] as Extract<Beat, { kind: 'thought' }>).thought;
          const finds = paras.filter((p) => p.clueId !== undefined).map((p) => p.text);
          let text = thoughtLine(stage, t, gaps, finds);
          if (/^Which\b/.test(text)) {
            const prev = lines[lines.length - 1];
            if (prev !== undefined && /\.$/.test(prev)) {
              // "…when it happened, which put Kreuzer at the third floor too."
              lines[lines.length - 1] = `${prev.slice(0, -1)}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
              mark(j, {
                tag: t.cls,
                clueIds: t.clueIds,
                personIds: [t.subjectId, t.sourceId, t.secondId].filter((x): x is Id => x !== undefined),
                placeIds: [t.placeId, t.otherPlaceId].filter((x): x is Id => x !== undefined),
                text: lines[lines.length - 1] as string,
              });
              continue;
            }
            const who = t.sourceId ? view.personById.get(t.sourceId)?.surname : undefined;
            text = `${who ?? 'Somebody'} had seen it, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
          }
          lines.push(text);
          mark(j, {
            tag: t.cls,
            clueIds: t.clueIds,
            personIds: [t.subjectId, t.sourceId, t.secondId].filter((x): x is Id => x !== undefined),
            placeIds: [t.placeId, t.otherPlaceId].filter((x): x is Id => x !== undefined),
            text,
            ...(t.single ? { hedge: true } : {}),
          });
        }
        push({ text: `${noting}${lines.join(' ')}`, voice: 'thought', beats: run, ...(noting ? { noted: true } : {}) });
        i = run[run.length - 1] as number;
        break;
      }

      /* ---------------------------------------------------- the bridge */
      case 'bridge': {
        const b = beat.bridge;
        const whoPerson = b.whoId ? view.personById.get(b.whoId) : undefined;
        const who = whoPerson?.surname;
        // A fixture's clause already says where they are: "Hargrove, the
        // doorman at the Wyckoff". Saying it again is the same fact twice.
        const where =
          b.whereId && !(whoPerson?.kind === 'fixture' && whoPerson.foundAt === b.whereId)
            ? view.placeById.get(b.whereId)?.shortName
            : undefined;
        // A relation is said once (the designer's rule): somebody an earlier
        // page introduced is bridged to by name, without it.
        const known = (b.tie === 'victim' || b.tie === 'place') && b.subjectId !== undefined && named.has(b.subjectId);
        const slots: Slots = { who, subject: b.subject, tie: b.tieText, where };
        const lead = (c: Card): boolean => (tagOf('bridge', c, 'lead') === 'search') === (b.search === true);
        const said = (c: Card): boolean => c.text.includes('{tie}') !== known;
        const fits = (c: Card): boolean =>
          (known ? tagIs('bridge', c, 'tie', 'victim') : tagIs('bridge', c, 'tie', b.tie)) && lead(c) && said(c);
        const loose = (c: Card): boolean => tagIs('bridge', c, 'tie', b.tie) && lead(c);
        // §6: where the one to ask is found, said when the notebook knows it.
        const ladder: Match[] = where
          ? [(c) => fits(c) && c.text.includes('{where}'), fits, loose]
          : [(c) => fits(c) && !c.text.includes('{where}'), loose];
        const drawn = deal(stage, 'bridge', ladder, slots);
        let text = drawn?.text ?? '';
        if (text.length === 0) {
          gaps.push(`no-card: bridge has nothing for ${b.tie} with the slots this lead has`);
          text = who ? `${who} was the one to ask about ${b.subject}.` : `${capitalize(b.subject)} was next.`;
        }
        // Golden page 3: why somebody in that relation is worth a question,
        // the first time the relation is said.
        const subjectPerson = b.subjectId ? view.personById.get(b.subjectId) : undefined;
        const why =
          b.tie === 'victim' && !known && subjectPerson?.relationshipId ? RELATION_WHY[subjectPerson.relationshipId] : undefined;
        if (why) text = `${why} ${text}`;
        push({ text, voice: 'bridge', beats: [i] });
        mark(i, {
          tag: b.tie,
          clueIds: [b.openerId],
          targetId: b.targetId,
          personIds: [b.whoId, b.subjectId].filter((x): x is Id => x !== undefined),
          ...(b.whereId ? { placeIds: [b.whereId] } : {}),
          text,
        });
        break;
      }

      /* ---------------------------------------------------- the answer */
      case 'answer': {
        const slots: Slots = { subject: beat.subject, name: beat.name };
        const drawn = deal(stage, 'answer', [(c) => tagIs('answer', c, 'outcome', beat.outcome)], slots);
        const text =
          drawn?.text ??
          (beat.outcome === 'found'
            ? 'It was what I had come for.'
            : beat.outcome === 'dead-end'
              ? 'It was a dead end.'
              : 'It was not what I came for.');
        if (!drawn) gaps.push(`no-card: answer has nothing for ${beat.outcome}`);
        const prev = last();
        if (prev && prev.voice !== 'errand' && prev.voice !== 'exchange' && wordCount(prev.text) < 45) {
          prev.text = `${prev.text} ${text}`;
          prev.beats.push(i);
        } else {
          push({ text, voice: 'answer', beats: [i] });
        }
        mark(i, { tag: beat.outcome, ...(beat.targetId ? { targetId: beat.targetId } : {}), text });
        break;
      }

      /* --------------------------------------------------- the texture */
      case 'texture': {
        // Weather is written with the place; ambient is decided on length below.
        // A question's room texture waits until the page's length is known.
        if (beat.texture !== 'place' || plan.shape === 'ask') break;
        // Night Hone 1 §1: the room's own sounds, light and smells, after the
        // finds on a search and with the line on a return.
        const band = bandOf(stage.minutes);
        const at = (c: Card): boolean => tagIs('place-ambient', c, 'place', stage.at);
        const drawn = deal(
          stage,
          'place-ambient',
          [(c) => at(c) && tagOf('place-ambient', c, 'band') === band, (c) => at(c) && tagOf('place-ambient', c, 'band') === 'any'],
          {},
        );
        if (!drawn) break;
        const host = last();
        if (host && (host.voice === 'act' || host.voice === 'establish' || (host.voice === 'find' && plan.shape === 'search'))) {
          host.text = `${host.text} ${drawn.text}`;
          host.beats.push(i);
          host.riders = [...(host.riders ?? []), { text: drawn.text, kind: 'place', beat: i }];
        } else {
          push({ text: drawn.text, voice: 'narrator', beats: [i], texture: 'place' });
        }
        mark(i, { tag: 'place', text: drawn.text });
        break;
      }

      /* ------------------------------------------------- the decision */
      case 'decide': {
        const person = view.personById.get(beat.personId) as Person;
        const she = pronounOf(person) === 'she';
        const slots: Slots = {
          subject: person.surname,
          place: beat.placeId ? view.placeById.get(beat.placeId)?.shortName : undefined,
          time: beat.tick === undefined ? undefined : spokenClock(beat.tick),
          they: she ? 'she' : 'he',
          them: she ? 'her' : 'him',
          their: she ? 'her' : 'his',
        };
        const present = beat.present ? 'yes' : 'no';
        const who = (c: Card): boolean => tagIs('decide', c, 'who', beat.who);
        const drawn = deal(
          stage,
          'decide',
          [
            (c) => who(c) && tagIs('decide', c, 'act', beat.act) && tagIs('decide', c, 'present', present),
            (c) => who(c) && tagIs('decide', c, 'present', present),
            (c) => who(c),
          ],
          slots,
        );
        const text = drawn?.text ?? `I let it sit, for now. ${person.surname} and I would come back to it.`;
        if (!drawn) gaps.push(`no-card: decide has nothing for ${beat.who} × ${beat.act} × ${present}`);
        push({ text, voice: 'thought', beats: [i] });
        mark(i, {
          tag: `${beat.who}-${beat.act}`,
          personIds: [beat.personId],
          ...(beat.placeId ? { placeIds: [beat.placeId] } : {}),
          text,
        });
        break;
      }

      /* ---------------------------------------------- M9: put it to them */
      case 'confront': {
        if (scene.kind !== 'confront') break;
        const written = confrontParas(stage, scene, beat, gaps);
        for (const p of written) push({ ...p, beats: [i] });
        mark(i, {
          tag: beat.outcome,
          personIds: [beat.personId],
          clueIds: [beat.clueId],
          ...(beat.placeId ? { placeIds: [beat.placeId] } : {}),
          text: written.map((p) => p.text).join(' '),
        });
        break;
      }
    }
  }

  flushLeft();

  /* ----------------------------------------- the client's close (office) */
  if (scene.kind === 'ask' && scene.clientLeaves) {
    const client = view.client;
    push({
      text: clientLeavingLine(
        dealer,
        client.surname,
        view.placeById.get(client.foundAt ?? '')?.shortName ?? `the address ${pronounOf(client)} gave me`,
      ),
      voice: 'exchange',
      beats: [],
    });
  }

  /* ------------------- Night Hone 1 §1: a short question gets its room */
  const placeAt = beats.findIndex((b) => b.kind === 'texture' && b.texture === 'place');
  const words = (): number => paras.reduce((n, p) => n + wordCount(p.text), 0);
  if (plan.shape === 'ask' && placeAt >= 0 && words() < ASK_TEXTURE_BELOW) {
    const band = bandOf(stage.minutes);
    const at = (c: Card): boolean => tagIs('place-ambient', c, 'place', stage.at);
    const drawn = deal(
      stage,
      'place-ambient',
      [(c) => at(c) && tagOf('place-ambient', c, 'band') === band, (c) => at(c) && tagOf('place-ambient', c, 'band') === 'any'],
      {},
    );
    const host = paras.find((p) => p.voice === 'exchange');
    if (drawn && host) {
      // Before he speaks: the clock, if the hour turned, then the room.
      const clock = traces.find((t) => t.kind === 'clock' && t.rendered)?.text;
      host.text =
        clock && host.text.startsWith(clock)
          ? `${clock} ${drawn.text}${host.text.slice(clock.length)}`
          : `${drawn.text} ${host.text}`;
      host.beats.push(placeAt);
      host.riders = [...(host.riders ?? []), { text: drawn.text, kind: 'place', beat: placeAt }];
      mark(placeAt, { tag: 'place', text: drawn.text });
    }
  }

  /* --------------------------------------------------- §8: length, texture */
  const shape = plan.shape;
  const [low] = NIGHT_TARGETS[shape] ?? [150, 300];
  const ambientAt = beats.findIndex((b) => b.kind === 'texture' && b.texture === 'ambient');
  const count = (): number => paras.reduce((n, p) => n + wordCount(p.text), 0);
  if (ambientAt >= 0 && count() < (low as number)) {
    const band = hourBandOf(stage.minutes);
    const plainCard = (c: Card): boolean => figuresIn(c.text) === 0 && !isSubjectless(c.text);
    const drawn = deal(
      stage,
      'ambient',
      [(c) => plainCard(c) && tagIs('ambient', c, 'hourBand', band), plainCard],
      { place: here },
    );
    if (drawn) {
      // After the finds and before the thinking, where the golden lets a room breathe.
      const at = paras.findIndex((p) => p.voice === 'thought' || p.noted === true);
      const n = countSentences(drawn.text);
      const host = at > 0 ? paras[at - 1] : undefined;
      if (host && host.voice !== 'errand' && host.voice !== 'exchange' && host.noted !== true) {
        host.text = `${host.text} ${drawn.text}`;
        host.imageN = (host.imageN ?? 0) + n;
        host.beats.push(ambientAt);
        host.riders = [...(host.riders ?? []), { text: drawn.text, kind: 'ambient', beat: ambientAt }];
      } else {
        const para: Para = { text: drawn.text, voice: 'narrator', beats: [ambientAt], texture: 'ambient', imageN: n };
        if (at > 0) paras.splice(at, 0, para);
        else paras.push(para);
      }
      mark(ambientAt, { tag: 'ambient', text: drawn.text });
    }
  }
  // Texture is the only thing the page may lose (§8), in `CUT_ORDER`: to get
  // under the ceiling, and to keep M5's plain floor — a place card and the
  // weather together can outweigh a short page's plain sentences.
  const cutOne = (kind: (typeof CUT_ORDER)[number]): boolean => {
    const at = paras.findIndex((p) => p.texture === kind);
    if (at >= 0) {
      const cut = paras.splice(at, 1)[0] as Para;
      for (const j of cut.beats) traces[j] = { ...(traces[j] as BeatTrace), rendered: false };
      return true;
    }
    const host = paras.find((p) => (p.riders ?? []).some((r) => r.kind === kind));
    if (!host) return false;
    const rider = (host.riders ?? []).find((r) => r.kind === kind) as NonNullable<Para['riders']>[number];
    host.text = host.text.replace(rider.text, '').replace(/\s{2,}/g, ' ').trim();
    host.riders = (host.riders ?? []).filter((r) => r !== rider);
    host.imageN = Math.max(0, (host.imageN ?? 0) - countSentences(rider.text));
    traces[rider.beat] = { ...(traces[rider.beat] as BeatTrace), rendered: false };
    return true;
  };
  const plainShare = (): number => {
    let plain = 0;
    let image = 0;
    for (const p of paras) {
      const n = countSentences(p.text);
      const img = Math.min(n, p.imageN ?? 0);
      image += img;
      plain += n - img;
    }
    return plain + image === 0 ? 1 : plain / (plain + image);
  };
  for (const kind of CUT_ORDER) {
    while ((count() > NIGHT_CEILING || plainShare() < PLAIN_FLOOR) && cutOne(kind)) {
      /* cut */
    }
  }
  // Night Hone 1: the room's texture is for a page that needs the length. A
  // page already past the top of its shape's range (a search with three
  // finds) does without it.
  const high = (NIGHT_TARGETS[shape] ?? [150, 300])[1] as number;
  while (count() > high && cutOne('place')) {
    /* cut */
  }

  /* ------------------------- Night Hone 1 §4: "the benches were", not "was" */
  for (const pl of view.places) {
    if (!isPluralPlace(pl.shortName)) continue;
    const name = pl.shortName.replace(/^the /, '');
    const re = new RegExp(`\\b([Tt]he ${name}) (was|wasn[’']t|is|isn[’']t|has|hasn[’']t|does|doesn[’']t)\\b`, 'g');
    const plural: Record<string, string> = {
      was: 'were',
      'wasn’t': 'weren’t',
      "wasn't": 'weren’t',
      is: 'are',
      'isn’t': 'aren’t',
      "isn't": 'aren’t',
      has: 'have',
      'hasn’t': 'haven’t',
      "hasn't": 'haven’t',
      does: 'do',
      'doesn’t': 'don’t',
      "doesn't": 'don’t',
    };
    for (const p of paras) p.text = p.text.replace(re, (_m, the: string, verb: string) => `${the} ${plural[verb] ?? verb}`);
  }

  /* -------------------------------------------- §7: names with clauses */
  // Named on an earlier page: said who they are once already, and that is
  // enough (the designer's rule). `named` grows as this page names people.
  for (const p of paras) p.text = introduceNames(p.text, people, named, { plainFirst: p.voice === 'bridge' });

  /* ---------------------------------- Hone 2 §A.3: the surname twice running */
  let lastSubject: string | null = null;
  for (const p of paras) {
    const sentences = sentencesOf(p.text);
    let changed = false;
    for (const [k, sentence] of sentences.entries()) {
      if (/^[“"]/.test(sentence)) {
        lastSubject = null;
        continue;
      }
      const who = view.kase.people.find((x) => opensOnSubject(sentence, x.surname));
      if (!who) {
        lastSubject = null;
        continue;
      }
      if (lastSubject === who.surname && p.voice !== 'errand') {
        const fixed = pronounSubject(sentence, who.surname, pronounOf(who));
        if (fixed !== sentence) {
          sentences[k] = fixed;
          changed = true;
          lastSubject = null;
          continue;
        }
      }
      lastSubject = who.surname;
    }
    if (changed) p.text = sentences.join(' ');
  }
  let plainN = 0;
  let imageN = 0;
  for (const p of paras) {
    const n = countSentences(p.text);
    const img = Math.min(n, p.imageN ?? 0);
    imageN += img;
    plainN += n - img;
  }

  const blocks: Block[] = paras.map((p) =>
    p.clueId === undefined
      ? { kind: 'prose', text: tidyPunctuation(p.text), voice: p.voice }
      : { kind: 'prose', text: tidyPunctuation(p.text), voice: p.voice, clueId: p.clueId },
  );
  // The timeline an account prints goes after the paragraph that gave it.
  if (scene.kind === 'ask' && scene.account) {
    const at = blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'exchange' && /evening|book/.test(b.text));
    blocks.splice(at >= 0 ? at + 1 : blocks.length, 0, {
      kind: 'timeline',
      personId: scene.personId,
      rows: scene.account.rows,
    });
  }
  if (errand) {
    const first = blocks[0];
    if (first && first.kind === 'prose' && first.voice === 'errand') errand = { ...errand, text: first.text };
  }
  return { blocks, plain: plainN, image: imageN, traces, ...(errand ? { errand } : {}), gaps };
}

/* ------------------------------------------------------------------ *
 * The pieces.
 * ------------------------------------------------------------------ */

/**
 * The trope's own given about the room, on the first sight of it: the body
 * that was moved, the shelf that was emptied, the place somebody was last
 * seen. The office already said the rest.
 */
function sceneGiven(stage: Stage): string {
  const { view } = stage;
  const act = view.kase.act;
  const note = openingNote(view, stage.at);
  // The note opens on the place's full name and the neighbourhood; the
  // establish paragraph has said where we are.
  const body = note.slice(note.indexOf('.') + 1).trim();
  if (act.type === 'murder') {
    const after = body.split('a telephone.')[1]?.trim() ?? '';
    return after.length > 0 ? pastTense(after) : '';
  }
  return pastTense(body);
}

/** One person in the room: what they are doing, and on first sight who they are. */
/** "a woman in her forties": what anybody can see. */
function sightOf(person: Person): string | undefined {
  const d = person.dossier;
  const decade = d ? DECADES[Math.floor(d.age / 10)] : undefined;
  if (!decade) return undefined;
  const she = genderHintOf(person) === 'f';
  return `a ${she ? 'woman' : 'man'} in ${possessiveOf(person)} ${decade}`;
}

/** Their trade, when it shows: a bartender behind the bar, a longshoreman's hands. */
function visibleTrade(person: Person): string | undefined {
  if (person.kind === 'fixture') return person.role.replace(/\.$/, '');
  const shows = (person.dossier?.layers ?? []).some((f) => f.kind === 'profession' && f.layer === 0);
  return shows ? person.role.replace(/\.$/, '') : undefined;
}

function presenceLine(stage: Stage, p: PresencePerson, named: ReadonlySet<Id> = new Set()): string {
  const { view, cast } = stage;
  const person = view.personById.get(p.personId) as Person;
  const parts = [endStop(p.activity.text)];
  if (p.firstSight) {
    const d = person.dossier;
    const decade = d ? DECADES[Math.floor(d.age / 10)] : undefined;
    const gender = genderHintOf(person);
    // The designer's rule: what the detective can see comes first — sex, age,
    // what they are doing, and their trade where it shows. Their relation to
    // the victim only when it is why they matter here, and only if no earlier
    // page has said it.
    const relation =
      (p.why === 'lead' || p.why === 'known') && !named.has(person.id) ? person.relationshipToVictim : undefined;
    const clause = relation ?? visibleTrade(person);
    if (clause) {
      const sight = fillTemplate(stage.dealer.random.pick(SIGHT_LINES), {
        Pronoun: gender === 'f' ? 'She' : 'He',
        clause,
        noun: gender === 'f' ? 'woman' : 'man',
        possessive: possessiveOf(person),
        decade,
      });
      if (sight.length > 0) parts.push(sight);
    } else {
      // Golden page 4: "Callahan was behind the bar, a woman in her forties."
      const seen = sightOf(person);
      const first = parts[0] as string;
      if (seen && first.startsWith(`${person.surname} `)) {
        parts[0] = `${person.surname}, ${seen}, ${first.slice(person.surname.length + 1)}`;
      } else if (seen) {
        parts.push(`${gender === 'f' ? 'She' : 'He'} was ${seen}.`);
      }
    }
  } else if (p.recall) {
    // §4: a recall is something the person does, never a noun and never an
    // epithet. A pair with no action form is not recalled.
    const action = cast.portraits[p.personId]?.pair?.action;
    if (action) parts.push(action);
  }
  return parts.join(' ');
}

/**
 * Night Hone 1 §3: the people in a room the case has not singled out, in one
 * sentence — "Two men and a woman were at the far tables…" — with the names
 * the detective already has ("Lanza and two men I didn't know").
 */
function crowdLine(stage: Stage, ids: readonly Id[]): string {
  const { view } = stage;
  const people = ids.map((id) => view.personById.get(id)).filter((p): p is Person => p !== undefined);
  // Named only if an earlier page said who they are; the rest by what shows.
  const before = new Set(stage.namedBefore ?? []);
  const known = people.filter((p) => before.has(p.id));
  const strangers = people.filter((p) => !before.has(p.id));
  const men = strangers.filter((p) => genderHintOf(p) !== 'f').length;
  const women = strangers.length - men;
  const count = (n: number, one: string, many: string): string =>
    n === 0 ? '' : n === 1 ? `a ${one}` : `${COUNT_WORDS[n] ?? String(n)} ${many}`;
  const unknown = [count(men, 'man', 'men'), count(women, 'woman', 'women')].filter((x) => x.length > 0);
  const strangersSaid =
    unknown.length === 0 ? '' : `${unknown.join(' and ')}${known.length > 0 ? ' I didn’t know' : ''}`;
  const names = known.map((p) => p.surname);
  const all = [...names, ...(strangersSaid ? [strangersSaid] : [])];
  const group =
    all.length <= 1
      ? (all[0] ?? '')
      : `${all.slice(0, -1).join(', ')} and ${all[all.length - 1] as string}`;
  const band = bandOf(stage.minutes);
  const at = (c: Card): boolean => tagIs('crowd', c, 'place', stage.at);
  const drawn = deal(
    stage,
    'crowd',
    [(c) => at(c) && tagOf('crowd', c, 'band') === band, (c) => at(c) && tagOf('crowd', c, 'band') === 'any'],
    { group: capitalize(group) },
  );
  return drawn?.text ?? `${capitalize(group)} were there, keeping to themselves.`;
}

/**
 * A find, as the golden writes one: what the room shows, in the past tense,
 * with its source where the source is a document. The generator's sentence is
 * the notebook's; this is the page's.
 */
function findText(stage: Stage, clue: Clue, plan: Plan, gaps: string[]): string {
  const { view } = stage;
  const here = view.placeById.get(stage.at)?.shortName ?? '';
  let fact = pageFact(clue, here, view);
  // The presence beat already said where the body is; "Sweeney was found at
  // the suite." after it is the record's address, not a find.
  const body = plan.beats.some((b) => b.kind === 'presence' && (b.scene === 'body' || b.scene === 'body-again'));
  if (body) {
    const found = new RegExp(`^${view.victim.surname} was found at ${here.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\s*`);
    fact = fact.replace(found, '');
  }
  // The coroner's note says where it came from before it says anything; a
  // room's own finds describe themselves, and a paper names its source in its
  // own first words ("The bank confirms the account").
  if (findKindOf(view, clue) === 'morgue' && clue.source.type === 'place') {
    return `${stage.dealer.random.pick(MORGUE_LEADS)} ${capitalize(fact)}`;
  }
  void gaps;
  return capitalize(thereWas(fact));
}

/**
 * A paper's record is often a label, not a sentence — "A policy on Sweeney's
 * life for $10,000, twenty months old, with Grasso named on the face of it."
 * On the page it is something that was there (golden page 3: "A day ledger
 * lay on the desk"): "There was a policy…". Only when its first clause has no
 * verb of its own.
 */
export function thereWas(fact: string): string {
  const m = /^(A|An|Two|Three|Four|Some) /.exec(fact);
  if (!m) return fact;
  const head = (fact.split(/[,.;]/)[0] ?? fact).split(/ (?:who|which|that|where) /)[0] ?? fact;
  if (/\b(is|was|are|were|has|had|have|lies|lay|sits|sat|stands|stood|hangs|hung|shows|showed|says|said|reads|read|puts|put|came|comes|went|goes|turned|leaves|left)\b/.test(head)) return fact;
  const plural = m[1] !== 'A' && m[1] !== 'An';
  return `There ${plural ? 'were' : 'was'} ${fact.charAt(0).toLowerCase()}${fact.slice(1)}`;
}

/**
 * A clue's record as the page tells it (§7): past tense, standing in the room,
 * without the record's filing line. Every word of the fact survives; only the
 * tense and the address change.
 */
export function pageFact(clue: Clue, here: string, view: Stage['view']): string {
  void view;
  // "Found at the back lot: A clipping…" is the record's filing line; the
  // page is standing in the room and says what was there.
  const filed = clue.text.replace(/^Found at [^:]{1,60}:\s*/, '');
  return pastTense(stripHere(capitalize(filed), here));
}

/**
 * How somebody from the block says a place, where the place's full name has a
 * street in it: "the third-floor walk-up on Ninth" is "the walk-up on Ninth"
 * in a witness's mouth, not "the third floor". Places with no street keep
 * their short name. Only for speech; narration keeps the short name the
 * notebook and the buttons use.
 */
export function spokenPlace(place: { name: string; shortName: string }): string {
  if (place.name.includes('{V}')) return place.shortName;
  const m = /^the (?:[a-z-]+ )*?([a-z-]+) on ([A-Z][a-z]+(?: [A-Z][a-z]+)?)$/.exec(place.name);
  if (!m) return place.shortName;
  return `the ${m[1]} on ${m[2]}`;
}

function localPlaces(view: Stage['view'], text: string): string {
  let out = text;
  for (const place of view.places) {
    const local = spokenPlace(place);
    if (local === place.shortName) continue;
    out = out.split(place.shortName).join(local);
  }
  return out;
}

/** The coroner's window said aloud: "at half past eight", "between eight and half past eight". */
export function windowSpan(window: readonly Tick[]): string | undefined {
  if (window.length === 0) return undefined;
  const a = window[0] as Tick;
  const b = window[window.length - 1] as Tick;
  if (a === b) return `at ${spokenClock(a)}`;
  return `between ${spokenClock(a).replace(/ o[’']clock$/, '')} and ${spokenClock(b)}`;
}

/** Slots for a thought card (see the deck's `$comment` for what each means). */
export function thoughtSlots(stage: Stage, t: Thought): Slots {
  const { view } = stage;
  const surname = (id: Id | undefined): string | undefined => (id ? view.personById.get(id)?.surname : undefined);
  const placeName = (id: Id | undefined): string | undefined => (id ? view.placeById.get(id)?.shortName : undefined);
  let other: string | undefined;
  switch (t.cls) {
    case 'clears':
    case 'contradicts':
      other = placeName(t.otherPlaceId);
      break;
    case 'window':
      other = t.anchorId ? view.anchorById.get(t.anchorId)?.name : undefined;
      break;
    case 'robbery-shape':
    case 'goods':
    case 'method':
      other = t.objectId ? view.objectById.get(t.objectId)?.name : undefined;
      break;
    case 'secret':
    case 'dead-end': {
      // What the secret was, as a thing somebody does: "embezzling".
      const who = t.subjectId ? view.personById.get(t.subjectId) : undefined;
      const secret = who?.isKiller ? who.coverSecret : who?.secret;
      other = secret ? secretDoing(secret.type, secret.label) : undefined;
      break;
    }
    case 'touches':
      other = t.otherText ?? (t.anchorId ? view.anchorById.get(t.anchorId)?.name : undefined);
      break;
    default:
      break;
  }
  const method = t.methodId
    ? [...MURDER_MEANS, ...ROBBERY_MEANS, ...MISSING_MEANS].find((m) => m.id === t.methodId)
    : undefined;
  const subject = t.subjectId ? view.personById.get(t.subjectId) : undefined;
  const window = t.cls === 'window' && t.basis === 'coroner' ? windowOf(view, stage.foundAfter, stage.accountsAfter) : [];
  return {
    // method: what it was, and what whoever did it had to do first.
    means: method?.name,
    how: method?.accessNote,
    // motive: the reason, as the case has it, told afterwards.
    motive:
      t.cls === 'motive' && subject?.motive && subject.id !== view.victim.id
        ? pastTense(subject.motive.description)
        : undefined,
    // window from the coroner alone: the hours still open, said aloud.
    // M10 §A.5: one half hour is "at half past eight", never "from half past
    // eight until half past eight"; two or more are "between eight and half
    // past eight".
    span: windowSpan(window),
    subject: surname(t.subjectId),
    source: surname(t.sourceId),
    place: placeName(t.placeId),
    time: t.tick === undefined ? undefined : spokenClock(t.tick),
    victim: view.victim.surname,
    other,
    // M9: the second person of `together` and `apart`.
    name: surname(t.secondId),
    // The room it happened in, by its short name (the content branch's slot).
    scene: view.placeById.get(view.sceneId)?.shortName,
  };
}

/**
 * A secret as something a person had been doing, in words anybody reading
 * now understands — "selling stolen goods", not "fencing".
 */
const SECRET_DOING: Record<string, string> = {
  affair: 'seeing somebody on the quiet',
  embezzling: 'embezzling from an employer',
  'gambling-debt': 'running up a gambling debt',
  fence: 'selling stolen goods',
  fencing: 'selling stolen goods',
  blackmail: 'blackmailing somebody',
  'secret-drinking': 'drinking in secret',
  drinking: 'drinking in secret',
  'forged-identity': 'living under a false name',
  dope: 'buying morphine',
  'union-organizing': 'organizing a union',
  'hidden-family': 'visiting a child nobody was supposed to know about',
};

export function secretDoing(type: string, label: string): string {
  return SECRET_DOING[type] ?? label.charAt(0).toLowerCase() + label.slice(1);
}

function thoughtLine(stage: Stage, t: Thought, gaps: string[], finds: readonly string[] = []): string {
  const caseType = stage.view.kase.act.type;
  // M9 §3: after a confrontation, what the detective did with what was said.
  // The confront deck's `close` cards; never a verdict.
  if (t.cls === 'confronted' && t.subjectId) {
    const person = stage.view.personById.get(t.subjectId) as Person;
    const drawn = deal(
      stage,
      'confront',
      [
        (c) => tagIs('confront', c, 'outcome', t.basis ?? 'wrong') && tagIs('confront', c, 'part', 'close'),
      ],
      { ...confrontSlots(stage, person, t.placeId, t.tick) },
    );
    if (drawn) return drawn.text;
    gaps.push(`no-card: confront has no close for ${t.basis ?? 'wrong'}`);
    return `I wrote down what ${person.surname} had said.`;
  }
  // §3–§4: the watcher's view on arrival is the place's watch clause — why
  // the watcher matters is that they watch — so it is dealt from `watch`.
  if (t.cls === 'view' && t.who === 'watcher' && t.subjectId) {
    const person = stage.view.personById.get(t.subjectId);
    const role = person?.fixtureRole;
    if (person && role) {
      const drawn = deal(stage, 'watch', [(c) => tagIs('watch', c, 'watcher', role)], {
        watcher: person.surname,
        place: stage.view.placeById.get(person.foundAt ?? '')?.shortName,
      });
      if (drawn) return drawn.text;
    }
  }
  const slots = thoughtSlots(stage, t);
  const is = (c: Card, tag: string, want: string | undefined): boolean =>
    want === undefined || tagIs('thought', c, tag, want);
  const lied = t.lied === undefined ? undefined : t.lied ? 'yes' : 'no';
  // The slot values a card is filled with — people, places, anchors, things,
  // the method's own words — are not the card saying the find again; the
  // check reads the card as filled so that a motive told twice is caught.
  const names = [
    ...stage.view.kase.people.map((p) => p.surname),
    ...stage.view.places.map((p) => p.shortName),
    ...stage.view.kase.anchors.map((a) => a.name),
    ...stage.view.kase.objects.map((o) => o.name),
    ...[slots.means, slots.how, slots.span, slots.other, slots.time].filter((x): x is string => x !== undefined),
  ];
  // §5: a thought on one person's word says "if"; and it never says the find
  // again in other words (§5's "find, then thought").
  const cls = (c: Card): boolean =>
    tagOf('thought', c, 'class') === t.cls &&
    is(c, 'case', caseType) &&
    (t.single !== true || hedged(c.text)) &&
    !restates(fill(c, slots) ?? c.text, finds, names);
  // Night Hone 1 §2: when the case gives the thought its specifics — the
  // motive itself, the method and what it took, the hours — a card that
  // says them comes first.
  const rich = (['motive', 'means', 'span'] as const).filter((k) => slots[k] !== undefined);
  const says = (c: Card): boolean => rich.length === 0 || rich.some((k) => c.text.includes(`{${k}}`));
  const ladder: Match[] = [
    (c) => cls(c) && says(c) && is(c, 'basis', t.basis) && is(c, 'via', t.via) && is(c, 'who', t.who) && is(c, 'lied', lied),
    (c) => cls(c) && is(c, 'basis', t.basis) && is(c, 'via', t.via) && is(c, 'who', t.who) && lied === 'yes' && tagOf('thought', c, 'lied') === 'yes',
    (c) => cls(c) && is(c, 'basis', t.basis) && is(c, 'via', t.via) && is(c, 'who', t.who) && is(c, 'lied', lied),
    (c) => cls(c) && is(c, 'basis', t.basis) && is(c, 'via', t.via),
  ];
  const drawn = deal(stage, 'thought', ladder, slots);
  if (drawn) return drawn.text;
  gaps.push(`no-card: thought has nothing for ${t.cls} with the slots it has`);
  return 'I wrote it down and thought about it.';
}

/**
 * The exchange: the question (carried or plain), the answer in the witness's
 * mouth, one piece of business at most, and a follow-up before each further
 * fact. Returns paragraphs; the answer to each clue carries its id.
 */
function exchange(
  stage: Stage,
  scene: Extract<Scene, { kind: 'ask' }>,
  beat: Extract<Beat, { kind: 'exchange' }>,
  gaps: string[],
  planned: readonly Beat[] = [],
): Omit<Para, 'beats'>[] {
  const { view, cast, dealer } = stage;
  const person = view.personById.get(scene.personId) as Person;
  const surname = person.surname;
  const familiar = knowsHim(cast.roll, person.id);
  const out: Omit<Para, 'beats'>[] = [];
  const pronoun = pronounOf(person);
  const subject = beat.subjectId ? view.personById.get(beat.subjectId) : undefined;
  const slots: Slots = {
    detective: stage.detectiveName,
    place: scene.topicSlots.place ?? view.placeById.get(stage.at)?.shortName,
    object: scene.topicSlots.object,
    name: scene.askKind === 'ask-evening' || scene.askKind === 'ask-hired' ? surname : scene.topicSlots.subject,
    subject: scene.askKind === 'ask-evening' || scene.askKind === 'ask-hired' ? surname : scene.topicSlots.subject,
    addressee: surname,
    topic: scene.topicLabel,
  };

  /* the approach, and the question */
  const opening: string[] = [];
  // M10 §A.3: "Go on" — the same conversation, a page on.
  if (beat.continued) {
    out.push({ text: '“Go on,” I said.', voice: 'exchange' });
    return out;
  }
  // M10 §A.1: the question a family of facts asks for, when the topic was a
  // place or a thing and the answer is a door's count, strangers, or when
  // something happened.
  const firstTelling = planned.find((b): b is Extract<Beat, { kind: 'telling' }> => b.kind === 'telling');
  const topicKind = scene.topicRef?.kind ?? 'exact';
  const byTopic =
    firstTelling !== undefined &&
    ['counts', 'strangers', 'timing', 'event'].includes(firstTelling.family.kind) &&
    topicKind !== 'person' &&
    topicKind !== 'evening' &&
    topicKind !== 'self' &&
    topicKind !== 'hire';
  if (beat.stops) {
    // §4: spoken to, they stop what they were doing — and the page says what
    // that was, when the activity is something they were in the middle of.
    const doing = stage.memory?.activities[person.id]?.text;
    const stopped = doing ? stoppedDoing(doing, surname) : null;
    opening.push(stopped ?? fillTemplate(dealer.random.pick(STOP_LINES), { name: surname, pronoun }));
  } else if (!scene.free) {
    // Golden page 5: "I sat down across from her." Somebody already spoken
    // to this visit is turned back to; anybody else is gone over to.
    const again = stage.memory?.activities[person.id]?.stopped === true;
    opening.push(fillTemplate(dealer.random.pick(again ? APPROACH_AGAIN : APPROACH), { name: surname }));
  }
  let question = '';
  if (beat.carried && subject) {
    const tie = subject.relationshipToVictim ?? '';
    const m = /^(.+?)[’']s ([a-z][a-z -]*)$/.exec(tie);
    if (m && m[1] === view.victim.surname) {
      const noun = m[2] as string;
      question = fillTemplate(dealer.random.pick(CARRIED_QUESTIONS), {
        victim: view.victim.surname,
        article: /^[aeiou]/.test(noun) ? 'an' : 'a',
        noun,
        subject: subject.surname,
      });
    } else {
      // "Broadnax owed Obermann money." — the relation in plain words, not
      // "Broadnax, in Obermann's debt."
      const verb = subject.relationshipId ? RELATION_PLAIN[subject.relationshipId] : undefined;
      question = verb
        ? `${subject.surname} ${verb.split('{V}').join(view.victim.surname)}.`
        : fillTemplate(dealer.random.pick(CARRIED_QUESTIONS_PLAIN), {
            subject: subject.surname,
            clause: tie,
          });
    }
    question = `“${question}”`;
  } else if (scene.self) {
    question = dealer.random.pick(SELF_QUESTIONS);
  } else if (byTopic && firstTelling) {
    question = familyQuestion(stage, firstTelling.family, 'first', gaps);
  } else {
    const line = dashiellLine(dealer, scene.askKind as AskKind, familiar, slots);
    question = line?.text ?? `“${capitalize(scene.topicLabel)}?”`;
  }
  // M10 §A.1: the question is clearly the detective's. After a line whose
  // subject is the witness, it says who is asking.
  const lead = opening[opening.length - 1];
  if (lead !== undefined && !/^I\b/.test(lead)) question = attributed(question);
  opening.push(question);
  out.push({ text: opening.join(' '), voice: 'exchange' });
  if (scene.free) out.push({ text: 'No charge on this one. There never is, the first time.', voice: 'narrator' });

  /* the answer */
  // One piece of business at most, and only the person's own: their recall
  // action, once a visit, past tense, and so never at odds with their
  // portrait. A dealt gesture ("A hat goes round in two hands") could be
  // either, so none is dealt; when there is no recall to spend, nothing.
  let business = !beat.recall;
  const withBusiness = (text: string): string => {
    if (business) return text;
    business = true;
    const action = cast.portraits[person.id]?.pair?.action;
    return action ? `${text} ${action}` : text;
  };
  // Night Hone 1 §1: the golden's follow-up, where the case supports one —
  // what the witness knows of the one they are talking about (the dossier fact
  // this clue hands the notebook), said once, in the witness's mouth.
  const factsSaid = new Set<Id>();
  const factAbout = (clue: Clue, named: boolean): string | null => {
    const about = clueAbout(clue);
    if (about === null || about === person.id || about === view.victim.id || factsSaid.has(about)) return null;
    const line = followUpFact(stage, clue, about, person.id, named);
    if (line !== null) factsSaid.add(about);
    return line;
  };
  const answerClue = (clue: Clue, followUp: boolean): void => {
    // M9: the logic game's own kinds are said from their facts, the way the
    // witness knows the person (spec, "Who knows whom").
    // The grid's names, not the block's: in a logic game the place a witness
    // names has to be the place on the grid.
    const m9 = m9Answer(view, clue, person, (p) => p.shortName);
    if (m9 !== null) {
      if (followUp) {
        const q = briefingQuestion(dealer.random, 'follow-named', { ...slots, victim: view.victim.surname }, [], clue.text);
        if (q.length > 0) out.push({ text: `“${q}”`, voice: 'exchange' });
      }
      out.push({ text: withBusiness(m9), voice: 'exchange', clueId: clue.id });
      return;
    }
    const register = registerFor(view, person.id, clue);
    const spoken = speakClue(dealer, view, cast, clue, person, register, slots, gaps);
    const quoted = spoken.mode === 'utterance' || spoken.mode === 'quote';
    const say = (t: string): string =>
      quoted
        ? `“${endStop(capitalize(localPlaces(view, spokenSpans(t))))}”`
        : capitalize(endStop(pastTense(t)));
    if (followUp) {
      const q = briefingQuestion(dealer.random, 'follow-named', { ...slots, victim: view.victim.surname }, [], clue.text);
      if (q.length > 0) out.push({ text: `“${q}”`, voice: 'exchange' });
    }
    // Golden page 5: an observation is something the witness saw, and says so.
    const seen = register === 'truth' || register === 'evasion' ? sawLine(view, clue, person, spoken.text) : null;
    // "She" only when the answer has just said who; else the name.
    const aboutName = view.personById.get(clueAbout(clue) ?? '')?.surname;
    const named = aboutName !== undefined && new RegExp(`\\b${aboutName}\\b`).test(spoken.text);
    const extra = [seen, quoted ? factAbout(clue, named) : null].filter((x): x is string => x !== null);
    const said = say(spoken.text);
    let text = withBusiness(said);
    if (extra.length > 0 && quoted) {
      text =
        text !== said
          ? `${text} “${extra.join(' ')}”`
          : `${said.slice(0, -1)} ${extra.join(' ')}”`;
    }
    out.push({ text, voice: 'exchange', clueId: clue.id });
    for (const more of spoken.rest) {
      const q = briefingQuestion(dealer.random, 'follow-named', { ...slots, victim: view.victim.surname }, [], more);
      if (q.length > 0) out.push({ text: `“${q}”`, voice: 'exchange' });
      out.push({ text: say(more), voice: 'exchange', clueId: clue.id });
    }
  };

  if (scene.account) {
    const claimed = scene.account.rows.filter((r) => r.placeId !== null);
    const first = claimed[0];
    const lastRow = claimed[claimed.length - 1];
    const fact =
      first && lastRow
        ? `I was at ${localPlaces(view, view.placeById.get(first.placeId as Id)?.shortName ?? 'home')} and then where I said, ${
            first.tick === lastRow.tick ? spokenClock(first.tick) : spokenSpan(first.tick, lastRow.tick)
          }. All of it is in the book if you want the book.`
        : 'I was where I was and I could not tell you the hours of it.';
    out.push({ text: withBusiness(`“${fact}”`), voice: 'exchange' });
  }
  // Golden page 5: the carried question gets the name back, and then the
  // question it was carrying — where the subject was — before the answer.
  const first = scene.clues[0];
  const placed =
    first !== undefined &&
    subject !== undefined &&
    first.establishes.some(
      (f) => (f.kind === 'personAt' || f.kind === 'personNotAt') && f.personId === subject.id,
    );
  if (beat.carried && subject) {
    // "Nora Hanrahan. She's been with him since 'eighteen."
    const fact = first ? factAbout(first, true) : null;
    // M9 page bug: when the dossier line the witness gives says the relation
    // the question carried ("Lindemann owed Dandridge money." / "He has owed
    // Dandridge money since '23"), the question asks by name and the witness
    // says it once.
    if (fact !== null && sameRelation(question, fact, view)) {
      const asked = out.find((p) => p.text.endsWith(question));
      const plainAsk = `“Tell me about ${subject.surname}.”`;
      if (asked && asked.text.endsWith(question)) asked.text = `${asked.text.slice(0, -question.length)}${plainAsk}`;
    }
    out.push({ text: `“${nameReply(stage, person, subject)}${fact ? ` ${fact}` : ''}”`, voice: 'exchange' });
    if (placed) out.push({ text: `“Where was ${subject.surname} tonight?”`, voice: 'exchange' });
  }
  // M10 §A.1: the tellings after this say the answer, a family at a time.
  if (beat.told) return out.map((p) => ({ ...p, text: tidyPunctuation(p.text) }));
  scene.clues.forEach((clue, i) => answerClue(clue, i > 0));
  if (scene.self) {
    if (scene.self.told) {
      out.push({ text: fillTemplate(dealer.random.pick(SELF_ALREADY), { name: surname }), voice: 'exchange' });
    } else {
      const lines = scene.self.lines.filter((l) => l.trim().length > 0);
      if (lines.length > 0) out.push({ text: withBusiness(`“${lines.join(' ')}”`), voice: 'exchange' });
      if (scene.self.gossip) {
        const about = view.personById.get(scene.self.gossip.personId);
        out.push({
          text: `${surname} was not finished, and the rest of it was about ${about?.surname ?? 'somebody else'}. “${scene.self.gossip.text}”`,
          voice: 'exchange',
        });
      }
    }
  }
  if (scene.clues.length === 0 && !scene.account && !scene.self) {
    const line = fillTemplate(dealer.random.pick(NOTHING_ASKED), { name: surname });
    out.push({ text: line.length > 0 ? line : `${surname} had nothing for me.`, voice: 'exchange' });
  }
  if (scene.volunteer) {
    out.push({ text: `I had what I came for. ${surname} was not finished.`, voice: 'narrator' });
    answerClue(scene.volunteer, false);
  }
  return out.map((p) => ({ ...p, text: tidyPunctuation(p.text) }));
}

/**
 * Do two lines state the same relation? They share a content word once names
 * and the small words are set aside — "owed … money" and "has owed … money".
 */
export function sameRelation(a: string, b: string, view: Stage['view']): boolean {
  const names = new Set(view.kase.people.map((p) => p.surname.toLowerCase()));
  const small = new Set(['that', 'this', 'with', 'from', 'have', 'has', 'had', 'been', 'since', 'they', 'them', 'their', 'what', 'when', 'where', 'there', 'about', 'into', 'over', 'your', 'every']);
  const words = (t: string): Set<string> =>
    new Set(
      t
        .toLowerCase()
        .replace(/[’']s\b/g, '')
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3 && !names.has(w) && !small.has(w))
        .map((w) => w.replace(/(ing|ed|es|s)$/, '')),
    );
  // Two words in common — "owed … money" — is the same relation said again;
  // one ("Sweeney") is only the same people.
  const x = words(a);
  let shared = 0;
  for (const w of words(b)) if (x.has(w)) shared++;
  return shared >= 2;
}

/**
 * M10 §A.1: a question said as the detective's. “Sirkin had a creditor.
 * Vitale.” after the witness looked up reads as the witness speaking; with
 * the attribution after its first sentence it cannot.
 */
export function attributed(question: string): string {
  const m = /^“(.*)”$/.exec(question.trim());
  if (!m) return question;
  const inner = (m[1] as string).trim();
  const split = /^(.+?[.?!])\s+(.+)$/.exec(inner);
  const head = split ? (split[1] as string) : inner;
  const rest = split ? (split[2] as string) : '';
  const said = /\?$/.test(head) ? `“${head}” I asked.` : `“${head.replace(/[.!]$/, ',')}” I said.`;
  return rest.length > 0 ? `${said} “${rest}”` : said;
}

/**
 * The carried question's reply: the name the way this witness knows it —
 * “Carmine Vitale.”, “My landlord.”, or the face without the name.
 */
function nameReply(stage: Stage, speaker: Person, subject: Person): string {
  const edge = acquaintanceOf(stage.view.kase, speaker.id, subject.id);
  if (!edge || edge.strength === 'name') return `${subject.name}.`;
  if (edge.strength === 'relation') return `${capitalize(edge.ref)}.`;
  return 'I know the face. I couldn’t give you the name.';
}

/** The words of a deck-dealt question, quoted; a hand-written one when the deck has none. */
function familyQuestion(stage: Stage, family: Family, order: 'first' | 'later', gaps: string[]): string {
  const subject = family.subjectId ? stage.view.personById.get(family.subjectId) : undefined;
  const slots: Slots = { ...(subject ? { name: subject.surname, ...pronounsOf(subject) } : {}) };
  const is = (c: Card, tag: string, want: string): boolean => tagIs('followup', c, tag, want);
  const drawn = deal(
    stage,
    'followup',
    [
      (c) => is(c, 'part', 'open') && tagOf('followup', c, 'family') === family.kind && is(c, 'order', order),
      (c) => is(c, 'part', 'open') && is(c, 'family', family.kind) && is(c, 'order', order),
    ],
    slots,
  );
  if (drawn) return drawn.text;
  gaps.push(`no-card: followup has no open question for ${family.kind} × ${order}`);
  const fallback: Record<string, string> = {
    counts: '“Who came in tonight? All of it.”',
    strangers: '“And the ones you didn’t know?”',
    timing: '“When was that?”',
    event: '“What would anybody there know?”',
    evening: '“And you? Where were you?”',
    movements: subject ? `“And ${subject.surname}?”` : '“And the other one?”',
    knowing: subject ? `“And ${subject.surname}?”` : '“And the other one?”',
    thing: '“What else?”',
  };
  return fallback[family.kind] ?? '“What else?”';
}

const TAIL_CHANCE: Record<string, number> = { yap: 0.75, plain: 0.4, enigma: 0.15 };

/**
 * M10 §A.1 — one family of facts, told: the question (after the first), the
 * telling in the witness's words with its grounding, the follow-up where the
 * fact has a second half, and the tail. The fact-bearing sentences are the
 * engine's (`telling.ts`); everything around them is dealt, and says no case
 * fact at all.
 */
function tellingParas(
  stage: Stage,
  scene: Extract<Scene, { kind: 'ask' }>,
  beat: Extract<Beat, { kind: 'telling' }>,
  gaps: string[],
): {
  paras: Omit<Para, 'beats'>[];
  told: Told | null;
  parts: NonNullable<BeatTrace['parts']>;
  ticks: number[];
  personIds: Id[];
} {
  const { view, cast, dealer } = stage;
  const speaker = view.personById.get(scene.personId) as Person;
  const family = beat.family;
  const clues = family.clueIds.map((id) => view.findableById.get(id)).filter((c): c is Clue => c !== undefined);
  const subject = family.subjectId ? view.personById.get(family.subjectId) : undefined;
  const pro = subject ? pronounsOf(subject) : undefined;
  const temper = temperOf(cast, speaker.id);
  const strength = subject && view.kase.logic ? acquaintanceOf(view.kase, speaker.id, subject.id)?.strength : undefined;
  const knows = strength ?? 'any';
  const paras: Omit<Para, 'beats'>[] = [];
  const parts: NonNullable<BeatTrace['parts']> = { told: [] };
  const personIds = [speaker.id, ...(subject ? [subject.id] : [])];

  /* the question, for every family after the first */
  if (!beat.first) {
    const q = familyQuestion(stage, family, 'later', gaps);
    parts.question = q;
    paras.push({ text: q, voice: 'exchange' });
  }

  /* what they said: the engine's sentences, or the old kinds' own voice */
  let told = toldOf(view, family, clues, speaker, stage.at);
  let spokenAloud = true;
  if (told === null) {
    const first: string[] = [];
    for (const clue of clues) {
      const register = registerFor(view, speaker.id, clue);
      const spoken = speakClue(dealer, view, cast, clue, speaker, register, { detective: stage.detectiveName }, gaps);
      const lines = [spoken.text, ...spoken.rest];
      // In a logic game the place a witness names is the place in the notebook.
      const local = (l: string): string => (view.kase.logic ? l : localPlaces(view, l));
      if (spoken.mode === 'utterance') first.push(...lines.map((l) => endStop(capitalize(local(spokenSpans(l))))));
      else if (spoken.mode === 'quote') first.push(...lines.flatMap((l) => saidPlainly(local(l))));
      else {
        // A record the witness has no words for is the detective's to say.
        spokenAloud = false;
        first.push(...lines.map((l) => capitalize(endStop(pastTense(l)))));
      }
    }
    const ticks: Tick[] = [];
    for (const c of clues) for (const f of c.establishes) {
      if ('tick' in f) ticks.push(f.tick);
      if ('ticks' in f) ticks.push(...f.ticks);
    }
    told = { first, second: [], ticks, people: personIds };
    if (family.kind === 'thing' && subject && (strength === undefined || strength === 'name' || strength === 'relation') && spokenAloud) {
      told.follow = 'sure';
    }
  }
  parts.told = [...told.first, ...told.second];
  for (const id of told.people) if (!personIds.includes(id)) personIds.push(id);

  if (!spokenAloud) {
    paras.push({ text: told.first.join(' '), voice: 'exchange', clueId: family.clueIds[0] as Id });
    return { paras, told, parts, ticks: told.ticks, personIds };
  }

  /* the grounding: how they know */
  const role = speaker.kind === 'fixture' && speaker.fixtureRole ? speaker.fixtureRole : 'suspect';
  const half = told.follow ? 'second' : 'first';
  const g = (c: Card, tag: string, want: string): boolean => tagIs('grounding', c, tag, want);
  const exact = (c: Card, tag: string, want: string): boolean => tagOf('grounding', c, tag) === want;
  const grounding = deal(
    stage,
    'grounding',
    [
      (c) => exact(c, 'role', role) && exact(c, 'family', family.kind) && g(c, 'knows', knows) && g(c, 'half', half),
      (c) => exact(c, 'role', role) && g(c, 'family', family.kind) && g(c, 'knows', knows) && g(c, 'half', half),
      (c) => g(c, 'role', role) && exact(c, 'family', family.kind) && g(c, 'knows', knows) && g(c, 'half', half),
      (c) => g(c, 'role', role) && g(c, 'family', family.kind) && g(c, 'knows', knows) && g(c, 'half', half),
    ],
    pro ? { ...pro } : {},
  );
  if (grounding) parts.grounding = grounding.text;
  else gaps.push(`no-card: grounding has nothing for ${role} × ${family.kind} × ${knows}`);

  /* the tail: attitude, never a fact; not every time */
  let tail: string | undefined;
  // Golden rule 8: flavor is one line at most, and a long answer does without.
  const long = told.first.length + (told.follow ? told.second.length : 0) >= 5;
  if (!long && dealer.random.chance(TAIL_CHANCE[temper] ?? 0.5)) {
    const t = (c: Card, tag: string, want: string): boolean => tagIs('tail', c, tag, want);
    const drawn = deal(
      stage,
      'tail',
      [
        (c) => tagOf('tail', c, 'family') === family.kind && t(c, 'temper', temper) && t(c, 'knows', knows),
        (c) => t(c, 'family', family.kind) && t(c, 'temper', temper) && t(c, 'knows', knows),
      ],
      pro ? { ...pro } : {},
    );
    if (drawn) {
      tail = drawn.text;
      parts.tail = tail;
    }
  }

  /* the frame: the first half, said */
  const firstSaid = [
    ...told.first,
    ...(told.follow ? [] : [parts.grounding, tail].filter((x): x is string => x !== undefined)),
  ].join(' ');
  const sp = pronounOf(speaker) === 'she';
  const frameSlots: Slots = {
    told: firstSaid,
    speaker: speaker.surname,
    they: sp ? 'she' : 'he',
    them: sp ? 'her' : 'him',
    their: sp ? 'her' : 'his',
  };
  const f = (c: Card, tag: string, want: string): boolean => tagIs('telling', c, tag, want);
  const frame = deal(
    stage,
    'telling',
    [
      (c) => tagOf('telling', c, 'family') === family.kind && f(c, 'temper', temper) && f(c, 'knows', knows),
      (c) => f(c, 'family', family.kind) && f(c, 'temper', temper) && f(c, 'knows', knows),
      (c) => f(c, 'family', family.kind) && f(c, 'knows', knows),
    ],
    frameSlots,
  );
  const answer = frame?.text ?? `“${firstSaid}”`;
  if (frame) parts.frame = frame.text.replace(firstSaid, '{told}');
  paras.push({ text: answer, voice: 'exchange', clueId: family.clueIds[0] as Id });

  /* the follow-up, and the second half */
  if (told.follow) {
    const is = (c: Card, tag: string, want: string): boolean => tagIs('followup', c, tag, want);
    const drawn = deal(
      stage,
      'followup',
      [(c) => is(c, 'part', 'second') && tagOf('followup', c, 'ask') === told.follow && is(c, 'family', family.kind)],
      subject ? { name: subject.surname, ...pronounsOf(subject) } : {},
    );
    const fallback =
      told.follow === 'rest'
        ? '“And the rest of the evening?”'
        : told.follow === 'other'
          ? '“Any other time?”'
          : `“You’re sure it was ${subject?.surname ?? 'them'}?”`;
    const q = drawn?.text ?? fallback;
    parts.followup = q;
    paras.push({ text: q, voice: 'exchange' });
    const second = [...told.second, parts.grounding, tail].filter((x): x is string => x !== undefined && x.length > 0);
    if (second.length > 0) paras.push({ text: `“${second.join(' ')}”`, voice: 'exchange' });
  }
  return { paras: paras.map((p) => ({ ...p, text: tidyPunctuation(p.text) })), told, parts, ticks: told.ticks, personIds };
}

/** The confront deck's slots for one person: the surname, the pronouns, where and when. */
function confrontSlots(stage: Stage, person: Person, placeId?: Id, tick?: Tick): Slots {
  const she = pronounOf(person) === 'she';
  return {
    detective: stage.detectiveName,
    subject: person.surname,
    place: placeId ? stage.view.placeById.get(placeId)?.shortName : undefined,
    time: tick === undefined ? undefined : spokenClock(tick),
    they: she ? 'she' : 'he',
    them: she ? 'her' : 'him',
    their: she ? 'her' : 'his',
  };
}

/**
 * The fact as the detective reads it to them: the clue's own sentence, with
 * the hours said the way people say them, and "you" where the sentence saw or
 * placed the one it is being read to.
 */
export function putLine(view: Stage['view'], clue: Clue, person: Person): string {
  void view;
  let text = spokenSpans(clue.text).trim();
  const name = person.surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp(`\\b(saw|see|seen|heard|placed|puts|put|noticed|spotted) ${name}\\b`, 'g'), '$1 you');
  return endStop(capitalize(text));
}

/**
 * M9 §3 — a confrontation, in the golden's shape: the approach (or what they
 * stopped doing), the fact read to them, what they did on hearing it (the
 * confront deck's `reaction`), and their words — the generator's own, or, for
 * a fact that touches nothing, the line the spec gives them.
 */
function confrontParas(
  stage: Stage,
  scene: Extract<Scene, { kind: 'confront' }>,
  beat: Extract<Beat, { kind: 'confront' }>,
  gaps: string[],
): Omit<Para, 'beats'>[] {
  const { view, dealer } = stage;
  const person = view.personById.get(scene.personId) as Person;
  const surname = person.surname;
  const out: Omit<Para, 'beats'>[] = [];
  const opening: string[] = [];
  if (beat.stops) {
    const doing = stage.memory?.activities[person.id]?.text;
    const stopped = doing ? stoppedDoing(doing, surname) : null;
    opening.push(stopped ?? fillTemplate(dealer.random.pick(STOP_LINES), { name: surname, pronoun: pronounOf(person) }));
  } else {
    const again = stage.memory?.activities[person.id]?.stopped === true;
    opening.push(fillTemplate(dealer.random.pick(again ? APPROACH_AGAIN : APPROACH), { name: surname }));
  }
  opening.push(`I read ${pronounOf(person) === 'she' ? 'her' : 'him'} a line out of the notebook. “${putLine(view, scene.clue, person)}”`);
  out.push({ text: opening.join(' '), voice: 'exchange' });
  const slots = confrontSlots(stage, person, beat.placeId, beat.tick);
  const reaction = deal(
    stage,
    'confront',
    [(c) => tagIs('confront', c, 'outcome', beat.outcome) && tagIs('confront', c, 'part', 'reaction')],
    slots,
  );
  // A story held is said again in their words, the hours the way people say them.
  const held = scene.judged.response?.kind === 'hold' ? scene.judged.claimed : undefined;
  const heldPlace = held ? view.placeById.get(held.place)?.shortName : undefined;
  const words =
    held && heldPlace
      ? `“I told you where I was. ${capitalize(heldPlace)}, ${whenSaid(held.ticks)}.”`
      : (scene.judged.response?.text ?? '');
  if (beat.outcome === 'wrong') {
    out.push({
      text: reaction?.text ?? `${surname} heard me out. “That doesn’t touch anything I told you.”`,
      voice: 'exchange',
    });
  } else {
    // Their words: quoted speech stays as it is; a plain line ("Marchetti
    // has nothing more to say about it.") is narration, in the past tense.
    const said = /^[“"]/.test(words) ? words : endStop(pastTense(words));
    out.push({ text: `${reaction?.text ?? `${surname} took a moment.`} ${said}`.trim(), voice: 'exchange' });
  }
  if (!reaction) gaps.push(`no-card: confront has no reaction for ${beat.outcome}`);
  return out.map((p) => ({ ...p, text: tidyPunctuation(p.text) }));
}

/**
 * "Lefkowitz stopped racking a set of cues along the wall and looked up as I
 * came over." — from the activity the page gave them, when it is something
 * they were in the middle of ("was racking…"); null when it is not ("was at
 * a table with a coffee"), and the stop line stands alone.
 */
export function stoppedDoing(activity: string, surname: string): string | null {
  const m = new RegExp(`^${surname} was ([a-z]+ing)\\b([^,.;]*)`).exec(activity.trim());
  if (!m) return null;
  const verb = m[1] as string;
  if (/^(waiting|sitting|standing|leaning|nursing|keeping|watching|smoking|drinking|eating|looking)$/.test(verb)) return null;
  const rest = (m[2] ?? '').replace(/\s+(?:and|while|without)\b.*$/, '').trimEnd();
  return `${surname} stopped ${verb}${rest} and looked up as I came over.`;
}

/**
 * "I saw her there." — an observation places the one who made it (§5), and
 * the witness says so in the answer, unless the answer already has.
 */
function sawLine(view: Stage['view'], clue: Clue, speaker: Person, said: string): string | null {
  if (clue.kind !== 'observation' || clue.source.type !== 'person' || clue.source.personId !== speaker.id) return null;
  if (/\b(saw|seen|see|watched|noticed|spotted|eyes)\b/i.test(said)) return null;
  const placed = clue.establishes.find((f) => f.kind === 'personAt' && f.personId !== speaker.id);
  if (!placed || placed.kind !== 'personAt') return null;
  const who = view.personById.get(placed.personId);
  if (!who || who.id === view.victim.id) return null;
  return `I saw ${pronounOf(who) === 'she' ? 'her' : 'him'} there.`;
}

/**
 * The dossier fact a clue hands the notebook about the one it is about
 * (layer 2, M5 §1.1), in the witness's mouth: "Hanrahan keeps Sweeney's
 * diary" is "She keeps Sweeney's diary". Only a fact this page credits, only
 * one that names nobody else, and never what somebody wants out of life.
 */
function followUpFact(stage: Stage, clue: Clue, aboutId: Id, speakerId: Id, pronoun = true): string | null {
  const { view } = stage;
  if (layerOfClue(clue) !== 2) return null;
  const before = layerCredit(view, aboutId, stage.foundBefore, 2);
  const after = layerCredit(view, aboutId, stage.foundAfter, 2);
  if (after <= before) return null;
  const about = view.personById.get(aboutId);
  if (!about) return null;
  const line = layerSentences(about, 2)[before];
  if (!line) return null;
  const others = [...view.kase.people, ...view.kase.mentions].filter(
    (p) => p.id !== aboutId && p.id !== view.victim.id && p.id !== speakerId,
  );
  if (others.some((o) => new RegExp(`\\b${o.surname}\\b`).test(line))) return null;
  if (new RegExp(`^${about.surname} wants\\b`).test(line)) return null;
  const head = pronoun ? (pronounOf(about) === 'she' ? 'She' : 'He') : about.surname;
  return line
    .replace(new RegExp(`^${about.surname}\\b`), head)
    .replace(/, (since|for years|going back|three years|four years)/, ' $1')
    .replace(/'/g, '’');
}

/** For the tests: every sentence of a realized page, in order. */
export function sentencesOfBlocks(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.kind === 'prose' || b.kind === 'note' ? sentencesOf(b.text) : []));
}
