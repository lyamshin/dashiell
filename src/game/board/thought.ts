/**
 * docs/44: the thought, from the engine and never from a card. After each job
 * the detective says, in one to three plain sentences, what the new fact
 * touches among the facts already held, by name: the same place, the same
 * hour, the means, the scene's street, an agreement, a collision. It's where
 * the player is shown which two facts touch.
 *
 * It says only what the solver makes of what's held (the solver run on the
 * questions asked, never the truth), and never more: "something under a
 * coat", not the dog's name, until the board says whose coat. The thought on
 * the page that settles it may walk the elimination, at Medium and below; at
 * Hard-boiled the last step is the player's.
 */

import type { Solved } from '../../gen/board/solver.js';
import type { Line } from './knowledge.js';
import { accountOf, collisionsOf, linesHeld, listExhaustive, listOf, solveHeld } from './knowledge.js';
import {
  andList,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  oclock,
  personOf,
  placeName,
  pronOf,
  solverHeld,
  suspectsOf,
  victimOf,
  type BoardCase,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';
import { sourceName } from './stars.js';

export interface Thought {
  sentences: string[];
  /** Held lines, questions or office lines (`givens:<kind>`) the thought ties the new fact to. */
  refs: string[];
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
}

function blank(): Thought {
  return { sentences: [], refs: [], hours: [], people: [], places: [] };
}

/* ------------------------------------------------------------------ *
 * Lines said as the detective puts them to himself.
 * ------------------------------------------------------------------ */

/** "the Odessa at ten", or "home at ten" when it's their own. */
export function claimSaid(c: BoardCase, p: PersonId, h: Hour): string {
  const cl = accountOf(c, p)?.claims[h];
  const own = personOf(c, p)?.home === cl?.place;
  return `${own ? 'home' : placeName(c, cl?.place ?? '')} at ${hourWord(h)}`;
}

/** A breaking line, said as the detective would put it to himself. */
export function breakSaid(c: BoardCase, l: Line, p: PersonId, asked: readonly string[] = []): string {
  if (l.kind === 'list') {
    const lst = listOf(c, l.speaker as PersonId);
    const es = lst?.entries[l.hour as Hour] ?? [];
    // A face is somebody's once their look is known: "somebody with a cane (Bledsoe, by the cane)".
    // Only somebody met (their own evening taken) can be matched to a face.
    const faceOf = (look: string) => c.people.find((x) => x.look === look && x.role === 'suspect' && asked.includes(`account:${x.id}`));
    const names = es
      .map((e) => ('person' in e ? nameOf(c, e.person) : 'other' in e ? (c.others?.find((o) => o.id === e.other)?.name ?? '') : `somebody ${e.look}`))
      .filter(Boolean)
      .map((n) => shortOther(n));
    const faces = es.flatMap((e) => ('look' in e && faceOf(e.look) ? [`the only one ${e.look} was ${nameOf(c, faceOf(e.look)?.id ?? '')}`] : []));
    const faceTail = faces.length ? `; ${faces.join('; ')}` : '';
    const at = placeName(c, l.place as PlaceId);
    const onIt = es.some((e) => 'person' in e && e.person === p);
    if (onIt) return `${nameOf(c, l.speaker as PersonId)} had ${nameOf(c, p)} at ${at} at ${oclock(l.hour as Hour)}`;
    if (names.length === 0) return `${nameOf(c, l.speaker as PersonId)} had nobody at ${at} at ${oclock(l.hour as Hour)}`;
    return `${nameOf(c, l.speaker as PersonId)} had ${andList(names)} at ${at} at ${oclock(l.hour as Hour)}${lst && listExhaustive(c, lst, l.hour as Hour) ? ', and nobody else' : ''}${faceTail}`;
  }
  if (l.kind === 'claim') {
    const sp = l.speaker as PersonId;
    const cl = accountOf(c, sp)?.claims[l.hour as Hour];
    const comp = (cl?.company ?? []).map((x) => nameOf(c, x));
    return `${nameOf(c, sp)} had ${pronOf(c, sp).self} at ${placeName(c, cl?.place ?? '')} at ${oclock(l.hour as Hour)}, ${comp.length ? `with ${andList(comp)}` : 'on ' + pronOf(c, sp).his + ' own'}`;
  }
  if (l.kind === 'remark') return remarkSaid(c, l);
  if (l.kind === 'given' || l.kind === 'find') return l.text.replace(/^[^:]+: /, '').replace(/[.”]+$/, '').replace(/^“/, '');
  return l.text.replace(/\.$/, '');
}

/** A standing fact said once: "Mr. Prentiss telling the room about his key" is "Mr. Prentiss" in a later breath; "Lou the bookmaker in his back booth" is Lou. */
export function shortOther(name: string): string {
  return name
    .replace(/ (telling|complaining) .*$/, '')
    .replace(/^(Lou|Pardo|Benny)\b.*$/, '$1')
    .replace(/^a man called (\w+).*$/, '$1')
    .replace(/^a pawnbroker’s runner called (\w+).*$/, '$1');
}

/**
 * A remark that places somebody, said as the detective tells it to himself. The generator's
 * remarks are a closed few: the side remark ("Walking over to the Odessa at ten I passed Feldman
 * on Ludlow Street, going fast, no hat") and the neighbour who had the pet for an hour.
 */
export function remarkSaid(c: BoardCase, l: Line): string {
  const sp = l.speaker as PersonId;
  const m = /^Walking over to (.+?) at (\w+) I passed (\S+) on (.+?), (.+?)\.$/.exec(l.text.replace(/^[^:]+: “/, '').replace(/”$/, ''));
  // The remark's own words ("going fast, no hat") are its speaker's: the thought points at it, it doesn't say it again.
  if (m) return `${nameOf(c, sp)} passed ${m[3]} on ${m[4]} at ${m[2]}`;
  const k = /^I had (.+?) at my place at (\w+)/.exec(l.text.replace(/^[^:]+: “/, ''));
  if (k) return `${nameOf(c, sp)} had ${k[1]} at ${pronOf(c, sp).his} place at ${k[2]}`;
  return l.text.replace(/^[^:]+: /, '').replace(/[.”]+$/, '').replace(/^“/, '');
}

/** "here", or the place by name. */
function where(c: BoardCase, pl: PlaceId, here: PlaceId): string {
  return pl === here ? 'here' : placeName(c, pl);
}

/** "here", or "at the Thalia". */
function atWhere(c: BoardCase, pl: PlaceId, here: PlaceId): string {
  return pl === here ? 'here' : `at ${placeName(c, pl)}`;
}

/** How the means was had, said of one person: "heard about the key", "been at Rafferty’s while the chloral was on the shelf". */
function accessPhrase(c: BoardCase, yes: boolean, again = false): string {
  const mode = c.setup?.means ?? '';
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
  const origin = placeName(c, c.means.origin);
  // `again`: the same fact a second time tonight, in other words (the elimination recaps it).
  if (isMurder(c)) {
    const m = c.means.name.replace(/^(a|an) /, '');
    if (again) return yes ? `could have had the ${m}` : `had no way to the ${m}`;
    return yes ? `had been at ${origin} while the ${m} was there` : `was never at ${origin} while the ${m} was there`;
  }
  if (party) return yes ? (again ? `had been at the ${party.occasion} to learn the way in` : `was at the ${party.occasion}`) : again ? `never learnt the way in` : `wasn’t at the ${party.occasion}`;
  if (/^told/.test(mode)) {
    const thing = mode === 'told-window' ? 'window' : 'key';
    if (again) return yes ? `had heard about the ${thing}` : `hadn’t heard about the ${thing} at all`;
    return yes ? `heard ${clientOf(c).short} tell the room about the ${thing}` : `never heard ${clientOf(c).short} tell the room`;
  }
  if (again) return yes ? `could have had the spare key` : `had no way to the spare key`;
  return yes ? `had been in at ${origin} while the spare key was there` : `was never in at ${origin} while the spare key was there`;
}

/* ------------------------------------------------------------------ *
 * The thought.
 * ------------------------------------------------------------------ */

export interface ThoughtCtx {
  c: BoardCase;
  before: BoardRun;
  run: BoardRun;
  /** The question the page asked: `account:p`, `list:w`, `search:f`, `motive:p`, `confront:p@h`. */
  q: string;
  /** Where the detective stands. */
  here: PlaceId;
  /** Whether the elimination may be walked to its last step (Medium and below). */
  lastStep: boolean;
  /** A shuffle for the few hand-written joins, so two pages don't say them alike. */
  pick: (key: string, lines: readonly string[]) => string;
}

export function thoughtOf(x: ThoughtCtx): Thought {
  const { c, before, run, q, here } = x;
  const t = blank();
  const b = solveHeld(c, solverHeld(before));
  const a = solveHeld(c, solverHeld(run));
  const [kind, rest] = q.split(':') as [string, string];
  const add = (s: string, refs: string[], o: { hours?: Hour[]; people?: PersonId[]; places?: PlaceId[] } = {}) => {
    t.sentences.push(s);
    t.refs.push(...refs);
    t.hours.push(...(o.hours ?? []));
    t.people.push(...(o.people ?? []));
    t.places.push(...(o.places ?? []));
  };
  const before_ = linesHeld(c, before);
  const heldBefore = new Set(before_.map((l) => l.id));
  // People a sentence has already placed this page: a later one needn't place them again.
  const covered = new Set<PersonId>();
  const heldBeforeQs = new Set(solverHeld(before));
  const win = b.possibleHours.length ? b.possibleHours : c.crime.window;
  const winFirst = (hs: Hour[]) => [...hs].sort((u, v) => Number(win.includes(v)) - Number(win.includes(u)) || u - v);

  // 1. A lie caught: their line and the line that breaks it, side by side. Never a verdict.
  const fresh = collisionsOf(c, run).filter((col) => b.status.get(`${col.person}@${col.hour}`)?.s !== 'broken');
  const caught = new Set<string>();
  for (const col of fresh.slice(0, 2)) {
    const br = col.breakers[0];
    if (!br) continue;
    const p = col.person;
    caught.add(`${p}@${col.hour}`);
    // The line that breaks it is about them: once named, they're "her" in it ("Ashby passed her on Stuyvesant Street").
    const said = breakSaid(c, br, p, run.asked).replace(new RegExp(`\\b(had|passed|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), `$1 ${pronOf(c, p).him}`);
    const people = [p, ...br.about, ...(br.speaker ? [br.speaker] : []), ...c.people.filter((y) => !y.object && said.includes(y.short)).map((y) => y.id)];
    const two = x.pick('two-stories', [
      'One of them was wrong.',
      `Two stories about ${pronOf(c, p).him} at the same hour, and only one of them could stand.`,
      `They couldn’t both be true, and ${br.kind === 'list' ? `${nameOf(c, br.speaker as PersonId)} had no reason to be the wrong one` : 'I knew which one I’d bet on'}.`,
    ]);
    const refs = [col.claim.id, br.id].filter((id) => heldBefore.has(id));
    add(`${nameOf(c, p)} said ${claimSaid(c, p, col.hour)}. ${cap(said)}. ${two}`, refs.length ? refs : [col.claim.id], {
      hours: [col.hour],
      people,
      places: [accountOf(c, p)?.claims[col.hour]?.place ?? '', ...(br.place ? [br.place] : [])],
    });
  }

  // 2. An account that says what something held already said: "So here at eleven, with Feeney, which was what Coffin had."
  if (kind === 'account') {
    const ac = accountOf(c, rest);
    const bySrc = new Map<string, { hs: Hour[]; refs: string[]; place: PlaceId[] }>();
    for (const h of winFirst(c.board.hours)) {
      const cl = ac?.claims[h];
      if (!cl || caught.has(`${rest}@${h}`)) continue;
      for (const l of before_) {
        if (l.hour !== h || l.place !== cl.place || !l.about.includes(rest) || l.speaker === rest) continue;
        if (l.kind !== 'list' && l.kind !== 'claim' && l.kind !== 'admit' && l.kind !== 'given') continue;
        const src = l.kind === 'given' ? `${clientOf(c).short} had said` : l.kind === 'list' ? `${nameOf(c, l.speaker as PersonId)} had` : `${nameOf(c, l.speaker as PersonId)} had said`;
        const g = bySrc.get(src) ?? { hs: [], refs: [], place: [] };
        if (!g.hs.includes(h)) {
          g.hs.push(h);
          g.place.push(cl.place);
        }
        g.refs.push(l.id);
        bySrc.set(src, g);
      }
    }
    const best = [...bySrc.entries()].sort((u, v) => Number(v[1].hs.some((h) => win.includes(h))) - Number(u[1].hs.some((h) => win.includes(h))) || v[1].hs.length - u[1].hs.length)[0];
    // The one who said so is placed by this evening in turn: that's the same agreement, not a second one.
    if (best) for (const y of c.people) if (best[0].startsWith(`${y.short} `)) covered.add(y.id);
    if (best && !(a.who !== undefined && b.who === undefined) && !(t.sentences.length > 0 && t.sentences.some((x) => x.includes(best[0].replace(/ had( said)?$/, ''))))) {
      const [src, g] = best;
      const namedSoFar = new Set<string>();
      const bits = g.hs.slice(0, 2).map((h, i) => {
        const cl = ac?.claims[h];
        const comp = (cl?.company ?? []).map((y) => nameOf(c, y)).filter((y) => !src.startsWith(`${y} `) && !namedSoFar.has(y));
        for (const y of comp) namedSoFar.add(y);
        const own = personOf(c, rest)?.home === cl?.place && cl?.place !== here;
        return `${own ? 'home' : where(c, g.place[i] as PlaceId, here)} at ${hourWord(h)}${comp.length ? `, with ${andList(comp)}` : ''}`;
      });
      const ppl = g.hs.flatMap((h) => ac?.claims[h]?.company ?? []);
      const held = g.hs.some((h) => win.includes(h));
      const pr = pronOf(c, rest);
      // First, the golden's "So … which was what Coffin had." After a lie caught, the same from the other side.
      const text =
        t.sentences.length === 0
          ? `So ${andList(bits)}, which was what ${src}. ${held ? x.pick('one-holds', ['One evening that held, at an hour that mattered, where I could check it.', 'That much of it stood up, and it stood up where I could check it.', 'At an hour that mattered, somebody else’s word was under it.']) : x.pick('one-holds-early', ['That part of the evening, at least, had somebody else’s word under it.', 'So far as it went, it stood up.'])}`
          : `The rest held where I could check it: ${src.replace(/ had( said)?$/, '')} had ${pr.him} ${(namedSoFar.clear(), andList)(
              g.hs.slice(0, 2).map((h, i) => {
                const cl = ac?.claims[h];
                // The source is the one saying so: "with" names only the others, and anybody named already isn't named again.
                const comp = (cl?.company ?? []).map((y) => nameOf(c, y)).filter((y) => !src.startsWith(`${y} `) && !t.sentences.some((x) => x.includes(y)) && !namedSoFar.has(y));
                for (const y of comp) namedSoFar.add(y);
                return `${atWhere(c, g.place[i] as PlaceId, here)} at ${hourWord(h)}${comp.length ? `, with ${andList(comp)}` : ''}`;
              }),
            )}, same as ${pr.he} said.`;
      add(
        text.replace(/(\w), (with [^,]+) and (here|at|home)\b/, '$1, $2, and $3'),
        g.refs,
        { hours: g.hs.slice(0, 2), people: [rest, ...ppl, ...c.people.filter((y) => src.startsWith(`${y.short} `)).map((y) => y.id)], places: g.place },
      );
    }
  }

  // 3. A list that says what an account held already said.
  if (kind === 'list') {
    const l = listOf(c, rest);
    const agreed: { p: PersonId; h: Hour; id: string }[] = [];
    for (const ln of before_) {
      if (ln.kind !== 'claim' || ln.place !== l?.place || ln.hour === undefined) continue;
      const sp = ln.speaker as PersonId;
      if (caught.has(`${sp}@${ln.hour}`)) continue;
      if ((l?.entries[ln.hour] ?? []).some((e) => 'person' in e && e.person === sp) && !agreed.some((y) => y.p === sp)) agreed.push({ p: sp, h: ln.hour, id: ln.id });
    }
    for (const y of agreed) covered.add(y.p);
    if (agreed.length && l) {
      const one = agreed[0] as { p: PersonId; h: Hour };
      add(
        agreed.length === 1
          ? `${nameOf(c, l.watcher)} had ${t.sentences.some((x) => x.includes(nameOf(c, one.p))) ? pronOf(c, one.p).him : nameOf(c, one.p)} ${atWhere(c, l.place, here)} at ${hourWord(one.h)}, same as ${pronOf(c, one.p).he} said.`
          : `${nameOf(c, l.watcher)} had ${andList(agreed.map((y) => `${nameOf(c, y.p)} at ${hourWord(y.h)}`))}, same as they’d said.`,
        agreed.map((y) => y.id),
        { hours: agreed.map((y) => y.h), people: agreed.map((y) => y.p), places: [l?.place ?? ''] },
      );
    }
  }

  // 4. The window narrowed, by somebody who saw him alive, or had the dog.
  if (b.possibleHours.length > 1 && a.possibleHours.length === 1) {
    const gone = b.possibleHours.filter((h) => !a.possibleHours.includes(h));
    const h1 = a.possibleHours[0] as Hour;
    const seen = gone.map((h) => ({ h, x: a.placed.get(`${c.crime.victim}@${h}`) })).find((y) => y.x);
    if (seen?.x) {
      const v = victimOf(c);
      const opts = `${hourWord(b.possibleHours[0] as Hour)} or ${hourWord(b.possibleHours[1] as Hour)}`;
      add(
        isMurder(c)
          ? `The office had given me ${opts}. ${v.short} was at ${placeName(c, seen.x.place)} at ${hourWord(seen.h)}, alive. So whatever happened to him happened at ${oclock(h1)}.`
          : `The office had given me ${opts}. At ${hourWord(seen.h)} ${v.short} was ${atWhere(c, seen.x.place, here)}. So it went at ${oclock(h1)}.`,
        ['givens:clock'],
        { hours: [seen.h, h1, ...b.possibleHours], people: [c.crime.victim], places: [seen.x.place] },
      );
    }
  }

  // 5. The scene's street: a side remark puts somebody on it at an hour that matters.
  if (kind === 'account') {
    const ac = accountOf(c, rest);
    const street = c.places.find((p) => p.id === c.crime.scene)?.street;
    for (const r of ac?.remarks ?? []) {
      if (!street || !r.text.includes(` on ${street}`)) continue;
      const m = /I passed (\S+) on .+? at (\w+)|at (\w+) I passed (\S+) on/.exec(r.text);
      const name = m?.[1] ?? m?.[4];
      const hh = m?.[2] ?? m?.[3];
      const tail = /, ([^,]+, [^,.]+)\.$/.exec(r.text)?.[1];
      const who = c.people.find((p) => p.short === name);
      void tail;
      void hh;
      add(
        `The part worth keeping came last. ${isMurder(c) ? `${street} was where ${victimOf(c).short} lived.` : `${street} was where ${clientOf(c).short} kept ${victimOf(c).short}.`}`,
        ['givens:gone'],
        { people: [c.client, c.crime.victim, ...(who ? [who.id] : [])], places: [c.crime.scene], hours: r.facts.map((f) => f.h) },
      );
    }
  }

  // 6. Who had the way in: new from this page, said by name and hour.
  if ((kind === 'list' || (kind === 'account' && t.sentences.length === 0)) && !(a.who !== undefined && b.who === undefined)) {
    const yes = suspectsOf(c).filter((p) => a.accessYes.has(p) && !b.accessYes.has(p));
    const no = suspectsOf(c).filter((p) => a.accessNo.has(p) && !b.accessNo.has(p));
    if (yes.length + no.length > 0) {
      const firstAt = (p: PersonId): Hour | undefined => c.means.available.find((h) => a.placed.get(`${p}@${h}`)?.place === c.means.origin);
      const mode = c.setup?.means ?? '';
      const parts: string[] = [];
      const hs: Hour[] = [];
      if (/^told/.test(mode) && yes.every((p) => firstAt(p) !== undefined) && yes.length > 0) {
        const thing = mode === 'told-window' ? 'the window' : 'the key';
        const byHour = new Map<Hour, PersonId[]>();
        for (const p of yes) byHour.set(firstAt(p) as Hour, [...(byHour.get(firstAt(p) as Hour) ?? []), p]);
        const gs = [...byHour.entries()].sort((u, v) => u[0] - v[0]);
        parts.push(`${gs.map(([h, ps], i) => (i === 0 ? `${andList(ps.map((y) => nameOf(c, y)))} heard about ${thing} at ${hourWord(h)}` : `${andList(ps.map((y) => nameOf(c, y)))} at ${hourWord(h)}`)).join(', and ')}.`);
        hs.push(...gs.map(([h]) => h));
      } else if (yes.length > 0) {
        parts.push(`${andList(yes.map((p) => nameOf(c, p)))} ${accessPhrase(c, true).replace(/^was\b/, yes.length > 1 ? 'were' : 'was')}.`);
      }
      if (no.length > 0) parts.push(`${andList(no.map((p) => nameOf(c, p)))} ${accessPhrase(c, false).replace(/^was\b/, no.length > 1 ? 'were' : 'was').replace(/^wasn’t\b/, no.length > 1 ? 'weren’t' : 'wasn’t')}.`);
      add(parts.map((y) => cap(y)).join(' '), ['givens:means'], { people: [...yes, ...no, c.client], hours: hs, places: [c.means.origin] });
    }
  }

  // 7. Placements: somebody put somewhere at an hour that matters, by this page and an earlier word, or by this page's word.
  const settles = a.who !== undefined && b.who === undefined;
  if (t.sentences.length < 3 && !settles && (kind === 'account' || kind === 'list' || kind === 'confront')) {
    const hs = a.possibleHours.length === 1 ? a.possibleHours : win;
    const groups = new Map<string, { src: string; items: { p: PersonId; place: PlaceId; h: Hour }[]; refs: string[] }>();
    for (const p of suspectsOf(c)) {
      if ((kind === 'account' && p === rest) || covered.has(p)) continue;
      for (const h of hs) {
        const k = `${p}@${h}`;
        const now = a.placed.get(k);
        if (!now || b.placed.has(k) || now.place === c.crime.scene) continue;
        if (!now.deps.includes(q)) continue;
        const others = now.deps.filter((d) => d !== `account:${p}`);
        if (others.length === 0) continue;
        const srcQ = others.includes(q) ? q : (others.find((d) => heldBeforeQs.has(d)) ?? (others[0] as string));
        const src = sourceName(c, srcQ).replace(/’s (list|story)$/, '’s word');
        const g = groups.get(src) ?? { src, items: [], refs: [] };
        g.items.push({ p, place: now.place, h });
        g.refs.push(...now.deps.filter((d) => heldBeforeQs.has(d)));
        groups.set(src, g);
        break;
      }
    }
    for (const g of [...groups.values()].slice(0, 2)) {
      // People at one place at one hour run together: "Wehrle and Mulcahy here at ten".
      const runs = new Map<string, { ps: PersonId[]; place: PlaceId; h: Hour }>();
      for (const y of g.items) {
        const r = runs.get(`${y.place}@${y.h}`) ?? { ps: [], place: y.place, h: y.h };
        r.ps.push(y.p);
        runs.set(`${y.place}@${y.h}`, r);
      }
      // Somebody the thought has just been about is "him" here, when they're the only one placed.
      const lastSaid = t.sentences[t.sentences.length - 1] ?? '';
      const only = g.items.length === 1 ? g.items[0]?.p : undefined;
      const sameSex = only ? suspectsOf(c).filter((y) => y !== only && personOf(c, y)?.female === personOf(c, only)?.female && lastSaid.includes(nameOf(c, y))) : [];
      const bits = [...runs.values()].map((r) => `${only && lastSaid.startsWith(`${nameOf(c, only)} `) && sameSex.length === 0 ? pronOf(c, only).him : andList(r.ps.map((y) => nameOf(c, y)))} ${atWhere(c, r.place, here)} at ${hourWord(r.h)}`);
      add(`That put ${andList(bits)}, with ${g.src} under ${g.items.length > 1 ? 'both' : 'it'}.`.replace('under both', g.items.length > 2 ? 'under all of them' : 'under both'), g.refs.length ? g.refs : ['givens:clock'], {
        hours: g.items.map((y) => y.h),
        people: g.items.map((y) => y.p),
        places: g.items.map((y) => y.place),
      });
    }
  }

  // 8. The handover: something under a coat. Not whose, not what, until the board says.
  if (kind === 'list') {
    const l = listOf(c, rest);
    const r = l?.remarks.find((y) => y.gives?.whereNow);
    if (r) {
      const holder = (c.others ?? []).find((o) => o.id === 'fence')?.name ?? 'somebody';
      const hh = /^(\w+):/.exec(r.text)?.[1]?.toLowerCase() ?? 'twelve';
      const HOUR: Record<string, Hour> = { eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
      add(`And whatever went out of ${placeName(c, c.crime.scene)}, something under a coat had come in ${l?.place === here ? 'here' : `at ${placeName(c, l?.place ?? '')}`} at ${hh} and gone to ${shortOther(holder)}.`, ['givens:gone'], {
        places: [c.crime.scene, l?.place ?? ''],
        hours: HOUR[hh] !== undefined ? [HOUR[hh] as Hour] : [],
      });
    }
  }

  // 9. Who's left, when somebody new is placed away and the clock is still open (Medium and below).
  if (x.lastStep && a.who === undefined && a.possibleHours.length > 1 && a.cleared.size > b.cleared.size) {
    const left = suspectsOf(c).filter((p) => !a.cleared.has(p));
    if (left.length === 1) {
      add(`That left ${andList(left.map((p) => nameOf(c, p)))}, and the clock still open between ${hourWord(a.possibleHours[0] as Hour)} and ${hourWord(a.possibleHours[a.possibleHours.length - 1] as Hour)}.`, ['givens:clock'], { people: left, hours: a.possibleHours });
    }
  }

  // 10. Elimination, on the page that settles who: every rival placed by somebody else's word, or without the way in.
  if (a.who !== undefined && b.who === undefined) {
    const hc = a.possibleHours.length === 1 ? (a.possibleHours[0] as Hour) : undefined;
    const lines: string[] = [];
    const refs: string[] = [];
    const ppl: PersonId[] = [];
    const pls: PlaceId[] = [];
    if (hc !== undefined) {
      const placedBy = new Map<string, { place: PlaceId; who: PersonId[] }>();
      const noWay: PersonId[] = [];
      for (const p of suspectsOf(c)) {
        if (p === a.who) continue;
        const cl = a.cleared.get(p);
        if (!cl) continue;
        if (cl.how === 'no access') {
          noWay.push(p);
          continue;
        }
        const pl = a.placed.get(`${p}@${hc}`);
        if (!pl) continue;
        const by = pl.deps.find((d) => d !== `account:${p}` && !d.startsWith('confront:')) ?? pl.deps.find((d) => d !== `account:${p}`) ?? '';
        const src = sourceName(c, by).replace(/’s (list|story)$/, '’s word');
        const k = `${pl.place}|${src}`;
        const g = placedBy.get(k) ?? { place: pl.place, who: [] };
        g.who.push(p);
        placedBy.set(k, g);
        refs.push(...pl.deps);
        ppl.push(p, ...sourcePeople(by));
        pls.push(pl.place);
      }
      const entries = [...placedBy.entries()];
      const ps: string[] = [];
      const done = new Set<string>();
      for (const [k, g] of entries) {
        if (done.has(k)) continue;
        // "Fairbanks was at the Shamrock, with Bellucci’s word. Bellucci was at the Shamrock, with Fairbanks’s word": one sentence.
        const [, src] = k.split('|') as [string, string];
        const mate = g.who.length === 1 ? entries.find(([k2, g2]) => k2 !== k && g2.place === g.place && g2.who.length === 1 && src === `${nameOf(c, g2.who[0] as PersonId)}’s word` && k2.split('|')[1] === `${nameOf(c, g.who[0] as PersonId)}’s word`) : undefined;
        if (mate) {
          done.add(mate[0]);
          ps.push(`${nameOf(c, g.who[0] as PersonId)} and ${nameOf(c, mate[1].who[0] as PersonId)} were ${atWhere(c, g.place, here)}, each with the other’s word`);
          continue;
        }
        ps.push(`${andList(g.who.map((y) => nameOf(c, y)))} ${g.who.length > 1 ? 'were' : 'was'} ${atWhere(c, g.place, here)}, with ${src}`);
      }
      if (ps.length) lines.push(`At ${hourWord(hc)} ${ps.join('. ')}.`);
      if (noWay.length) {
        lines.push(`${cap(andList(noWay.map((y) => nameOf(c, y))))} ${accessPhrase(c, false, true)}.`);
        ppl.push(...noWay);
      }
      if (x.lastStep) {
        // The scene's street, if somebody was seen on it then: the golden's last clause.
        const street = c.places.find((p) => p.id === c.crime.scene)?.street;
        const seen = street && linesHeld(c, run).some((l) => l.kind === 'remark' && l.text.includes(` on ${street}`) && l.about.includes(a.who as PersonId));
        lines.push(`That left one person who ${accessPhrase(c, true, true)}, with no true account for ${hourWord(hc)}${seen ? `, and who’d been seen on ${street} at ${hourWord(hc)}` : ''}.`);
      }
      if (lines.length) {
        t.sentences.push(lines.join(' '));
        t.refs.push(...refs.filter((r) => heldBeforeQs.has(r)), 'givens:means');
        t.hours.push(hc);
        t.people.push(...ppl);
        t.places.push(...pls);
      }
    }
  }

  // 11. The hours that matter, and whose word is under them: always on a list with room for it, and on anything else that touched nothing.
  if ((t.sentences.length === 0 && (kind === 'account' || kind === 'list')) || (kind === 'list' && t.sentences.length < 3 && !settles && !t.hours.some((h) => win.includes(h))) || (kind === 'account' && t.sentences.length < 3 && !settles && !t.hours.some((h) => win.includes(h)))) {
    const hs = win.slice(0, 2);
    const clockRef = c.givens.lines?.some((g) => g.kind === 'window' || g.kind === 'clock') ? ['givens:clock'] : ['givens:found'];
    if (kind === 'account') {
      const said = hs.map((h) => claimSaid(c, rest, h));
      const same = said.every((s) => s.replace(/ at \w+$/, '') === (said[0] ?? '').replace(/ at \w+$/, ''));
      const what = same && said.length > 1 ? `${(said[0] ?? '').replace(/ at \w+$/, '')} at ${andList(hs.map(hourWord))}` : andList(said);
      add(
        `The ${hs.length > 1 ? 'hours' : 'hour'} that mattered ${hs.length > 1 ? 'were' : 'was'} ${andList(hs.map(hourWord))}, and for ${hs.length > 1 ? 'those' : 'that'} ${t.sentences.length > 0 ? pronOf(c, rest).he : nameOf(c, rest)} said ${what}. ${x.pick('own-word', ['I wrote it down and left it standing, for now.', 'Whether anything else I held touched it, I’d have to see.', `That was ${pronOf(c, rest).his} word for it, and I took it down as said.`])}`,
        clockRef,
        { hours: hs, people: [rest], places: hs.map((h) => accountOf(c, rest)?.claims[h]?.place ?? '') },
      );
    } else {
      const l = listOf(c, rest);
      if (l) {
        const at = hs.map((h) => {
          const es = (l.entries[h] ?? []).map((e) => ('person' in e ? nameOf(c, e.person) : 'other' in e ? shortOther(c.others?.find((o) => o.id === e.other)?.name ?? '') : `somebody ${e.look}`));
          return `at ${hourWord(h)} ${es.length ? andList(es) : 'nobody'}`;
        });
        const ppl = hs.flatMap((h) => (l.entries[h] ?? []).flatMap((e) => ('person' in e ? [e.person] : [])));
        add(`The ${hs.length > 1 ? 'hours' : 'hour'} that mattered ${hs.length > 1 ? 'were' : 'was'} ${andList(hs.map(hourWord))}. ${cap(andList(at.map((x, i) => (i === 0 ? x.replace(/^at (\w+) /, `at $1 ${nameOf(c, l.watcher)} had `) : x))))} ${where(c, l.place, here) === 'here' ? 'in this room' : `at ${placeName(c, l.place)}`}.`, clockRef, { hours: hs, people: [l.watcher, ...ppl], places: [l.place] });
      }
    }
  }
  t.refs = [...new Set(t.refs.filter(Boolean))];
  t.places = t.places.filter(Boolean);
  return t;
}

function sourcePeople(q: string | undefined): PersonId[] {
  if (!q) return [];
  const [kind, rest] = q.split(':') as [string, string];
  return kind === 'list' || kind === 'account' ? [rest] : kind === 'confront' ? [rest.split('@')[0] as string] : [];
}

export type { Solved };
