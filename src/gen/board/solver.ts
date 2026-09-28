import type {
  BoardCase,
  Claim,
  Confrontation,
  Fact,
  Find,
  Gives,
  Hour,
  PersonId,
  PlaceId,
  Question,
  Remark,
  WatchList,
} from './types.js';
import { TIERS, type Technique } from './tiers.js';

/**
 * docs/42 §2: the solver. It knows only what the held questions return, plus
 * the office, and reasons with the named techniques it's allowed. It's sound
 * under the rules the player is taught (docs/41 rules 5–10): watchers and
 * company-only witnesses tell the truth; a lie always collides; two people lie
 * together only at Hard-boiled.
 *
 * It never uses "only the culprit lies", "a refusal is a tell" or "nothing
 * collided, so it's true": see the Built section of docs/42. Decided
 * 2026-09-28: a refusal is never evidence (innocents refuse too), and an
 * admission clears nobody on the liar's own word. It names someone, and that
 * person's account is the check.
 */

export interface SolveOptions {
  techniques: ReadonlySet<Technique>;
  /** Take the crime hour(s) as known (route counting). */
  forceHours?: Hour[];
  /**
   * The refusal shortcut, for measuring it only: once every liar is caught and put to it, name
   * the one who didn't own up. Unsound (innocents refuse too); the sweep checks it never beats par.
   */
  tell?: boolean;
}

export interface Step {
  tech: Technique;
  text: string;
  deps: string[];
}

type Deps = ReadonlySet<string>;

interface AtFact {
  place: PlaceId;
  deps: Deps;
  tech: Technique;
  /** The claim this came from, if it came from trusting one. */
  from?: string;
}

interface NotFact {
  deps: Deps;
  tech: Technique;
}

export interface Solved {
  done: boolean;
  who?: PersonId;
  when?: Hour;
  how: boolean;
  why: boolean;
  whereNow: boolean;
  possibleHours: Hour[];
  cleared: Map<PersonId, { how: string; deps: string[] }>;
  status: Map<string, { s: 'trusted' | 'broken'; tech: Technique; by: string; deps: string[] }>;
  accessYes: Set<PersonId>;
  accessNo: Set<PersonId>;
  confronted: Map<string, Confrontation['response']>;
  log: Step[];
  used: Set<Technique>;
  contradictions: string[];
}

export const key = (p: PersonId, h: Hour): string => `${p}@${h}`;

interface Ctx {
  c: BoardCase;
  hours: Hour[];
  suspects: PersonId[];
  /** Everyone a list or a truthful account is exhaustive over. */
  boardPeople: PersonId[];
  looks: Map<PersonId, string>;
  company: Set<PersonId>;
  names: Map<string, string>;
  questions: Map<string, Question>;
}

const CTX = new WeakMap<BoardCase, Ctx>();

export function questionsOf(c: BoardCase): Question[] {
  const person = (id: PersonId) => c.people.find((p) => p.id === id);
  const place = (id: PlaceId) => c.places.find((p) => p.id === id);
  const out: Question[] = [];
  for (const f of c.finds) {
    out.push({ id: `search:${f.id}`, kind: 'search', subject: f.id, at: f.place, label: `Search ${f.what} at ${place(f.place)?.short ?? f.place}` });
  }
  for (const l of c.lists) {
    out.push({ id: `list:${l.watcher}`, kind: 'list', subject: l.watcher, at: l.place, label: `Ask ${person(l.watcher)?.short ?? l.watcher}: who was at ${place(l.place)?.short ?? l.place} tonight?` });
  }
  for (const a of c.accounts) {
    const p = person(a.person);
    out.push({ id: `account:${a.person}`, kind: 'account', subject: a.person, at: p?.foundAt ?? '', label: `Ask ${p?.short ?? a.person}: where were you tonight?` });
  }
  for (const k of c.confrontations) {
    const p = person(k.person);
    out.push({
      id: `confront:${k.person}@${k.hour}`,
      kind: 'confront',
      subject: k.person,
      hour: k.hour,
      at: p?.foundAt ?? '',
      label: `Put it to ${p?.short ?? k.person}: ${fmtHour(k.hour)} o’clock`,
    });
  }
  return out;
}

