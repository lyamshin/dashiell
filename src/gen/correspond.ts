import { TICKS, clock, type Case, type Fact, type Id, type Tick } from './types.js';
import { PLACE_TEMPLATES } from './data/places.js';
import { KNOWN_WORDS } from './data/vocabulary.js';

/**
 * M5 §3 — correspondence. Every rendered sentence traces to a field.
 *
 * The complaint this answers is that a generator can write a true-sounding
 * sentence about nobody. "Tramonti was jealous of the victim" names a person
 * who has no name and a feeling that has no object; "the woman they had both
 * been seeing" is a person the next sentence will call something else. Both
 * read fine and neither corresponds to anything.
 *
 * So: extract what a sentence claims — the names in it, the places in it, the
 * times in it — and check each one against the case. A name is a person in the
 * case or a mention the case invented. A place is one of the six that were
 * dealt. A time is inside the evening, and where the sentence renders a fact
 * about somebody's movements, the fact is true of the schedules.
 *
 * Two rules are about the register rather than the data, and they are the two
 * that started the milestone: no sentence says "the victim" without naming
 * them, and no motive is written without its object.
 */

export interface RenderedFacts {
  /** Capitalized tokens that look like the name of a person. */
  names: string[];
  /** Short names of places, as the deck spells them. */
  places: string[];
  /** Clock times, as `clock()` writes them. */
  times: string[];
}

export type Rule =
  | 'unknown-name'
  | 'foreign-place'
  | 'bad-time'
  | 'time-disagrees'
  | 'fact-false'
  | 'unnamed-victim'
  | 'objectless-motive'
  | 'unfilled-slot';

export interface Violation {
  /** Where the sentence came from: `clue c012`, `briefing 4`, `dossier p-s3`. */
  where: string;
  rule: Rule;
  detail: string;
  text: string;
}

export interface CheckContext {
  where: string;
  /** The facts this text renders, when it renders any. */
  facts?: Fact[];
  /** True for a motive description, which must carry its object. */
  motive?: boolean;
  /**
   * Times that are legitimate in this text although no fact carries them: an
   * anchor's hour, the coroner's window, the hour a room was let.
   */
  allowTicks?: Tick[];
}

/* ------------------------------------------------------------------ *
 * Extraction.
 * ------------------------------------------------------------------ */

