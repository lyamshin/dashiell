import {
  TICKS,
  clock,
  type Case,
  type Clue,
  type Fact,
  type Id,
  type Observation,
  type Person,
  type Tick,
} from '../gen/types.js';

/**
 * A designer's read-out of one case. Clarity over polish: this is the document
 * you scan twenty of to decide whether the generator is producing mysteries
 * worth interrogating.
 */
export function renderTruthSheet(c: Case): string {
  const L = (id: Id | null | undefined): string =>
    id ? (c.locations.find((l) => l.id === id)?.name ?? id) : '—';
  const P = (id: Id | null | undefined): string =>
    id ? (c.people.find((p) => p.id === id)?.name ?? id) : '—';
  const person = (id: Id): Person => c.people.find((p) => p.id === id) as Person;
  const schedule = (id: Id) => c.schedules.find((s) => s.personId === id);

  const victim = c.people.find((p) => p.kind === 'victim') as Person;
  const suspects = c.people.filter((p) => p.kind === 'suspect');
  const fixtures = c.people.filter((p) => p.kind === 'fixture');
  const killer = person(c.solution.killerId);
  const M = c.solution.murderTick;
  const ML = c.solution.murderLocationId;

  const out: string[] = [];

  /* 1. Header ----------------------------------------------------------- */
  out.push(`# ${c.hotelName} — case ${c.seed}`);
  out.push('');
  out.push(
    `**Seed** ${c.seed} · **Attempts** ${c.attempts} · **Detective** ${c.detectiveName}`,
  );
  out.push('');

  /* 2. The Truth -------------------------------------------------------- */
  out.push('## 1. The Truth');
  out.push('');
  out.push(
    `${killer.name}, ${killer.role}, ${killer.relationshipToVictim ?? 'known to the victim'}, killed ` +
      `${victim.name}, ${victim.role}, with ${c.method.name} in the ${L(ML)} at ${clock(M)}. ` +
      `The reason was ${killer.motive?.description ?? 'unstated'} (${c.solution.motiveType}). ` +
      `${killer.name} ${describeAccess(c)} and was alone with ${victim.name} when it happened.`,
  );
  out.push('');

  /* 3. Dramatis Personae ------------------------------------------------ */
  out.push('## 2. Dramatis Personae');
  out.push('');
  out.push('| Name | Role | Relationship | Secret | Motive | Killer |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  out.push(
    `| ${victim.name} | ${victim.role} | the victim | — | — | — |`,
  );
  for (const p of suspects) {
    const secretLabel = p.coverSecret
      ? `${p.secret?.type ?? '—'} (+ ${p.coverSecret.type})`
      : (p.secret?.type ?? '—');
    out.push(
      `| ${p.name} | ${p.role} | ${p.relationshipToVictim ?? '—'} | ${secretLabel} | ${p.motive?.type ?? '—'} | ${p.isKiller ? '**YES**' : '—'} |`,
    );
  }
  for (const p of fixtures) {
    out.push(`| ${p.name} | ${p.role} | fixture | — | — | — |`);
  }
  out.push('');

  /* 4. Map -------------------------------------------------------------- */
  out.push('## 3. Map');
  out.push('');
  for (const loc of c.locations) {
    const objects = loc.objects
      .map((id) => c.objects.find((o) => o.id === id)?.name ?? id)
      .join(', ');
    out.push(
      `- **${loc.name}** (${loc.isPublic ? 'public' : 'private'}) — adjacent: ${loc.adjacent.map(L).join(', ') || 'nothing'}` +
        `; sees: ${loc.sightlines.map(L).join(', ') || 'nothing'}` +
        `; noise carries to: ${loc.noiseCarriesTo.map(L).join(', ') || 'nowhere'}` +
        `; objects: ${objects || 'none'}`,
    );
  }
  out.push('');
  const env: string[] = [];
  if (c.environment.rainStartsAt !== undefined) {
    env.push(`Rain from ${clock(c.environment.rainStartsAt)}.`);
  }
  if (c.environment.elevatorOut) {
    env.push(
      `Passenger elevator out of order ${clock(c.environment.elevatorOut[0])}–${clock(c.environment.elevatorOut[1])}.`,
    );
  }
  if (c.environment.radioBroadcastAt !== undefined) {
    env.push(
      `Bar radio at ${clock(c.environment.radioBroadcastAt)}: ${c.environment.radioContent} — ${c.environment.radioOutcome}.`,
    );
  }
  out.push(`**Environment:** ${env.length > 0 ? env.join(' ') : 'nothing out of the ordinary.'}`);
  out.push('');

  /* 5. Timelines -------------------------------------------------------- */
  out.push('## 4. Timelines');
  out.push('');
  for (const p of [victim, ...suspects]) {
    const s = schedule(p.id);
    if (!s) continue;
    out.push(`### ${p.name}${p.isKiller ? ' — the killer' : ''}${p.kind === 'victim' ? ' — the victim' : ''}`);
    out.push('');
    out.push('| Tick | Time | Truth | Claimed | Companion claimed |');
    out.push('| --- | --- | --- | --- | --- |');
    for (let t = 0; t < TICKS; t++) {
      const lying = s.lies.includes(t);
      const isMurderCell = t === M && s.truth[t] === ML && (p.isKiller || p.kind === 'victim');
      const truthCell = `${L(s.truth[t])}${isMurderCell ? ' ☠' : ''}`;
      const claimCell = lying ? `**${L(s.claimed[t])}**` : L(s.claimed[t]);
      out.push(
        `| ${t} | ${clock(t)} | ${truthCell} | ${claimCell} | ${s.claimedCompanion[t] ? P(s.claimedCompanion[t]) : '—'} |`,
      );
    }
    out.push('');
  }
  out.push('### Fixtures (never lie, never withhold)');
  out.push('');
  out.push(`| Tick | Time | ${fixtures.map((f) => `${f.name} (${f.role})`).join(' | ')} |`);
  out.push(`| --- | --- | ${fixtures.map(() => '---').join(' | ')} |`);
  for (let t = 0; t < TICKS; t++) {
    const cells = fixtures.map((f) => L(schedule(f.id)?.truth[t]));
    out.push(`| ${t} | ${clock(t)} | ${cells.join(' | ')} |`);
  }
  out.push('');

  /* 6. Secrets in play -------------------------------------------------- */
  out.push('## 5. Secrets in play');
  out.push('');
  for (const p of suspects) {
    if (p.secret) out.push(`- **${p.name}** (${p.secret.type}): ${p.secret.description}`);
    if (p.coverSecret) {
      out.push(`- **${p.name}** also (${p.coverSecret.type}): ${p.coverSecret.description}`);
    }
  }
  out.push('');

  /* 7. Clue list -------------------------------------------------------- */
  out.push('## 6. Clue list');
  out.push('');
  const personClues = c.clues.filter((cl) => cl.source.type === 'person');
  const locationClues = c.clues.filter((cl) => cl.source.type === 'location');

  for (const p of c.people) {
    const mine = personClues.filter(
      (cl) => cl.source.type === 'person' && cl.source.personId === p.id,
    );
    if (mine.length === 0) continue;
    out.push(`### From ${p.name} (${p.role})`);
    out.push('');
    const topics = new Map<string, Clue[]>();
    for (const cl of mine) {
      const topic = cl.source.type === 'person' ? cl.source.topic : '';
      const list = topics.get(topic) ?? [];
      list.push(cl);
      topics.set(topic, list);
    }
    for (const [topic, list] of topics) {
      out.push(`On ${topic}:`);
      out.push('');
      for (const cl of list) out.push(clueLine(c, cl));
      out.push('');
    }
  }

  for (const loc of c.locations) {
    const mine = locationClues.filter(
      (cl) => cl.source.type === 'location' && cl.source.locationId === loc.id,
    );
    if (mine.length === 0) continue;
    out.push(`### From the ${loc.name}`);
    out.push('');
    for (const cl of mine) out.push(clueLine(c, cl));
    out.push('');
  }

  out.push('### Withheld — the player cannot get these');
  out.push('');
  const withheldLines = renderWithheld(c);
  if (withheldLines.length === 0) out.push('- None.');
  else out.push(...withheldLines);
  out.push('');

  /* 8. Deduction path --------------------------------------------------- */
  out.push('## 7. Deduction path');
  out.push('');
  out.push(
    `**Time of death.** The coroner gives a two-tick window; the clues below close it to ${clock(M)}. ${cite(c.deduction.timeOfDeath)}`,
  );
  out.push('');
  out.push('**Clearing the innocent.**');
  out.push('');
  for (const p of suspects) {
    if (p.isKiller) continue;
    const list = c.deduction.exculpations[p.id] ?? [];
    out.push(
      `- ${p.name} was somewhere other than the ${L(ML)} at ${clock(M)}, on two independent sources. ${cite(list)}`,
    );
  }
  out.push('');
  const killerSchedule = schedule(killer.id);
  out.push(
    `**Naming the killer.** ${killer.name} claims the ${L(killerSchedule?.claimed[M])} at ${clock(M)}. ` +
      `Two independent sources put that out of the question, and one ties ${killer.name} to ${c.method.name}. ${cite(c.deduction.inculpation)}`,
  );
  out.push('');
  out.push(`**Method.** ${c.method.name}, on two physical sources. ${cite(c.deduction.method)}`);
  out.push('');
  out.push(
    `**Motive.** ${c.solution.motiveType}, on two independent sources. ${cite(c.deduction.motive)}`,
  );
  out.push('');

  /* 9. Red herrings ----------------------------------------------------- */
  out.push('## 8. Red herrings');
  out.push('');
  const liars = suspects.filter((p) => !p.isKiller && (schedule(p.id)?.lies ?? []).includes(M));
  out.push('**Innocents who lie about the murder tick:**');
  out.push('');
  for (const p of liars) {
    out.push(
      `- ${p.name} claims the ${L(schedule(p.id)?.claimed[M])} at ${clock(M)} and was really in the ${L(schedule(p.id)?.truth[M])}. Reason: ${p.secret?.description ?? 'unknown'}`,
    );
  }
  if (liars.length === 0) out.push('- None.');
  out.push('');
  const motived = suspects.filter((p) => !p.isKiller && p.motive);
  out.push('**Innocents with a motive:**');
  out.push('');
  for (const p of motived) {
    out.push(`- ${p.name} — ${p.motive?.type}: ${p.motive?.description}.`);
  }
  if (motived.length === 0) out.push('- None.');
  out.push('');

  return out.join('\n');
}