export function fmtHour(h: Hour): string {
  const words = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return words[((h % 12) + 12) % 12] ?? String(h);
}

function ctxOf(c: BoardCase): Ctx {
  const hit = CTX.get(c);
  if (hit) return hit;
  const suspects = c.people.filter((p) => p.role === 'suspect').map((p) => p.id);
  const company = new Set(c.people.filter((p) => p.role === 'company').map((p) => p.id));
  const victim = c.people.find((p) => p.id === c.crime.victim);
  const boardPeople = [
    ...suspects,
    ...(victim && !victim.object ? [victim.id] : []),
    ...company,
  ];
  const looks = new Map<PersonId, string>();
  for (const p of c.people) if (p.look) looks.set(p.id, p.look);
  const names = new Map<string, string>();
  for (const p of c.people) names.set(p.id, p.short);
  for (const p of c.places) names.set(p.id, p.short);
  const questions = new Map(questionsOf(c).map((q) => [q.id, q]));
  const ctx: Ctx = { c, hours: c.board.hours, suspects, boardPeople, looks, company, names, questions };
  CTX.set(c, ctx);
  return ctx;
}

const union = (...xs: (Deps | readonly string[])[]): Set<string> => {
  const out = new Set<string>();
  for (const x of xs) for (const d of x) out.add(d);
  return out;
};

