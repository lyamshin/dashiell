import type { BoardCase, Hour, PersonId, PlaceId } from './types.js';
import { fmtHour, key, questionsOf, solve } from './solver.js';
import { techniquesUpTo } from './tiers.js';
import { hadAccess, type Analysis } from './path.js';
import { isErrand } from './content.js';
import { pointed } from './pointers.js';

/**
 * docs/42 §5: the checks no case may fail. Each returns a list of failures;
 * an empty list is a pass.
 */

export interface InvariantReport {
  noGaps: string[];
  everyLieCollides: string[];
  unique: string[];
  leadTime: string[];
  placesOpen: string[];
  noLinger: string[];
  /** Lists, truthful accounts and company match the truth (rule 5). */
  truthful: string[];
  /** Rule 9: an innocent lies about one hour. */
  oneHourLies: string[];
  /** Decided 2026-09-28: an innocent lie only when it matters; nothing but its resolution places the liar. */
  lieMatters: string[];
  /** An admission names someone to check it by, and clears nobody on the liar's own word. */
  admissionChecked: string[];
  /** Decided 2026-09-28: no two people give the same reason for a move. */
  distinctReasons: string[];
  /** Decided 2026-09-28: the culprit and the innocent liar never claim the same place at the same hour. */
  liarsApart: string[];
  /** The office's window is said in board hours, and matches the crime's. */
  windowFits: string[];
  /** 4a.2: everyone the case puts at a watched place at an hour is on that watcher's list. */
  listsComplete: string[];
  /** 4a.2: an errand (dropping something off, a quick word) lasts an hour at most, told or true. */
  errandsShort: string[];
  /** 4a.2: a lie claims somewhere the liar would plausibly be. */
  liesPlausible: string[];
  /** 4a.2: an account's reasons are the truth's, except at the lied hour. */
  reasonsMatch: string[];
  /** 4a.2: every step of the designed path and the suggested order is pointed to by an earlier one or a given. */
  pathMotivated: string[];
}

export const INVARIANT_NAMES: (keyof InvariantReport)[] = [
  'noGaps',
  'everyLieCollides',
  'unique',
  'leadTime',
  'placesOpen',
  'noLinger',
  'truthful',
  'oneHourLies',
  'lieMatters',
  'admissionChecked',
  'distinctReasons',
  'liarsApart',
  'windowFits',
  'listsComplete',
  'errandsShort',
  'liesPlausible',
  'reasonsMatch',
  'pathMotivated',
];

/** Where people are plausibly found with no reason but their own (4a.2). */
const PUBLIC = new Set(['bar', 'club', 'restaurant', 'theatre']);

/**
 * `a`, the case's analysis, is needed only for `pathMotivated`; without it that check is skipped
 * (the generator's pre-check, before there's a path).
 */