const TIME_RE = /\b\d{1,2}:\d{2}\s(?:AM|PM)\b/g;
// A capitalized word, with the curly and straight apostrophes and the hyphen
// allowed inside it: "Sweeney’s", "Mrs.", "Kaplan's", "Twenty-Eighth".
const NAME_RE = /\b[A-Z][A-Za-z’'’.-]*/g;

/**
 * Strip a possessive and any trailing punctuation from a captured token.
 * Both, in either order and as many times as it takes: "Ruggiero’s." is a
 * possessive inside a full stop, and "Mrs." is neither.
 */
export function bareToken(token: string): string {
  let t = token;
  for (let i = 0; i < 3; i++) {
    const next = t
      .replace(/[.,;:!?]+$/u, '')
      .replace(/[’']s$/u, '')
      .replace(/[’']$/u, '');
    if (next === t) break;
    t = next;
  }
  return t;
}

export function renderedFacts(text: string): RenderedFacts {
  const times = text.match(TIME_RE) ?? [];
  const names = (text.match(NAME_RE) ?? [])
    .map(bareToken)
    .filter((t) => t.length > 0)
    .filter((t) => !/^\d/.test(t));
  const places: string[] = [];
  for (const t of PLACE_TEMPLATES) {
    if (mentionsPlace(text, t.shortName)) places.push(t.shortName);
  }
  return { names, places, times };
}

/**
 * Does the text name this place, rather than merely contain its letters?
 * "the roof-door key" is an object and not the roof; "the benchesful" is not
 * a word, but the check is cheap and the deck will grow.
 */
function mentionsPlace(text: string, shortName: string): boolean {
  let from = 0;
  for (;;) {
    const i = text.indexOf(shortName, from);
    if (i < 0) return false;
    const before = i === 0 ? '' : text[i - 1] ?? '';
    const after = text[i + shortName.length] ?? '';
    if (!/[A-Za-z]/.test(before) && !/[A-Za-z-]/.test(after)) return true;
    from = i + 1;
  }
}

/* ------------------------------------------------------------------ *
 * The check.
 * ------------------------------------------------------------------ */

/** Every clock string the evening can legally print. */
const LEGAL_TIMES = new Set<string>(
  Array.from({ length: TICKS }, (_, t) => clock(t as Tick)),
);

export interface CaseVocabulary {
  /** Every token that may be capitalized and is a name in this case. */
  names: Set<string>;
  /** The short names of the six places that were dealt. */
  places: Set<string>;
  victimSurname: string;
  /** Every name a motive may use as its object. */
  objects: Set<string>;
}

export function vocabularyOf(c: Case): CaseVocabulary {
  const names = new Set<string>();
  const add = (full: string): void => {
    for (const part of full.split(/\s+/)) {
      const bare = bareToken(part);
      if (bare.length > 0) names.add(bare);
    }
  };
  for (const p of c.people) {
    add(p.name);
    add(p.surname);
  }
  for (const m of c.mentions) {
    add(m.name);
    add(m.surname);
  }
  add(c.detectiveName);
  add(c.neighborhood);
  for (const p of c.places) {
    add(p.shortName);
    add(p.name);
  }
  const objects = new Set<string>(c.mentions.map((m) => m.name));
  return {
    names,
    places: new Set(c.places.map((p) => p.shortName)),
    victimSurname: c.people.find((p) => p.kind === 'victim')?.surname ?? '',
    objects,
  };
}

function factTicks(facts: Fact[]): Tick[] {
  const out: Tick[] = [];
  for (const f of facts) {
    switch (f.kind) {
      case 'personAt':
      case 'personNotAt':
      case 'noiseAt':
      case 'victimAliveAt':
      case 'victimDeadBy':
        out.push(f.tick);
        break;
      case 'timeOfDeath':
        for (let t = (f.ticks[0] as Tick); t <= (f.ticks[f.ticks.length - 1] as Tick); t++) {
          out.push(t as Tick);
        }
        break;
      default:
        break;
    }
  }
  return out;
}

/** Is this fact actually true of the case's schedules? Movement facts only. */
function movementIsTrue(c: Case, f: Fact): boolean | null {
  if (f.kind !== 'personAt' && f.kind !== 'personNotAt') return null;
  const line = c.schedules.find((s) => s.personId === f.personId)?.truth;
  if (!line) return null;
  const here = line[f.tick] ?? null;
  return f.kind === 'personAt' ? here === f.place : here !== f.place;
}

export function check(c: Case, text: string, ctx: CheckContext): Violation[] {
  const out: Violation[] = [];
  const vocab = vocabularyOf(c);
  const rendered = renderedFacts(text);
  const flag = (rule: Rule, detail: string): void => {
    out.push({ where: ctx.where, rule, detail, text });
  };

  if (text.includes('{') || text.includes('undefined')) {
    flag('unfilled-slot', 'the text carries a slot or an undefined');
  }

  /* Names. */
  for (const token of rendered.names) {
    if (vocab.names.has(token)) continue;
    if (KNOWN_WORDS.has(token)) continue;
    flag('unknown-name', `"${token}" is not a person, a mention or a place in this case`);
  }

  /* Places. */
  for (const short of rendered.places) {
    if (vocab.places.has(short)) continue;
    // A place card and a family name can be the same word — "Ruggiero’s" the
    // barber shop and Ruggiero the bookkeeper. A hit the case can explain as
    // somebody's name is that person, not a seventh room.
    if (vocab.names.has(bareToken(short.split(/\s+/).pop() ?? short))) continue;
    flag('foreign-place', `"${short}" is not one of the six places this case dealt`);
  }

  /* Times. */
  const allowed = new Set<string>();
  for (const t of factTicks(ctx.facts ?? [])) allowed.add(clock(t));
  for (const t of ctx.allowTicks ?? []) allowed.add(clock(t));
  for (let t = c.coronerWindow[0]; t <= c.coronerWindow[1]; t++) allowed.add(clock(t as Tick));
  for (const a of c.anchors) for (const t of a.ticks) if (t >= 0 && t < TICKS) allowed.add(clock(t));
  for (const time of rendered.times) {
    if (!LEGAL_TIMES.has(time)) {
      flag('bad-time', `${time} is not a half hour of this evening`);
      continue;
    }
    if (allowed.size > 0 && !allowed.has(time)) {
      flag(
        'time-disagrees',
        `${time} is neither a tick of the fact this renders, nor the coroner's window, nor an anchor`,
      );
    }
  }

  /* The facts themselves. */
  for (const f of ctx.facts ?? []) {
    const ok = movementIsTrue(c, f);
    if (ok === false) {
      flag(
        'fact-false',
        `${f.kind} ${(f as { personId: Id }).personId} at ${(f as { place: Id }).place} on tick ${(f as { tick: Tick }).tick} is not what the schedule says`,
      );
    }
  }

  /* The register. */
  if (/\bthe victim\b/i.test(text) && !text.includes(vocab.victimSurname)) {
    flag('unnamed-victim', 'says "the victim" without naming them');
  }
  if (ctx.motive === true) {
    const hasObject =
      text.includes(vocab.victimSurname) || [...vocab.objects].some((o) => text.includes(o));
    if (!hasObject) flag('objectless-motive', 'a motive with no object');
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * The sweep.
 * ------------------------------------------------------------------ */

/**
 * Everything the generator renders, checked in one pass: every clue text, the
 * briefing, every dossier sentence, every self-account, the givens, the
 * client's brief, the mentions and the secrets.
 */
export function checkCase(c: Case): Violation[] {
  const out: Violation[] = [];

  /*
   * A clue about somebody's secret may name the hours that secret runs over,
   * whether or not the clue establishes anything: "somebody heard a drawer
   * being worked some time after 6:00 PM" is a hint, and six o'clock is when
   * the books were being gone through.
   */
  const secretTicksOf = (personId: Id | undefined): Tick[] => {
    if (!personId) return [];
    const p = c.people.find((q) => q.id === personId);
    const mine = (p?.secret?.cells ?? []).map((cell) => cell.tick);
    const partnerId = p?.secret?.partnerId;
    const theirs = partnerId
      ? (c.people.find((q) => q.id === partnerId)?.secret?.cells ?? []).map((cell) => cell.tick)
      : [];
    return [...mine, ...theirs];
  };

  for (const clue of c.candidates) {
    out.push(
      ...check(c, clue.text, {
        where: `clue ${clue.id}`,
        facts: clue.establishes,
        allowTicks: secretTicksOf(clue.aboutSecretOf),
      }),
    );
  }

  /*
   * The briefing is assembled out of sentences that are checked at source, so
   * its own times are the union of the hours those sources may name: the act,
   * the hour before it, the discovery or the last sighting.
   */
  const briefingTicks: Tick[] = [c.act.tick, Math.max(0, c.act.tick - 1) as Tick];
  if (c.victimBio.discovery) briefingTicks.push(c.victimBio.discovery.foundTick);
  if (c.victimBio.lastSeen) briefingTicks.push(c.victimBio.lastSeen.tick);
  c.briefing.forEach((line, i) => {
    out.push(...check(c, line, { where: `briefing ${i + 1}`, allowTicks: briefingTicks }));
  });

  c.act.givens.text.forEach((line, i) => {
    out.push(
      ...check(c, line, {
        where: `givens ${i + 1}`,
        facts: c.act.givens.facts,
        allowTicks: [c.act.tick, Math.max(0, c.act.tick - 1) as Tick],
      }),
    );
  });

  for (const p of c.people) {
    const d = p.dossier;
    if (!d) continue;
    d.selfAccount.forEach((line, i) => {
      out.push(...check(c, line, { where: `self-account ${p.id}.${i + 1}` }));
    });
    d.layers.forEach((layer, i) => {
      out.push(...check(c, layer.text, { where: `dossier ${p.id}.${layer.kind}.${i}` }));
    });
    out.push(...check(c, d.tie.backstory, { where: `tie ${p.id}` }));
    if (p.motive) {
      out.push(
        ...check(c, p.motive.description, { where: `motive ${p.id}`, motive: true }),
      );
    }
    // A secret's description names the hours the secret runs over, which are
    // its own cells and, for the killer, the block the act sits in.
    if (p.secret) {
      out.push(
        ...check(c, p.secret.description, {
          where: `secret ${p.id}`,
          allowTicks: p.secret.cells.map((cell) => cell.tick),
        }),
      );
    }
    if (p.coverSecret) {
      out.push(
        ...check(c, p.coverSecret.description, {
          where: `cover ${p.id}`,
          allowTicks: p.coverSecret.cells.map((cell) => cell.tick),
        }),
      );
    }
  }

  const bio = c.victimBio;
  out.push(...check(c, bio.standing, { where: 'victim standing' }));
  if (bio.discovery) {
    out.push(
      ...check(c, bio.discovery.foundText, {
        where: 'victim discovery',
        allowTicks: [bio.discovery.foundTick],
      }),
    );
  }
  if (bio.lastSeen) {
    out.push(
      ...check(c, bio.lastSeen.text, {
        where: 'victim last seen',
        allowTicks: [bio.lastSeen.tick],
      }),
    );
  }

  const brief = c.clientBrief;
  out.push(...check(c, brief.purposeText, { where: 'client purpose' }));
  out.push(...check(c, brief.cost, { where: 'client cost' }));
  brief.tellTexts.forEach((t, i) =>
    out.push(...check(c, t, { where: `client tell ${i + 1}`, allowTicks: [c.act.tick, Math.max(0, c.act.tick - 1) as Tick] })),
  );
  // What the client keeps back is their own secret, which runs over its own
  // hours, and the act, which runs over its own.
  const clientTicks: Tick[] = [c.act.tick, ...secretTicksOf(c.clientId)];
  brief.withholdTexts.forEach((t, i) =>
    out.push(...check(c, t, { where: `client withhold ${i + 1}`, allowTicks: clientTicks })),
  );
  out.push(...check(c, brief.points.reason, { where: 'client pointer' }));
  brief.ownEvening.forEach((t, i) =>
    out.push(
      ...check(c, t, {
        where: `client evening ${i + 1}`,
        allowTicks: Array.from({ length: TICKS }, (_, t2) => t2 as Tick),
      }),
    ),
  );

  for (const m of c.mentions) out.push(...check(c, m.text, { where: `mention ${m.id}` }));

  return out;
}

/** The first ten, formatted for a test failure. */
export function formatViolations(vs: Violation[], limit = 10): string {
  return vs
    .slice(0, limit)
    .map((v) => `  [${v.rule}] ${v.where}: ${v.detail}\n    ${v.text}`)
    .join('\n');
}