export function solve(c: BoardCase, held: Iterable<string>, opts: SolveOptions): Solved {
  const ctx = ctxOf(c);
  const T = opts.techniques;
  const heldSet = new Set(held);
  const scene = c.crime.scene;
  const n = (id: string) => ctx.names.get(id) ?? id;

  const at = new Map<string, AtFact>();
  const notAt = new Map<string, Map<PlaceId, NotFact>>();
  const claims = new Map<string, { claim: Claim; q: string }>();
  const status = new Map<string, { s: 'trusted' | 'broken'; tech: Technique; by: string; deps: Set<string> }>();
  const met = new Map<PersonId, string>();
  const log: Step[] = [];
  const used = new Set<Technique>();
  const contradictions: string[] = [];
  const accessYes = new Map<PersonId, Deps>();
  const accessNo = new Map<PersonId, Deps>();
  const confronted = new Map<string, Confrontation['response']>();
  let meansDeps: Deps | null = null;
  let why = false;
  let whereNow = false;
  let changed = true;

  const note = (tech: Technique, text: string, deps: Deps) => {
    used.add(tech);
    log.push({ tech, text, deps: [...deps].sort() });
  };

  const addAt = (p: PersonId, h: Hour, place: PlaceId, deps: Deps, tech: Technique, from?: string): void => {
    const k = key(p, h);
    const prev = at.get(k);
    if (prev) {
      if (prev.place !== place) contradictions.push(`${n(p)} at ${h}: ${n(prev.place)} and ${n(place)}`);
      return;
    }
    const no = notAt.get(k)?.get(place);
    if (no) contradictions.push(`${n(p)} at ${h}: at and not at ${n(place)}`);
    at.set(k, { place, deps, tech, ...(from ? { from } : {}) });
    changed = true;
  };

  const addNot = (p: PersonId, h: Hour, place: PlaceId, deps: Deps, tech: Technique): void => {
    const k = key(p, h);
    let m = notAt.get(k);
    if (!m) notAt.set(k, (m = new Map()));
    if (m.has(place)) return;
    const a = at.get(k);
    if (a && a.place === place) contradictions.push(`${n(p)} at ${h}: at and not at ${n(place)}`);
    m.set(place, { deps, tech });
    changed = true;
  };

  const addFact = (f: Fact, deps: Deps, tech: Technique) => {
    if (f.k === 'at') addAt(f.p, f.h, f.place, deps, tech);
    else addNot(f.p, f.h, f.place, deps, tech);
  };

  const applyGives = (g: Gives | undefined, deps: Deps) => {
    if (!g) return;
    if (g.means && !meansDeps) {
      meansDeps = deps;
      changed = true;
    }
    if (g.why && !why) {
      why = true;
      changed = true;
    }
    if (g.whereNow && !whereNow) {
      whereNow = true;
      changed = true;
    }
  };

  // The office: free.
  const none: Deps = new Set();
  for (const f of c.givens.facts) addFact(f, none, 'read-off');

  const heldLists: { list: WatchList; q: string }[] = [];
  const remarks: { r: Remark; q: string; extra: Deps }[] = [];
  const pendingConfront: { k: Confrontation; q: string }[] = [];

  // You can only ask someone you've heard of. Suspects, watchers and places are known from the
  // office; a company-only witness has to be named first, by a list, an account, an admission,
  // or the office. Their accounts are taken up as they're named.
  const named = new Set<PersonId>(c.givens.known ?? []);
  const namedBy = new Map<PersonId, string>();
  const name = (p: PersonId, by: string) => {
    if (named.has(p)) return;
    named.add(p);
    namedBy.set(p, by);
  };
  const nameFrom = (q: string) => {
    const [kind, rest] = q.split(':') as [string, string];
    if (kind === 'list') {
      const l = c.lists.find((x) => x.watcher === rest);
      for (const es of Object.values(l?.entries ?? {})) for (const e of es) if ('person' in e) name(e.person, q);
    } else if (kind === 'account') {
      const a = c.accounts.find((x) => x.person === rest);
      for (const cl of Object.values(a?.claims ?? {})) for (const p of cl.company) name(p, q);
    }
  };
  const isCompanyAccount = (q: string) => q.startsWith('account:') && ctx.company.has(q.slice(8));
  for (const q of heldSet) if (!isCompanyAccount(q)) nameFrom(q);
  const taken = new Set<string>();
  const takeUpCompany = (): void => {
    for (let grew = true; grew; ) {
      grew = false;
      for (const q of heldSet) {
        const p = q.slice(8);
        if (!isCompanyAccount(q) || taken.has(q) || !named.has(p)) continue;
        taken.add(q);
        nameFrom(q);
        const by = namedBy.get(p);
        // Asked because an admission named them: the check joins the confrontation.
        take(q, by?.startsWith('confront:') ? new Set([q, by]) : new Set([q]));
        changed = true;
        grew = true;
      }
    }
  };

  for (const q of heldSet) if (!isCompanyAccount(q)) take(q, new Set([q]));
  takeUpCompany();

  function take(q: string, qDeps: Deps): void {
    const [kind, rest] = q.split(':') as [string, string];
    if (kind === 'search') {
      const f = c.finds.find((x) => x.id === rest) as Find | undefined;
      if (!f) return;
      applyGives(f.gives, qDeps);
      for (const fact of f.facts) addFact(fact, qDeps, 'read-off');
    } else if (kind === 'list') {
      const l = c.lists.find((x) => x.watcher === rest);
      if (!l) return;
      heldLists.push({ list: l, q });
      for (const r of l.remarks) remarks.push({ r, q, extra: none });
    } else if (kind === 'account') {
      const a = c.accounts.find((x) => x.person === rest);
      if (!a) return;
      met.set(a.person, q);
      for (const r of a.remarks) remarks.push({ r, q, extra: qDeps });
      const truthful = ctx.company.has(a.person);
      for (const h of ctx.hours) {
        const cl = a.claims[h];
        if (!cl) continue;
        claims.set(key(a.person, h), { claim: cl, q });
        if (truthful) {
          // A company-only witness is taken as true (rule 10: nobody lies for anyone below Hard-boiled,
          // and they have nothing of their own to hide).
          status.set(key(a.person, h), { s: 'trusted', tech: 'read-off', by: 'company witness', deps: new Set(qDeps) });
          trustClaim(a.person, h, cl, qDeps);
        }
      }
    } else if (kind === 'confront') {
      const [p, hs] = rest.split('@') as [string, string];
      const k = c.confrontations.find((x) => x.person === p && x.hour === Number(hs));
      if (k) pendingConfront.push({ k, q });
    }
  }

  function trustClaim(p: PersonId, h: Hour, cl: Claim, deps: Deps): void {
    const from = key(p, h);
    addAt(p, h, cl.place, deps, 'read-off', from);
    for (const q of cl.company) addAt(q, h, cl.place, deps, 'read-off', from);
    const inCompany = new Set([p, ...cl.company]);
    for (const x of ctx.boardPeople) if (!inCompany.has(x)) addNot(x, h, cl.place, deps, 'read-off');
  }

  const placedAway = (p: PersonId, h: Hour): Deps | null => {
    const a = at.get(key(p, h));
    if (a) return a.place !== scene ? a.deps : null;
    const no = notAt.get(key(p, h))?.get(scene);
    return no ? no.deps : null;
  };

  let iterations = 0;
  while (changed && iterations++ < 50) {
    changed = false;

    // Watchers' lists: read-off, "nobody else", and faces.
    for (const { list, q } of heldLists) {
      const unseen = new Set(list.unseen ?? []);
      for (const h of ctx.hours) {
        const entries = list.entries[h];
        if (!entries) continue;
        const named = new Set<PersonId>();
        const faces: string[] = [];
        const faceDeps: string[] = [q];
        for (const e of entries) {
          if ('person' in e) {
            named.add(e.person);
            addAt(e.person, h, list.place, new Set([q]), 'read-off');
          } else {
            // A face: whoever you've met who looks like that.
            const match = T.has('face') ? [...met.keys()].find((p) => ctx.looks.get(p) === e.look) : undefined;
            if (match) {
              named.add(match);
              faceDeps.push(met.get(match) as string);
              if (!at.has(key(match, h))) {
                note('face', `${n(list.watcher)}'s face "${e.look}" at ${h} is ${n(match)}`, new Set([q, met.get(match) as string]));
              }
              addAt(match, h, list.place, new Set([q, met.get(match) as string]), 'face');
            } else faces.push(e.look);
          }
        }
        for (const x of ctx.boardPeople) {
          if (named.has(x) || unseen.has(x)) continue;
          if (faces.length === 0) addNot(x, h, list.place, new Set(faceDeps), faceDeps.length > 1 ? 'face' : 'read-off');
          else if (T.has('face') && met.has(x) && !faces.includes(ctx.looks.get(x) ?? '')) {
            addNot(x, h, list.place, new Set([...faceDeps, met.get(x) as string]), 'face');
          }
        }
      }
    }

    // Remarks, from lists and accounts. A side remark needs the side-remark technique.
    for (const { r, q, extra } of remarks) {
      const d = union([q], extra);
      applyGives(r.gives, d);
      if (r.side && !T.has('side-remark')) continue;
      for (const f of r.facts) addFact(f, d, r.side ? 'side-remark' : 'read-off');
    }

    // Accounts: confirm, break, or corroborate each hour.
    for (const [k, { claim, q }] of claims) {
      if (status.has(k)) continue;
      const [p, hs] = k.split('@') as [string, string];
      const h = Number(hs);
      const a = at.get(k);
      if (a && a.from !== k) {
        if (a.place === claim.place) {
          status.set(k, { s: 'trusted', tech: 'read-off', by: 'confirmed', deps: union(a.deps, [q]) });
          note('read-off', `${n(p)}'s account at ${h} (${n(claim.place)}) is confirmed`, union(a.deps, [q]));
          trustClaim(p, h, claim, union(a.deps, [q]));
        } else {
          const tech: Technique = a.tech === 'face' ? 'face' : a.tech === 'side-remark' ? 'side-remark' : 'collision';
          status.set(k, { s: 'broken', tech, by: `placed at ${n(a.place)}`, deps: union(a.deps, [q]) });
          note(tech, `${n(p)} says ${n(claim.place)} at ${h}, but was at ${n(a.place)}`, union(a.deps, [q]));
        }
        changed = true;
        continue;
      }
      const no = notAt.get(k)?.get(claim.place);
      if (no) {
        const tech: Technique = no.tech === 'side-remark' ? 'side-remark' : no.tech === 'face' ? 'face' : 'collision';
        status.set(k, { s: 'broken', tech, by: `not at ${n(claim.place)}`, deps: union(no.deps, [q]) });
        note(tech, `${n(p)} says ${n(claim.place)} at ${h}; that collides`, union(no.deps, [q]));
        changed = true;
        continue;
      }
      if (T.has('pair')) {
        let broke = false;
        for (const mate of claim.company) {
          const am = at.get(key(mate, h));
          const nm = notAt.get(key(mate, h))?.get(claim.place);
          const d = am && am.place !== claim.place ? am.deps : nm ? nm.deps : null;
          if (d) {
            status.set(k, { s: 'broken', tech: 'pair', by: `${n(mate)} was not there`, deps: union(d, [q]) });
            note('pair', `${n(p)} says ${n(claim.place)} at ${h} with ${n(mate)}, and ${n(mate)} wasn't there`, union(d, [q]));
            changed = true;
            broke = true;
            break;
          }
        }
        if (broke) continue;
      }
      if (TIERS[c.tier].corroboration) {
        for (const mate of claim.company) {
          const other = claims.get(key(mate, h));
          if (!other || other.claim.place !== claim.place || !other.claim.company.includes(p)) continue;
          if (status.get(key(mate, h))?.s === 'broken') continue;
          const d = new Set([q, other.q]);
          status.set(k, { s: 'trusted', tech: 'read-off', by: `agrees with ${n(mate)}`, deps: d });
          note('read-off', `${n(p)} and ${n(mate)} agree: ${n(claim.place)} at ${h}`, d);
          trustClaim(p, h, claim, d);
          if (!status.has(key(mate, h))) {
            status.set(key(mate, h), { s: 'trusted', tech: 'read-off', by: `agrees with ${n(p)}`, deps: d });
            trustClaim(mate, h, other.claim, d);
          }
          changed = true;
          break;
        }
      }
    }

    // Confrontation: their line against the line that breaks it.
    for (const { k, q } of pendingConfront) {
      const kk = key(k.person, k.hour);
      // The shortcut player puts it to people at any tier.
      if (confronted.has(kk) || !(T.has('confrontation') || opts.tell)) continue;
      const st = status.get(kk);
      if (!st || st.s !== 'broken') continue;
      const d = union(st.deps, [q]);
      confronted.set(kk, k.response);
      const names = k.names ?? [];
      note('confrontation', `${n(k.person)}, put to it about ${k.hour}: ${k.response}${names.length ? `, and names ${names.map(n).join(' and ')} to check it by` : ''}`, d);
      // An admission is a claim like any other: it places nobody until the person it names is asked.
      if (k.response !== 'admit') for (const f of k.facts) addFact(f, d, 'confrontation');
      for (const p of names) name(p, q);
      takeUpCompany();
      applyGives(k.gives, d);
      changed = true;
    }

    // Access: who was at the means' origin while it sat there.
    if (T.has('access') && meansDeps) {
      const md = meansDeps as Deps;
      for (const p of ctx.suspects) {
        if (accessYes.has(p) || accessNo.has(p)) continue;
        if (c.givens.access.includes(p)) {
          accessYes.set(p, md);
          note('access', `${n(p)} had access (lives there)`, md);
          changed = true;
          continue;
        }
        let yes: Deps | null = null;
        let noDeps: Set<string> | null = new Set(md);
        for (const h of c.means.available) {
          const a = at.get(key(p, h));
          if (a && a.place === c.means.origin) {
            yes = union(a.deps, md);
            break;
          }
          const away = a && a.place !== c.means.origin ? a.deps : notAt.get(key(p, h))?.get(c.means.origin)?.deps;
          if (away && noDeps) for (const x of away) noDeps.add(x);
          else noDeps = null;
        }
        if (yes) {
          accessYes.set(p, yes);
          note('access', `${n(p)} was at ${n(c.means.origin)} while the means was there`, yes);
          changed = true;
        } else if (noDeps) {
          accessNo.set(p, noDeps);
          note('access', `${n(p)} was never at ${n(c.means.origin)} while the means was there`, noDeps);
          changed = true;
        }
      }
    }
  }

  // The hour: the office's window, narrowed by the last sighting of the victim away from the scene.
  let possible = [...(opts.forceHours ?? c.crime.window)];
  const narrowDeps = new Set<string>();
  if (!opts.forceHours && T.has('time-window')) {
    const narrowed = possible.filter((h) => {
      const a = at.get(key(c.crime.victim, h));
      if (a && a.place !== scene) {
        note('time-window', `${n(c.crime.victim)} was at ${n(a.place)} at ${h}, so not then`, a.deps);
        for (const d of a.deps) narrowDeps.add(d);
        return false;
      }
      return true;
    });
    if (narrowed.length > 0) possible = narrowed;
  }

  // Elimination.
  const cleared = new Map<PersonId, { how: string; deps: string[] }>();
  for (const p of ctx.suspects) {
    if (T.has('access') && accessNo.has(p)) {
      cleared.set(p, { how: 'no access', deps: [...(accessNo.get(p) as Deps)] });
      continue;
    }
    const ds: Set<string> = new Set();
    let all = true;
    for (const h of possible) {
      const d = placedAway(p, h);
      if (!d) {
        all = false;
        break;
      }
      for (const x of d) ds.add(x);
    }
    if (all) cleared.set(p, { how: 'placed away', deps: [...ds] });
  }
  const left = ctx.suspects.filter((p) => !cleared.has(p));
  let who: PersonId | undefined;
  let when: Hour | undefined;
  if (opts.tell) {
    // The shortcut: every liar caught and put to it; name the one who didn't own up.
    const liars = [...new Set(c.lies.map((l) => l.person))].filter((p) => ctx.suspects.includes(p));
    const allPut = c.lies.every((l) => status.get(key(l.person, l.hour))?.s === 'broken' && confronted.has(key(l.person, l.hour)));
    const holdouts = liars.filter((p) => c.lies.some((l) => l.person === p && confronted.get(key(p, l.hour)) !== 'admit'));
    if (allPut && holdouts.length === 1) {
      const cand = holdouts[0] as PersonId;
      const free = possible.filter((h) => !placedAway(cand, h));
      const atScene = free.find((h) => at.get(key(cand, h))?.place === scene);
      who = cand;
      const hoursLeft = atScene !== undefined ? [atScene] : free;
      if (hoursLeft.length === 1) when = hoursLeft[0];
    }
  } else if (left.length === 1) {
    const cand = left[0] as PersonId;
    const free = possible.filter((h) => !placedAway(cand, h));
    const atScene = free.find((h) => at.get(key(cand, h))?.place === scene);
    const caught = free.some((h) => status.get(key(cand, h))?.s === 'broken');
    const accessOk = !T.has('access') || accessYes.has(cand);
    if (caught && accessOk) {
      who = cand;
      const hoursLeft = atScene !== undefined ? [atScene] : free;
      if (hoursLeft.length === 1) when = hoursLeft[0];
      const d = union(narrowDeps, ...[...cleared.values()].map((x) => x.deps));
      note('elimination', `only ${n(cand)} is left with access and no true account${when !== undefined ? ` at ${when}` : ''}`, d);
    }
  }

  const how = meansDeps !== null && (opts.tell || !T.has('access') || (who !== undefined && accessYes.has(who)));
  const small = c.type !== 'murder';
  const done = who !== undefined && when !== undefined && how && (!small || (whereNow && why));

  const statusOut = new Map<string, { s: 'trusted' | 'broken'; tech: Technique; by: string; deps: string[] }>();
  for (const [k, v] of status) statusOut.set(k, { ...v, deps: [...v.deps] });

  return {
    done,
    ...(who !== undefined ? { who } : {}),
    ...(when !== undefined ? { when } : {}),
    how,
    why,
    whereNow,
    possibleHours: possible,
    cleared,
    status: statusOut,
    accessYes: new Set(accessYes.keys()),
    accessNo: new Set(accessNo.keys()),
    confronted,
    log,
    used,
    contradictions,
  };
}

export function allQuestionIds(c: BoardCase): string[] {
  return questionsOf(c).map((q) => q.id);
}

export function questionById(c: BoardCase, id: string): Question | undefined {
  return ctxOf(c).questions.get(id);
}
