import {
  TICKS,
  clock,
  type Anchor,
  type Case,
  type Clue,
  type Dossier,
  type Fact,
  type Id,
  type Person,
  type Tick,
} from '../gen/types.js';
import { describeDials, dialsOf } from '../gen/shape.js';

/**
 * A designer's read-out of one case. Clarity over polish: this is the document
 * you scan twenty of to decide whether the generator is producing mysteries
 * worth interrogating.
 *
 * The clue list here is the *findable* set only — the thirty things a player
 * can actually get hold of. The full candidate pool goes to its own file.
 */
export function renderTruthSheet(c: Case): string {
  /** Short name. The full name of a place is printed once, in section 8. */
  const PL = (id: Id | null | undefined): string =>
    id ? (c.places.find((p) => p.id === id)?.shortName ?? id) : '—';
  /** Surname. The full name of a person is printed once, in section 3. */
  const P = (id: Id | null | undefined): string =>
    id ? (c.people.find((p) => p.id === id)?.surname ?? id) : '—';
  const person = (id: Id): Person => c.people.find((p) => p.id === id) as Person;
  const schedule = (id: Id) => c.schedules.find((s) => s.personId === id);

  const victim = c.people.find((p) => p.kind === 'victim') as Person;
  const suspects = c.people.filter((p) => p.kind === 'suspect');
  const fixtures = c.people.filter((p) => p.kind === 'fixture');
  const killer = person(c.solution.killerId);
  const M = c.solution.murderTick;
  const ML = c.solution.murderPlaceId;

  const findable = c.findable;
  const byRole = (role: Clue['role']): Clue[] => findable.filter((cl) => cl.role === role);
  const noiseCount = byRole('noise').length + byRole('disqualifier').length;

  const out: string[] = [];

  /* 1. Header ----------------------------------------------------------- */
  out.push(`# ${c.neighborhood} — case ${c.seed}`);
  out.push('');
  out.push(
    `**Seed** ${c.seed} · **Difficulty** ${c.difficulty} · **Attempts** ${c.attempts} · **Detective** ${c.detectiveName}`,
  );
  out.push('');
  // M7: the tier and the level, and the dials under them.
  {
    const dials = dialsOf(c);
    const tier = dials.shape.tier;
    out.push(
      `**Tier** ${typeof tier === 'number' ? `${tier} ` : ''}${dials.shape.name} · ` +
        `**Level** ${dials.ladder.level} ${dials.ladder.name} · ${describeDials(dials)}`,
    );
    out.push('');
  }
  out.push(
    `**Type** ${c.act.type} · **Trope** ${c.act.tropeId} · ` +
      `**Unknowns** ${c.act.unknowns.join(', ')}`,
  );
  out.push('');
  out.push(
    `**Par** ${c.par} actions · **Slack** ${c.slack} · **Budget** ${c.budget} · ` +
      `**Findable** ${findable.length} (spine ${byRole('spine').length}, corroboration ${byRole('corroboration').length}, ` +
      `noise ${byRole('noise').length} + ${byRole('disqualifier').length} disqualifiers) · ` +
      `**Noise ratio** ${Math.round((noiseCount / findable.length) * 100)}% · ` +
      `**Candidate pool** ${c.candidates.length}`,
  );
  out.push('');

  /* 2. The Truth -------------------------------------------------------- */
  out.push('## 1. The Truth');
  out.push('');
  // M5: one paragraph, three case types. What the actor did to whom changes;
  // the machinery under it — alone at the place at the tick, having fetched
  // the thing beforehand — does not.
  const did =
    c.act.type === 'robbery'
      ? `took ${c.act.taken?.name ?? 'the goods'} from ${PL(ML)}, which belonged to ` +
        `${victim.name}, ${victim.role}, at ${clock(M)}, by ${c.method.name}`
      : c.act.type === 'missing'
        ? `was the last to be with ${victim.name}, ${victim.role}, at ${PL(ML)} at ${clock(M)}, ` +
          `and ${c.act.tropeId === 'left' ? 'saw them off' : 'took them'} by ${c.method.name}`
        : `killed ${victim.name}, ${victim.role}, with ${c.method.name} at ${PL(ML)} at ${clock(M)}`;
  const aloneWith =
    c.act.type === 'robbery'
      ? `and was alone at ${PL(ML)} when it happened`
      : `and was alone with ${victim.surname} when it happened`;
  out.push(
    `${killer.name}, ${killer.role}, ${killer.relationshipToVictim ?? 'known to the victim'}, ${did}. ` +
      `${killer.surname} ${killer.motive?.description ?? 'had an unstated reason'} (${c.solution.motiveType}). ` +
      `${killer.surname} had been at ${PL(c.method.accessRequirement.place)} earlier in the evening, where the means lived, ` +
      `${aloneWith}. ` +
      `${c.clientId === killer.id ? `${killer.surname} is also the client: the one who did it hired us.` : `${P(c.clientId)} hired us.`}`,
  );
  out.push('');

  /* 2b. The Act --------------------------------------------------------- */
  out.push('## 2. The Act');
  out.push('');
  out.push(
    `**${c.act.type}** · **${c.act.tropeId}** · actor **${P(c.act.actorId)}** · ` +
      `at **${PL(c.act.place)}** · at **${clock(c.act.tick)}**`,
  );
  out.push('');
  const actBits: string[] = [];
  if (c.act.bodyFoundAt) actBits.push(`found at ${PL(c.act.bodyFoundAt)}`);
  if (c.act.taken) actBits.push(`taken: ${c.act.taken.name}`);
  if (c.act.entry) actBits.push(`entry: ${c.act.entry}`);
  if (c.act.goodsWentTo) actBits.push(`goods went to ${PL(c.act.goodsWentTo)}`);
  if (c.act.whereabouts) {
    actBits.push(
      `whereabouts: ${c.act.whereabouts === 'gone' ? 'gone' : PL(c.act.whereabouts)}`,
    );
  }
  if (c.act.fate) actBits.push(`fate: ${c.act.fate}`);
  if (actBits.length > 0) {
    out.push(actBits.map((b) => `- ${b}`).join('\n'));
    out.push('');
  }
  out.push('**Givens** — what the briefing states and the report does not ask:');
  out.push('');
  for (const line of c.act.givens.text) out.push(`- ${line}`);
  out.push('');
  out.push(`**Unknowns** — exactly what the report asks: **${c.act.unknowns.join('**, **')}**.`);
  out.push('');

  /* 3. Dramatis Personae ------------------------------------------------ */
  out.push('## 3. Dramatis Personae');
  out.push('');
  out.push('| Name | Role | Relationship | Class of secret | Motive | Found at | Killer |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  out.push(`| ${victim.name} | ${victim.role} | the victim | — | — | — | — |`);
  for (const p of suspects) {
    const secretLabel = p.coverSecret
      ? `${p.secret?.type ?? '—'} (+ ${p.coverSecret.type})`
      : (p.secret?.type ?? '—');
    out.push(
      `| ${p.name}${p.isClient ? ' (client)' : ''} | ${p.role} | ${p.relationshipToVictim ?? '—'} | ${secretLabel} | ${p.motive?.type ?? '—'} | ${PL(p.foundAt)} | ${p.isKiller ? '**YES**' : '—'} |`,
    );
  }
  for (const p of fixtures) {
    out.push(`| ${p.name} | ${p.role} | fixture (${p.fixtureRole}) | — | — | ${PL(p.foundAt)} | — |`);
  }
  out.push('');

  /* 4. Dossiers --------------------------------------------------------- */
  out.push('## 4. Dossiers');
  out.push('');
  out.push(
    'Every person, by layer: **0** on sight, **1** volunteered, **2** from other ' +
      'people, **3** in the documents.',
  );
  out.push('');
  const bio = c.victimBio;
  out.push(`### ${victim.surname} — the victim`);
  out.push('');
  out.push(
    `${bio.age}, ${bio.gender === 'f' ? 'a woman' : 'a man'}, ${bio.profession.role}. ` +
      `Wants: ${bio.want}.`,
  );
  out.push('');
  out.push(`- **Standing** — ${bio.standing}`);
  out.push(`- **Profession** — ${victim.surname} ${bio.profession.detail}.`);
  if (bio.discovery) {
    out.push(
      `- **Found** — ${bio.discovery.foundText} By ${P(bio.discovery.foundById)}, at ` +
        `${PL(bio.discovery.foundAt)}, at ${clock(bio.discovery.foundTick)}. ` +
        `Precinct: ${bio.discovery.precinct}.`,
    );
  }
  if (bio.lastSeen) {
    out.push(
      `- **Last seen** — ${bio.lastSeen.text} By ${P(bio.lastSeen.byId)}, at ` +
        `${PL(bio.lastSeen.place)}, at ${clock(bio.lastSeen.tick)}.`,
    );
  }
  out.push('');
  out.push(...dossierLines(bio));
  out.push('');

  for (const p of [...suspects, ...fixtures]) {
    const d = p.dossier;
    if (!d) continue;
    out.push(
      `### ${p.surname}${p.isKiller ? ' — the killer' : ''}${p.isClient ? ' — the client' : ''}`,
    );
    out.push('');
    out.push(
      `${d.age}, ${d.gender === 'f' ? 'a woman' : 'a man'}, ${d.profession.role}. ` +
        `Wants: ${d.want}. Tie: ${d.tie.text}${d.tie.since ? `, ${d.tie.since}` : ''}.`,
    );
    out.push('');
    out.push(...dossierLines(d));
    out.push('');
  }

  /* 5. The Client ------------------------------------------------------- */
  const client = person(c.clientId);
  const brief = c.clientBrief;
  out.push('## 5. The Client');
  out.push('');
  out.push(
    `**${client.surname}**, ${client.dossier?.tie.text ?? 'known to the victim'}. ` +
      `Purpose: **${brief.purpose}**${client.isKiller ? ' — and the killer' : ''}.`,
  );
  out.push('');
  out.push(`- **Why** — ${brief.purposeText}`);
  out.push(`- **What it costs** — ${brief.cost}`);
  out.push(
    `- **Points at** — ${P(brief.points.personId)}: ${brief.points.reason}. ` +
      `Honest: **${brief.points.honest ? 'yes' : 'no'}**.`,
  );
  out.push('');
  out.push('**Tells:**');
  out.push('');
  for (const t of brief.tellTexts) out.push(`- ${t}`);
  out.push('');
  out.push('**Withholds:**');
  out.push('');
  if (brief.withholdTexts.length === 0) out.push('- Nothing the case turns on.');
  for (const t of brief.withholdTexts) out.push(`- ${t}`);
  out.push('');
  out.push('**Their own evening, as they tell it:**');
  out.push('');
  for (const t of brief.ownEvening) out.push(`- ${t}`);
  out.push('');

  /* 6. The Briefing ----------------------------------------------------- */
  out.push('## 6. The Briefing');
  out.push('');
  out.push(
    `${c.briefingText.length} plain sentences, derived. This is the model of the plain ` +
      'register: the engine renders it, and Phase 2 measures pages against it.',
  );
  out.push('');
  // The record's form. What the client actually says out loud is the engine's
  // business, and page one is where it is read.
  c.briefingText.forEach((line, i) => out.push(`${i + 1}. ${line}`));
  out.push('');

  /* 7. Mentions --------------------------------------------------------- */
  out.push('## 7. Mentions');
  out.push('');
  if (c.mentions.length === 0) out.push('- Nobody outside the case is named.');
  for (const m of c.mentions) {
    out.push(`- **${m.name}** (${m.id}) — ${m.role}. ${m.text}`);
  }
  out.push('');

  /* 8. Places ----------------------------------------------------------- */
  out.push('## 8. Places');
  out.push('');
  for (const place of c.places) {
    const objects = place.objects
      .map((id) => c.objects.find((o) => o.id === id)?.name ?? id)
      .join(', ');
    const watcher = place.watcher
      ? `watched by ${place.watcher} (${P(c.people.find((p) => p.fixtureRole === place.watcher && p.foundAt === place.id)?.id)})`
      : 'unwatched';
    const tags: string[] = [];
    if (place.id === ML) tags.push('**THE SCENE**');
    if (place.isResidence) tags.push('the victim’s address');
    if (place.id === c.method.accessRequirement.place) tags.push('where the weapon lived');
    if (place.nearScene) tags.push('within earshot of the scene');
    out.push(
      `- **${place.name}** (${place.kind}) — ${watcher}; objects: ${objects || 'none'}${tags.length > 0 ? ` — ${tags.join('; ')}` : ''}`,
    );
  }
  out.push('');

  /* 5. Anchors ---------------------------------------------------------- */
  out.push('## 9. Anchors');
  out.push('');
  out.push(
    `The coroner gives ${clock(c.coronerWindow[0])}–${clock(c.coronerWindow[1])}, ` +
      `${['', 'one tick', 'two ticks', 'three ticks', 'four ticks'][c.coronerWindow[1] - c.coronerWindow[0] + 1] ?? 'several ticks'} wide. ` +
      (c.deduction.timeOfDeathAnchors.length > 0
        ? `These are what close it: **${c.deduction.timeOfDeathAnchors.join('** and **')}**.`
        : 'Nothing needs to close it.'),
  );
  out.push('');
  for (const a of c.anchors) {
    out.push(`- **${a.name}** — ${anchorWhen(a)}; ${anchorWhere(a, PL)}. ${anchorWhat(a)}`);
  }
  out.push('');

  /* 6. Timelines -------------------------------------------------------- */
  out.push('## 10. Timelines');
  out.push('');
  for (const p of [victim, ...suspects]) {
    const s = schedule(p.id);
    if (!s) continue;
    out.push(
      `### ${p.surname}${p.isKiller ? ' — the killer' : ''}${p.kind === 'victim' ? ' — the victim' : ''}`,
    );
    out.push('');
    out.push('| Tick | Time | Truth | Claimed | Companion claimed |');
    out.push('| --- | --- | --- | --- | --- |');
    for (let t = 0; t < TICKS; t++) {
      const lying = s.lies.includes(t);
      const isMurderCell = t === M && s.truth[t] === ML && (p.isKiller || p.kind === 'victim');
      const truthCell = `${PL(s.truth[t])}${isMurderCell ? ' ☠' : ''}`;
      const claimCell = lying ? `**${PL(s.claimed[t])}**` : PL(s.claimed[t]);
      out.push(
        `| ${t} | ${clock(t)} | ${truthCell} | ${claimCell} | ${s.claimedCompanion[t] ? P(s.claimedCompanion[t]) : '—'} |`,
      );
    }
    out.push('');
  }
  out.push('### Fixtures (never lie, never withhold)');
  out.push('');
  out.push(`| Tick | Time | ${fixtures.map((f) => `${f.surname} (${f.role})`).join(' | ')} |`);
  out.push(`| --- | --- | ${fixtures.map(() => '---').join(' | ')} |`);
  for (let t = 0; t < TICKS; t++) {
    const cells = fixtures.map((f) => PL(schedule(f.id)?.truth[t]));
    out.push(`| ${t} | ${clock(t)} | ${cells.join(' | ')} |`);
  }
  out.push('');

  /* 7. Secrets in play -------------------------------------------------- */
  out.push('## 11. Secrets in play');
  out.push('');
  for (const p of suspects) {
    if (p.secret) out.push(`- **${p.surname}** (${p.secret.type}): ${p.secret.description}`);
    if (p.coverSecret) {
      out.push(`- **${p.surname}** also (${p.coverSecret.type}): ${p.coverSecret.description}`);
    }
  }
  out.push('');

  /* 8. Clue list -------------------------------------------------------- */
  out.push(`## 12. Clue list — the ${findable.length} findable`);
  out.push('');
  out.push(
    `The opening three, free at the start: ${c.starting.join(', ')}. ` +
      'Everything else has to be led to. The full candidate pool is in the companion file.',
  );
  out.push('');
  for (const place of c.places) {
    const mine = findable.filter((cl) => cl.place === place.id);
    if (mine.length === 0) continue;
    out.push(`### At ${place.shortName}`);
    out.push('');
    for (const cl of mine) out.push(clueLine(c, cl));
    out.push('');
  }

  /* 9. Clue graph ------------------------------------------------------- */
  out.push('## 13. Clue graph');
  out.push('');
  out.push(...mermaid(c));
  out.push('');

  /* 10. Deduction path -------------------------------------------------- */
  out.push('## 14. Deduction path');
  out.push('');
  out.push(
    `Par is **${c.par} actions** and the budget is par plus ${c.slack}: **${c.budget}**. ` +
      'Every id below is a spine clue; the inference is the sheet\u2019s, not the clue\u2019s.',
  );
  out.push('');
  const spineIds = new Set(byRole('spine').map((cl) => cl.id));
  // The spec asks the deduction path to cite spine ids only, so the clues that
  // merely back it up are counted rather than named.
  const spineOnly = (list: Id[]): string => {
    const spineHits = list.filter((id) => spineIds.has(id));
    const rest = list.length - spineHits.length;
    const body = spineHits.length > 0 ? spineHits.join(', ') : 'no spine clue';
    return `_(${body}${rest > 0 ? `; + ${rest} corroborating` : ''})_`;
  };
  out.push(
    `**Time of death.** The coroner gives four ticks. The anchors close it to ${clock(M)}: one puts ${victim.surname} alive at ${clock(M - 1)}, the other times the scene at ${clock(M)}. ${(spineOnly(c.deduction.timeOfDeath))}`,
  );
  out.push('');
  out.push('**Clearing the innocent.**');
  out.push('');
  for (const p of suspects) {
    if (p.isKiller) continue;
    out.push(
      `- ${p.surname} was not at ${PL(ML)} at ${clock(M)}. ${(spineOnly(c.deduction.exculpations[p.id] ?? []))}`,
    );
  }
  out.push('');
  out.push(
    `**Naming the killer.** ${killer.surname} claims ${PL(schedule(killer.id)?.claimed[M])} at ${clock(M)}. ` +
      `Two independent sources put that out of the question. ${(spineOnly(c.deduction.inculpation))}`,
  );
  out.push('');
  out.push(
    `**The weapon.** ${killer.surname} was at ${PL(c.method.accessRequirement.place)} before ${clock(M)}, where ${c.objects.find((o) => o.id === c.method.evidenceObjectId)?.name ?? 'the weapon'} was kept. ${(spineOnly(c.deduction.access))}`,
  );
  out.push('');
  out.push(
    `**Method.** ${sentenceCase(c.method.name)}, on two physical sources. ${(spineOnly(c.deduction.method))}`,
  );
  out.push('');
  out.push(
    `**Motive.** ${c.solution.motiveType}, on two independent sources. ${(spineOnly(c.deduction.motive))}`,
  );
  out.push('');

  /* 11. Red herrings ---------------------------------------------------- */
  out.push('## 15. Red herrings');
  out.push('');
  const liars = suspects.filter((p) => !p.isKiller && (schedule(p.id)?.lies ?? []).includes(M));
  out.push('**Innocents who lie about the murder tick:**');
  out.push('');
  for (const p of liars) {
    out.push(
      `- ${p.surname} claims ${PL(schedule(p.id)?.claimed[M])} at ${clock(M)} and was really at ${PL(schedule(p.id)?.truth[M])}. Reason: ${p.secret?.description ?? 'unknown'}`,
    );
  }
  if (liars.length === 0) out.push('- None.');
  out.push('');
  const motived = suspects.filter((p) => !p.isKiller && p.motive);
  out.push('**Innocents with a motive:**');
  out.push('');
  for (const p of motived) out.push(`- ${p.surname} — ${p.motive?.type}: ${p.motive?.description}.`);
  if (motived.length === 0) out.push('- None.');
  out.push('');
  out.push('**Noise branches, and what knocks each one down:**');
  out.push('');
  const branchIds = Array.from(
    new Set(findable.filter((cl) => cl.branchId).map((cl) => cl.branchId as Id)),
  );
  for (const bid of branchIds) {
    const list = findable.filter((cl) => cl.branchId === bid);
    const about = list[0]?.aboutSecretOf;
    const disq = list.find((cl) => cl.role === 'disqualifier');
    out.push(
      `- **${bid}** (${P(about)}, ${person(about as Id)?.secret?.type ?? '—'}): ${list
        .filter((cl) => cl.role === 'noise')
        .map((cl) => cl.id)
        .join(' → ')} → **${disq?.id ?? '?'}** — ${disq?.text ?? ''}`,
    );
  }
  if (branchIds.length === 0) out.push('- None.');
  out.push('');
  // M7: where a tier has too few secrets to carry its noise, the rest is the
  // evening itself — an innocent seen somewhere at an hour that means nothing.
  const loose = findable.filter((cl) => cl.role === 'noise' && !cl.branchId);
  if (loose.length > 0) {
    out.push('**Loose ends — true, and about nothing:**');
    out.push('');
    for (const cl of loose) out.push(`- **${cl.id}** — ${cl.textRecord ?? cl.text}`);
    out.push('');
  }

  return out.join('\n');
}

/** A dossier's facts, grouped by the layer they can be learned at. */
function dossierLines(d: Dossier): string[] {
  const out: string[] = [];
  const titles: Record<number, string> = {
    0: 'Layer 0, on sight',
    1: 'Layer 1, volunteered',
    2: 'Layer 2, from other people',
    3: 'Layer 3, in the documents',
  };
  for (const layer of [0, 1, 2, 3] as const) {
    const mine = d.layers.filter((f) => f.layer === layer);
    if (mine.length === 0) continue;
    out.push(`**${titles[layer]}**`);
    out.push('');
    for (const f of mine) out.push(`- _${f.kind}_ — ${f.text}`);
    out.push('');
  }
  out.push('**Self-account** (layer 1, what they say when asked about themselves)');
  out.push('');
  for (const s of d.selfAccount) out.push(`- ${s}`);
  return out;
}

function anchorWhen(a: Anchor): string {
  if (a.ticks.length === 1) return `at ${clock(a.ticks[0] as Tick)}`;
  return `at ${a.ticks.map((t) => clock(t)).join(', ')}`;
}

function anchorWhere(a: Anchor, PL: (id: Id | null | undefined) => string): string {
  if (a.route) return `on a round through ${Array.from(new Set(a.route)).map(PL).join(' → ')}`;
  if (a.placeId) return `at ${PL(a.placeId)}`;
  return 'across the whole neighbourhood';
}

function anchorWhat(a: Anchor): string {
  return a.traces
    .map((t) => {
      switch (t.kind) {
        case 'sighting':
          return 'Somebody reliable notes who was there.';
        case 'knowledge':
          return `Only those present know that ${t.description}.`;
        case 'mark':
          return `Those present carry it: ${t.description}.`;
        case 'sound':
          return `You can time things by it: ${t.description}.`;
      }
    })
    .join(' ');
}

function sentenceCase(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

function clueLine(c: Case, clue: Clue): string {
  const facts = clue.establishes.length > 0 ? summarizeFacts(c, clue.establishes) : 'context only';
  const leads = clue.leadsTo.length > 0 ? ` → ${clue.leadsTo.join(', ')}` : ' → (end)';
  const branch = clue.branchId ? ` {${clue.branchId}}` : '';
  const start = c.starting.includes(clue.id) ? ' ⟨opening⟩' : '';
  const src =
    clue.source.type === 'person'
      ? `${c.people.find((p) => p.id === (clue.source as { personId: Id }).personId)?.surname ?? '?'} on ${(clue.source as { topic: string }).topic}`
      : `the place itself`;
  return `- **${clue.id}** [${clue.role}${branch}${start}] (${clue.kind}; ${src})${leads}\n  - ${clue.textRecord ?? clue.text}\n  - _establishes: ${facts}_`;
}

function summarizeFacts(c: Case, facts: Fact[]): string {
  const PL = (id: Id): string => c.places.find((p) => p.id === id)?.shortName ?? id;
  const P = (id: Id): string => c.people.find((p) => p.id === id)?.surname ?? id;

  const parts: string[] = [];
  let i = 0;
  while (i < facts.length) {
    const f = facts[i] as Fact;
    if (f.kind === 'personAt' || f.kind === 'personNotAt') {
      const ticks: Tick[] = [f.tick];
      let j = i + 1;
      while (j < facts.length) {
        const g = facts[j] as Fact;
        if (g.kind !== f.kind || g.personId !== f.personId || g.place !== f.place) break;
        ticks.push(g.tick);
        j++;
      }
      const range =
        ticks.length === 1
          ? clock(ticks[0] as Tick)
          : `${clock(ticks[0] as Tick)}–${clock(ticks[ticks.length - 1] as Tick)}`;
      parts.push(`${P(f.personId)} ${f.kind === 'personAt' ? 'at' : 'not at'} ${PL(f.place)}, ${range}`);
      i = j;
      continue;
    }
    switch (f.kind) {
      case 'objectMissing':
        parts.push(`something gone from ${PL(f.fromPlace)}`);
        break;
      case 'noiseAt':
        parts.push(`noise at ${PL(f.place)} at ${clock(f.tick)}`);
        break;
      case 'timeOfDeath':
        parts.push(
          `death between ${clock(f.ticks[0] as Tick)} and ${clock(f.ticks[f.ticks.length - 1] as Tick)}`,
        );
        break;
      case 'hasMotive':
        parts.push(`${P(f.personId)} had a motive (${f.motiveType})`);
        break;
      case 'hadAccess':
        parts.push(`${P(f.personId)} could reach the weapon`);
        break;
      case 'victimAliveAt':
        parts.push(`the victim alive at ${clock(f.tick)}`);
        break;
      case 'victimDeadBy':
        parts.push(`the victim dead by ${clock(f.tick)}`);
        break;
      case 'methodEvidence':
        parts.push('how it was done');
        break;
      case 'secretExplained':
        parts.push(`${P(f.personId)}’s ${f.secretType} accounted for`);
        break;
    }
    i++;
  }
  return parts.join('; ');
}

/** A `graph LR` of the findable clues, clustered by place. */
function mermaid(c: Case): string[] {
  const out: string[] = ['```mermaid', 'graph LR'];
  const label = (cl: Clue): string => {
    const who =
      cl.source.type === 'person'
        ? (c.people.find((p) => p.id === (cl.source as { personId: Id }).personId)?.surname ?? '?')
        : 'the place';
    const mark = cl.role === 'disqualifier' ? '✗ ' : c.starting.includes(cl.id) ? '▶ ' : '';
    return `${mark}${cl.id} ${who}`.replace(/["[\]()]/g, '');
  };

  let n = 0;
  for (const place of c.places) {
    const mine = c.findable.filter((cl) => cl.place === place.id);
    if (mine.length === 0) continue;
    n++;
    out.push(`  subgraph P${n}["${place.shortName.replace(/["[\]()]/g, '')}"]`);
    for (const cl of mine) out.push(`    ${cl.id}["${label(cl)}"]`);
    out.push('  end');
  }
  const findableIds = new Set(c.findable.map((cl) => cl.id));
  for (const cl of c.findable) {
    for (const next of cl.leadsTo) {
      if (!findableIds.has(next)) continue;
      const dashed = c.findable.find((x) => x.id === next)?.role === 'noise';
      out.push(`  ${cl.id} ${dashed ? '-.->' : '-->'} ${next}`);
    }
  }
  const group = (role: Clue['role']): string =>
    c.findable.filter((cl) => cl.role === role).map((cl) => cl.id).join(',');
  out.push('  classDef spine stroke-width:3px;');
  out.push('  classDef corrob stroke-width:1px;');
  out.push('  classDef noise stroke-dasharray: 4 3;');
  out.push('  classDef disq stroke-width:2px,stroke-dasharray: 1 0;');
  if (group('spine')) out.push(`  class ${group('spine')} spine;`);
  if (group('corroboration')) out.push(`  class ${group('corroboration')} corrob;`);
  if (group('noise')) out.push(`  class ${group('noise')} noise;`);
  if (group('disqualifier')) out.push(`  class ${group('disqualifier')} disq;`);
  out.push('```');
  return out;
}

/** The full pool: what is true, whether or not the player can reach it. */
export function renderCandidateSheet(c: Case): string {
  const out: string[] = [];
  const findable = new Set(c.findable.map((cl) => cl.id));
  out.push(`# ${c.neighborhood} — case ${c.seed}: the candidate pool`);
  out.push('');
  out.push(
    `${c.candidates.length} true things about the evening. ${findable.size} of them are findable ` +
      '(marked ★); the rest are the truth the report is graded against, not the truth the player can reach.',
  );
  out.push('');

  const bySource = new Map<string, Clue[]>();
  for (const cl of c.candidates) {
    const src = cl.source;
    const key =
      src.type === 'person'
        ? (c.people.find((p) => p.id === src.personId)?.surname ?? src.personId)
        : `${c.places.find((p) => p.id === src.placeId)?.shortName ?? src.placeId} (the place itself)`;
    const list = bySource.get(key) ?? [];
    list.push(cl);
    bySource.set(key, list);
  }
  for (const [source, list] of bySource) {
    out.push(`## ${source}`);
    out.push('');
    for (const cl of list) {
      const topic = cl.source.type === 'person' ? ` — on ${cl.source.topic}` : '';
      out.push(
        `- ${findable.has(cl.id) ? '★ ' : ''}**${cl.id}** [${cl.kind}]${topic} ${cl.text}\n  - _establishes: ${cl.establishes.length > 0 ? summarizeFacts(c, cl.establishes) : 'context only'}_`,
      );
    }
    out.push('');
  }

  out.push('## Withheld observations');
  out.push('');
  const withheld = c.observations.filter((o) => o.withheld);
  if (withheld.length === 0) out.push('- None.');
  const grouped = new Map<string, Tick[]>();
  for (const o of withheld) {
    const key = `${o.observerId}|${o.subjectId}|${o.place}`;
    const list = grouped.get(key) ?? [];
    list.push(o.tick);
    grouped.set(key, list);
  }
  for (const [key, ticks] of grouped) {
    const [observerId, subjectId, place] = key.split('|') as [Id, Id, Id];
    const name = (id: Id): string => c.people.find((p) => p.id === id)?.surname ?? id;
    const placeName = c.places.find((p) => p.id === place)?.shortName ?? place;
    const sorted = ticks.slice().sort((a, b) => a - b);
    out.push(
      `- ~~${name(observerId)} saw ${name(subjectId)} at ${placeName}, ${sorted.map((t) => clock(t)).join(', ')}~~ — lying about that time, will not say.`,
    );
  }
  out.push('');
  return out.join('\n');
}