function describeAccess(c: Case): string {
  const req = c.method.accessRequirement;
  if (!req) return 'needed nothing in particular to do it';
  const loc = c.locations.find((l) => l.id === req.location)?.name ?? req.location;
  return `had been in the ${loc} earlier in the evening, before ${clock(req.beforeTick)}`;
}

function cite(clueIds: Id[]): string {
  if (clueIds.length === 0) return '_(no clues cited)_';
  return `_(${clueIds.join(', ')})_`;
}

function clueLine(c: Case, clue: Clue): string {
  const facts = clue.establishes.length > 0 ? summarizeFacts(c, clue.establishes) : 'context only';
  return `- **${clue.id}** [${clue.kind}] ${clue.text} — _establishes: ${facts}_`;
}

function summarizeFacts(c: Case, facts: Fact[]): string {
  const L = (id: Id): string => c.locations.find((l) => l.id === id)?.name ?? id;
  const P = (id: Id): string => c.people.find((p) => p.id === id)?.name ?? id;

  const parts: string[] = [];
  let i = 0;
  while (i < facts.length) {
    const f = facts[i] as Fact;
    if (f.kind === 'personAt' || f.kind === 'personNotAt') {
      const ticks: Tick[] = [f.tick];
      let j = i + 1;
      while (j < facts.length) {
        const g = facts[j] as Fact;
        if (g.kind !== f.kind || g.personId !== f.personId || g.location !== f.location) break;
        ticks.push(g.tick);
        j++;
      }
      const range =
        ticks.length === 1
          ? clock(ticks[0] as Tick)
          : `${clock(ticks[0] as Tick)}–${clock(ticks[ticks.length - 1] as Tick)}`;
      parts.push(
        `${P(f.personId)} ${f.kind === 'personAt' ? 'in' : 'not in'} the ${L(f.location)}, ${range}`,
      );
      i = j;
      continue;
    }
    switch (f.kind) {
      case 'objectMissing':
        parts.push(`an object gone from the ${L(f.fromLocation)}`);
        break;
      case 'noiseAt':
        parts.push(`noise in the ${L(f.location)} at ${clock(f.tick)}`);
        break;
      case 'timeOfDeath':
        parts.push(`death between ${clock(f.ticks[0] as Tick)} and ${clock(f.ticks[1] as Tick)}`);
        break;
      case 'hasMotive':
        parts.push(`${P(f.personId)} had a motive (${f.motiveType})`);
        break;
      case 'hadAccess':
        parts.push(`${P(f.personId)} had access to the method`);
        break;
      case 'victimAliveAt':
        parts.push(`the victim alive at ${clock(f.tick)}`);
        break;
    }
    i++;
  }
  return parts.join('; ');
}