export function checkInvariants(c: BoardCase, a?: Pick<Analysis, 'path' | 'suggested'>): InvariantReport {
  const r: InvariantReport = {
    noGaps: [],
    everyLieCollides: [],
    unique: [],
    leadTime: [],
    placesOpen: [],
    noLinger: [],
    truthful: [],
    oneHourLies: [],
    lieMatters: [],
    admissionChecked: [],
    distinctReasons: [],
    liarsApart: [],
    windowFits: [],
    listsComplete: [],
    errandsShort: [],
    liesPlausible: [],
    reasonsMatch: [],
    pathMotivated: [],
  };
  const hours = c.board.hours;
  const place = new Map(c.places.map((p) => [p.id, p]));
  const suspects = c.people.filter((p) => p.role === 'suspect').map((p) => p.id);
  const company = c.people.filter((p) => p.role === 'company').map((p) => p.id);
  const victim = c.people.find((p) => p.id === c.crime.victim);
  const boardPeople = [...suspects, ...(victim && !victim.object ? [victim.id] : []), ...company];
  const at = (p: PersonId, h: Hour) => c.board.rows[p]?.[h];

  // No gaps: every row and every account covers every hour.
  for (const p of [...boardPeople, c.crime.victim]) for (const h of hours) if (!at(p, h)) r.noGaps.push(`${p} has no place at ${h}`);
  for (const p of [...suspects, ...company]) {
    const a = c.accounts.find((x) => x.person === p);
    if (!a) r.noGaps.push(`${p} has no account`);
    else for (const h of hours) if (!a.claims[h]) r.noGaps.push(`${p}'s account skips ${h}`);
  }

  // Places open, and nobody lingers at a transit place.
  for (const p of boardPeople) {
    for (const h of hours) {
      const pl = place.get(at(p, h) ?? '');
      if (!pl) continue;
      if (h < pl.open[0] || h > pl.open[1]) r.placesOpen.push(`${p} at ${pl.short} at ${h}, closed`);
      if (pl.kind === 'transit') r.noLinger.push(`${p} spends ${h} at ${pl.short}`);
    }
  }

  // Truth: lists match the rows; truthful hours of accounts match the rows and name the whole company.
  const lieKeys = new Set(c.lies.map((l) => key(l.person, l.hour)));
  for (const l of c.lists) {
    const unseen = new Set(l.unseen ?? []);
    for (const h of hours) {
      const es = l.entries[h];
      if (!es) continue;
      const named = new Set(es.flatMap((e) => ('person' in e ? [e.person] : [])));
      const faces = es.filter((e) => 'look' in e).length;
      const there = boardPeople.filter((p) => at(p, h) === l.place && !unseen.has(p));
      for (const p of named) if (at(p, h) !== l.place) r.truthful.push(`${l.watcher} lists ${p} at ${h}, who was elsewhere`);
      const missing = there.filter((p) => !named.has(p));
      if (missing.length !== faces) r.truthful.push(`${l.watcher}'s list at ${h} misses ${missing.join(', ')}`);
    }
  }
  for (const a of c.accounts) {
    for (const h of hours) {
      const cl = a.claims[h];
      if (!cl || lieKeys.has(key(a.person, h))) continue;
      if (cl.place !== at(a.person, h)) r.truthful.push(`${a.person} at ${h}: says ${cl.place}, was ${at(a.person, h)} (not a recorded lie)`);
      const there = boardPeople.filter((p) => p !== a.person && at(p, h) === cl.place).sort();
      const said = [...cl.company].sort();
      if (there.join() !== said.join()) r.truthful.push(`${a.person} at ${h}: company ${said.join('+') || 'none'}, truly ${there.join('+') || 'none'}`);
    }
  }
  for (const l of c.lies) {
    if (at(l.person, l.hour) !== l.truth) r.truthful.push(`lie ${l.person}@${l.hour}: truth is not ${l.truth}`);
    const a = c.accounts.find((x) => x.person === l.person);
    if (a?.claims[l.hour]?.place !== l.claim) r.truthful.push(`lie ${l.person}@${l.hour}: account doesn't say ${l.claim}`);
  }
  const perInnocent = new Map<PersonId, number>();
  for (const l of c.lies) if (l.person !== c.crime.culprit) perInnocent.set(l.person, (perInnocent.get(l.person) ?? 0) + 1);
  for (const [p, n] of perInnocent) if (n > 1) r.oneHourLies.push(`${p} lies about ${n} hours`);

  // Every lie collides, and the answer is unique: the full-information solver at the tier's techniques.
  const all = [
    ...c.finds.map((f) => `search:${f.id}`),
    ...c.lists.map((l) => `list:${l.watcher}`),
    ...c.accounts.map((a) => `account:${a.person}`),
    ...c.confrontations.map((k) => `confront:${k.person}@${k.hour}`),
  ];
  const s = solve(c, all, { techniques: techniquesUpTo(c.tier) });
  for (const l of c.lies) {
    if (s.status.get(key(l.person, l.hour))?.s !== 'broken') r.everyLieCollides.push(`${l.person}'s lie at ${l.hour} never collides`);
  }
  if (s.contradictions.length > 0) r.unique.push(...s.contradictions.map((x) => `contradiction: ${x}`));
  if (s.who !== c.crime.culprit) r.unique.push(`the solver names ${s.who ?? 'nobody'}, not ${c.crime.culprit}`);
  if (s.when !== undefined && s.when !== c.crime.hour) r.unique.push(`the solver's hour is ${s.when}, not ${c.crime.hour}`);
  if (at(c.crime.culprit, c.crime.hour) !== c.crime.scene) r.unique.push('the culprit is not at the scene at the crime hour');
  for (const p of boardPeople) {
    if (p !== c.crime.culprit && p !== c.crime.victim && at(p, c.crime.hour) === c.crime.scene) r.unique.push(`${p} is at the scene at the crime hour too`);
  }

  // Means: the culprit and (from Coddled) an innocent at the origin before the crime; a real delay.
  const m = c.means;
  const before = m.available.filter((h) => h < c.crime.hour);
  if (before.length !== m.available.length) r.leadTime.push('the means is available at or after the crime hour');
  const hadIt = (p: PersonId) => c.givens.access.includes(p) || before.some((h) => at(p, h) === m.origin);
  if (!hadIt(c.crime.culprit)) r.leadTime.push('the culprit never had the means before the crime');
  if (c.tier >= 1 && !suspects.some((p) => p !== c.crime.culprit && hadIt(p))) r.leadTime.push('no innocent had the means too (rule 12)');
  if (m.kind === 'chloral' && (m.delay[0] < 20 || m.delay[1] > 60)) r.leadTime.push('chloral acts in twenty minutes to an hour');
  if (!c.crime.window.includes(c.crime.hour)) r.leadTime.push('the window misses the crime hour');

  // The office's window: said in the board's own hours, and the same as the crime's.
  for (const h of c.crime.window) if (!hours.includes(h)) r.windowFits.push(`the window's ${h} is off the board`);
  const said = c.givens.window;
  if (!said) r.windowFits.push('the office never says the window in board hours');
  else {
    for (const h of said) if (!hours.includes(h)) r.windowFits.push(`the office says ${h}, which is off the board`);
    if ([...said].sort().join() !== [...c.crime.window].sort().join()) r.windowFits.push(`the office says ${said.join('–')}, the crime's window is ${c.crime.window.join('–')}`);
  }

  // Admissions are checked, not taken on the liar's word.
  for (const k of c.confrontations) {
    if (k.response !== 'admit') continue;
    if (k.facts.some((f) => f.p === k.person)) r.admissionChecked.push(`${k.person}'s admission places ${k.person} on their own word`);
    const names = k.names ?? [];
    if (names.length === 0) r.admissionChecked.push(`${k.person}'s admission names nobody to check it by`);
    const checked = names.some((w) => company.includes(w) && c.accounts.find((x) => x.person === w)?.claims[k.hour]?.company.includes(k.person));
    if (names.length > 0 && !checked) r.admissionChecked.push(`nobody ${k.person} names can place them at ${k.hour}`);
  }

  // An innocent lie only when it matters: the liar stays a rival until the lie is resolved, and
  // nothing but the resolution (the admission and its check, or for a refusal the one list or
  // account that clears them) places them at that hour.
  const allQ = questionsOf(c).map((q) => q.id);
  for (const l of c.lies) {
    if (l.kind !== 'secret') continue;
    const k = c.confrontations.find((x) => x.person === l.person && x.hour === l.hour);
    if (!k) {
      r.lieMatters.push(`${l.person} is never put to it`);
      continue;
    }
    const placesThem = (facts: { k: string; p: PersonId; h: Hour }[]) => facts.some((f) => f.k === 'at' && f.p === l.person && f.h === l.hour);
    const placers = new Set<string>();
    for (const w of c.lists) {
      if ((w.entries[l.hour] ?? []).some((e) => 'person' in e && e.person === l.person)) placers.add(`list:${w.watcher}`);
      if (w.remarks.some((x) => placesThem(x.facts))) placers.add(`list:${w.watcher}`);
    }
    for (const a of c.accounts) {
      if (a.person === l.person) continue;
      if (a.claims[l.hour]?.company.includes(l.person) || a.remarks.some((x) => placesThem(x.facts))) placers.add(`account:${a.person}`);
    }
    const resolution = new Set([`confront:${k.person}@${k.hour}`, ...(k.response === 'admit' ? (k.names ?? []).map((w) => `account:${w}`) : [])]);
    const others = [...placers].filter((q) => !resolution.has(q));
    if (k.response === 'admit' && others.length > 0) r.lieMatters.push(`${others.join(', ')} place ${l.person} at ${l.hour} besides the admission`);
    if (k.response !== 'admit' && others.length !== 1) r.lieMatters.push(`${l.person} refuses, and ${others.length} sources place them at ${l.hour}, not one`);
    if (c.tier >= 1 && !hadAccess(c, l.person)) r.lieMatters.push(`${l.person} had no access, so the lie clears nobody`);
    const unresolved = allQ.filter((q) => !placers.has(q) && !resolution.has(q));
    if (solve(c, unresolved, { techniques: techniquesUpTo(c.tier), forceHours: [l.hour] }).cleared.has(l.person)) {
      r.lieMatters.push(`${l.person} is cleared without the lie being resolved`);
    }
  }

  // Varied evenings: nobody gives the same reason as anybody else (names, places, hours and
  // pronouns aside).
  const tokens: [string, string][] = [];
  for (const p of c.people) for (const t of [p.name, p.short]) tokens.push([t, '{who}']);
  for (const p of c.places) for (const t of [p.name, p.short]) tokens.push([t, '{where}']);
  tokens.sort((a, b) => b[0].length - a[0].length);
  const hourWords = new RegExp(`\\b(${Array.from({ length: 12 }, (_, i) => fmtHour(i + 1)).join('|')})\\b`, 'g');
  const norm = (s: string) => {
    let out = s;
    for (const [t, v] of tokens) out = out.split(t).join(v);
    return out.replace(hourWords, '{h}').toLowerCase().replace(/\b(he|she|him|her|his)\b/g, '{p}');
  };
  const seen = new Map<string, string>();
  for (const a of c.accounts) {
    for (const h of hours) {
      const why = a.claims[h]?.reason;
      if (!why) continue;
      const k = norm(why);
      const prev = seen.get(k);
      if (prev) r.distinctReasons.push(`${a.person} at ${h} and ${prev} both say "${why}"`);
      else seen.set(k, `${a.person} at ${h}`);
    }
  }

  // The culprit and the innocent liar never claim the same place at the same hour. The office's
  // party, which it hands over as a given, is shared by everybody there.
  const ca = c.accounts.find((x) => x.person === c.crime.culprit);
  for (const lp of new Set(c.lies.filter((l) => l.kind === 'secret').map((l) => l.person))) {
    const la = c.accounts.find((x) => x.person === lp);
    if (!ca || !la) continue;
    for (const h of hours) {
      const pl = ca.claims[h]?.place;
      if (!pl || pl !== la.claims[h]?.place) continue;
      const given = (p: PersonId) => c.givens.facts.some((f) => f.k === 'at' && f.p === p && f.h === h && f.place === pl);
      if (given(c.crime.culprit) && given(lp)) continue;
      r.liarsApart.push(`${c.crime.culprit} and ${lp} both claim ${pl} at ${h}`);
    }
    // The culprit's second lie is a claim too.
    for (const k of c.confrontations) {
      const pl = k.person === c.crime.culprit ? k.secondLie?.place : undefined;
      if (pl && la.claims[k.hour]?.place === pl) r.liarsApart.push(`${c.crime.culprit}'s second lie and ${lp} both claim ${pl} at ${k.hour}`);
    }
  }

  // 4a.2: the lists leave nobody out. Everyone the case puts at a watched place at an hour the
  // watcher covers is on the list: board people (or their face), and the people who aren't rows
  // (the fence, the client telling the room, a companion the watcher can't name).
  const others = c.others ?? [];
  for (const l of c.lists) {
    const unseen = new Set(l.unseen ?? []);
    for (const h of hours) {
      const es = l.entries[h];
      if (!es) continue;
      const named = new Set(es.flatMap((e) => ('person' in e ? [e.person] : [])));
      const faces = es.filter((e) => 'look' in e).length;
      const missing = boardPeople.filter((p) => at(p, h) === l.place && !unseen.has(p) && !named.has(p));
      if (missing.length > faces) r.listsComplete.push(`${l.watcher}'s list at ${h} leaves out ${missing.join(', ')}`);
      const listed = new Set(es.flatMap((e) => ('other' in e ? [e.other] : [])));
      for (const o of others) if (o.at[h] === l.place && !listed.has(o.id)) r.listsComplete.push(`${l.watcher}'s list at ${h} leaves out ${o.name}`);
      for (const id of listed) {
        const o = others.find((x) => x.id === id);
        if (!o) r.listsComplete.push(`${l.watcher}'s list at ${h} names ${id}, whom the case never places`);
        else if (o.at[h] !== l.place) r.listsComplete.push(`${l.watcher}'s list at ${h} has ${o.name}, who wasn't there`);
      }
    }
  }

  // 4a.2: an errand lasts an hour at most, in the truth and in what anyone says.
  const runFrom = (get: (h: Hour) => PlaceId | undefined, h: Hour) => {
    let n = 0;
    for (const x of hours) {
      if (x < h) continue;
      if (get(x) !== get(h)) break;
      n++;
    }
    return n;
  };
  for (const [p, rs] of Object.entries(c.board.reasons)) {
    for (const [hs, why] of Object.entries(rs)) {
      const h = Number(hs);
      if (isErrand(why) && runFrom((x) => at(p, x), h) > 1) r.errandsShort.push(`${p} ${why} at ${h}, and stays ${runFrom((x) => at(p, x), h)} hours`);
    }
  }
  for (const acc of c.accounts) {
    for (const h of hours) {
      const why = acc.claims[h]?.reason;
      const n = runFrom((x) => acc.claims[x]?.place, h);
      if (why && isErrand(why) && n > 1) r.errandsShort.push(`${acc.person} says "${why}" at ${h}, and claims ${n} hours there`);
    }
  }

  // 4a.2: a lie claims somewhere the liar would plausibly be: a bar, club, restaurant or theatre;
  // their own home; their work in its hours; or a home in the company of somebody who lives there.
  const personOf = (p: PersonId) => c.people.find((x) => x.id === p);
  const plausible = (p: PersonId, pl: PlaceId, h: Hour, comp: PersonId[]) => {
    const where = place.get(pl);
    if (!where) return false;
    const who = personOf(p);
    if (PUBLIC.has(where.kind)) return true;
    if (who?.home === pl) return true;
    if (who?.works === pl && h >= where.open[0] && h <= where.open[1]) return true;
    return where.kind === 'home' && comp.some((x) => personOf(x)?.home === pl);
  };
  for (const l of c.lies) {
    const comp = c.accounts.find((x) => x.person === l.person)?.claims[l.hour]?.company ?? [];
    if (!plausible(l.person, l.claim, l.hour, comp)) r.liesPlausible.push(`${l.person} claims ${l.claim} at ${l.hour}, where they'd have no reason to be`);
  }
  for (const k of c.confrontations) {
    const pl = k.secondLie?.place;
    if (pl && !plausible(k.person, pl, k.hour, [])) r.liesPlausible.push(`${k.person}'s second lie claims ${pl} at ${k.hour}, where they'd have no reason to be`);
  }

  // 4a.2: an account's reasons are the truth's, except at the lied hour. A move the person really
  // made gives the truth's reason. A move that's a move only because of a lie (they rejoin a place
  // after claiming somewhere else) gives the reason for the stint it rejoins, or "went back" when
  // the account has already been there. A true move the account claims isn't left without one.
  const backRe = /^(went back to|came back to|looked in at .* again)/;
  for (const acc of c.accounts) {
    const p = acc.person;
    const rs = c.board.reasons[p] ?? {};
    hours.forEach((h, i) => {
      if (lieKeys.has(key(p, h)) || i === 0) return;
      const cl = acc.claims[h];
      if (!cl || cl.place !== at(p, h)) return;
      const prevClaim = acc.claims[hours[i - 1] as Hour]?.place;
      const claimsMove = prevClaim !== undefined && prevClaim !== cl.place;
      // A reason with no move is a remark ("stayed till closing"), not a reason for moving.
      if (!claimsMove) return;
      const trulyMoved = at(p, hours[i - 1] as Hour) !== at(p, h);
      let s = i;
      while (s > 0 && at(p, hours[s - 1] as Hour) === at(p, h)) s--;
      const stintWhy = rs[hours[s] as Hour];
      const why = cl.reason;
      if (trulyMoved) {
        const truth = rs[h];
        if (why !== undefined && truth !== undefined && why !== truth) r.reasonsMatch.push(`${p} at ${h} says "${why}"; the truth is "${truth}"`);
        if (why === undefined && truth !== undefined) r.reasonsMatch.push(`${p} at ${h} claims a move with no reason; the truth is "${truth}"`);
        return;
      }
      if (why === undefined) return;
      const saidBefore = hours.slice(s, i).some((x) => acc.claims[x]?.place === cl.place);
      if (saidBefore) {
        if (!backRe.test(why)) r.reasonsMatch.push(`${p} at ${h} rejoins ${cl.place} saying "${why}", not that they went back`);
      } else if (stintWhy !== undefined && why !== stintWhy) r.reasonsMatch.push(`${p} at ${h} says "${why}"; the truth is "${stintWhy}"`);
    });
  }

  // 4a.2: the designed path and the suggested order ask only what something already held points
  // at: an earlier step, or the office.
  if (a) {
    const seq = (qs: string[], what: string) =>
      qs.forEach((q, i) => {
        if (!pointed(c, q, qs.slice(0, i))) r.pathMotivated.push(`${what} ${i + 1} (${q}) is pointed to by nothing before it`);
      });
    seq(
      a.path.map((s) => s.q),
      'step',
    );
    seq(
      a.suggested.map((s) => s.q),
      'suggestion',
    );
  }
  return r;
}

export function invariantFailures(r: InvariantReport, strict = true): string[] {
  const out: string[] = [];
  for (const k of INVARIANT_NAMES) {
    if (!strict && k === 'oneHourLies') continue;
    for (const x of r[k]) out.push(`${k}: ${x}`);
  }
  return out;
}