function renderWithheld(c: Case): string[] {
  const L = (id: Id): string => c.locations.find((l) => l.id === id)?.name ?? id;
  const P = (id: Id): string => c.people.find((p) => p.id === id)?.name ?? id;
  const withheld = c.observations.filter((o) => o.withheld);
  const grouped = new Map<string, Observation[]>();
  for (const o of withheld) {
    const key = `${o.observerId}|${o.subjectId}|${o.location}`;
    const list = grouped.get(key) ?? [];
    list.push(o);
    grouped.set(key, list);
  }
  const lines: string[] = [];
  for (const [key, list] of grouped) {
    const [observerId, subjectId, location] = key.split('|') as [Id, Id, Id];
    const ticks = list.map((o) => o.tick).sort((a, b) => a - b);
    let start = 0;
    for (let i = 1; i <= ticks.length; i++) {
      if (i === ticks.length || (ticks[i] as Tick) !== (ticks[i - 1] as Tick) + 1) {
        const a = ticks[start] as Tick;
        const b = ticks[i - 1] as Tick;
        const range = a === b ? clock(a) : `${clock(a)}–${clock(b)}`;
        lines.push(
          `- ~~${P(observerId)} saw ${P(subjectId)} in the ${L(location)}, ${range}~~ — ${P(observerId)} is lying about that time and will not say.`,
        );
        start = i;
      }
    }
  }
  return lines;
}
