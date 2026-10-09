import type { Account, BoardCase, Hour, PersonId, PlaceId, WatchList } from './types.js';
import { TIER_NAMES } from './types.js';
import type { Analysis } from './path.js';
import { minimalSets, refusalShortcut } from './path.js';
import { fmtHour, key, questionById, questionsOf, solve } from './solver.js';
import { techniquesUpTo, TIERS, LADDER } from './tiers.js';
import { checkInvariants, invariantFailures } from './invariants.js';

/** docs/42 §4: the plain-text reading of one case, for the designer. */

const cap = (s: string) => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

export function renderCase(c: BoardCase, a: Analysis): string {
  const person = (id: PersonId) => c.people.find((p) => p.id === id);
  const pname = (id: PersonId) => person(id)?.short ?? id;
  const place = (id: PlaceId) => c.places.find((p) => p.id === id);
  const plname = (id: PlaceId) => place(id)?.short ?? id;
  const hours = c.board.hours;
  const out: string[] = [];
  const line = (s = '') => out.push(s);
  const rule = (title: string) => {
    line();
    line(title.toUpperCase());
    line('-'.repeat(title.length));
  };

  line(`${c.id}: ${TIER_NAMES[c.tier]} (tier ${c.tier}), ${c.type}${c.variant ? `, ${c.variant} variant` : ''}`);
  if (c.setup) line(`Setup: the means ${c.setup.means}; the clock ${c.setup.clock}; the client points for ${c.setup.pointer}.`);

  rule('The givens (the office, free)');
  for (const t of c.givens.text) line(`  ${t}`);

  rule('The people');
  for (const p of c.people) {
    const tag = p.role === 'suspect' ? '' : ` [${p.role}]`;
    const extra = [p.motive ? `motive: ${p.motive}` : '', p.secret ? `secret: ${p.secret}` : '', p.look && c.variant === 'face' ? `seen ${p.look}` : '', `found at ${plname(p.foundAt)}`]
      .filter(Boolean)
      .join('; ');
    line(`  ${p.name}${tag}: ${p.description}. ${cap(extra)}.`);
  }

  rule('The places');
  for (const p of c.places) {
    const w = c.lists.filter((l) => l.place === p.id).map((l) => pname(l.watcher));
    const used = hours.some((h) => Object.values(c.board.rows).some((r) => r[h] === p.id));
    line(`  ${p.name} (${p.kind}${openText(p.open)})${p.scene ? ' [the scene]' : ''}${w.length ? ` [watched by ${w.join(', ')}]` : ''}${p.offBoard ? ' [off the board: a witness’s own rooms]' : used ? '' : ' [off the board: only a lie goes there]'}`);
  }
  // A board hour is the hour from that o'clock. Say when a place shuts, not a range that reads
  // as if the all-night Automat closed at ten.
  function openText(o: [Hour, Hour]): string {
    const from = o[0] > (hours[0] as Hour) ? ` from ${fmtHour(o[0])}` : '';
    const till = o[1] < (hours[hours.length - 1] as Hour) ? ` until ${fmtHour(o[1] + 1)}` : '';
    return from || till ? `, open${from}${till}` : '';
  }

  rule('The true board');
  const rowIds = [...c.people.filter((p) => p.role === 'suspect'), ...c.people.filter((p) => p.role === 'company'), ...c.people.filter((p) => p.role === 'victim')].map((p) => p.id);
  const w0 = Math.max(...rowIds.map((id) => pname(id).length)) + 3;
  const cw = Math.max(14, ...rowIds.flatMap((id) => hours.map((h) => plname(c.board.rows[id]?.[h] ?? '').length + 2)));
  line(`  ${''.padEnd(w0)}${hours.map((h) => String(h).padEnd(cw)).join('')}`);
  for (const id of rowIds) {
    const mark = id === c.crime.culprit ? '*' : person(id)?.role === 'victim' ? '†' : person(id)?.role === 'company' ? '·' : ' ';
    line(`  ${(pname(id) + ' ' + mark).padEnd(w0)}${hours.map((h) => plname(c.board.rows[id]?.[h] ?? '?').padEnd(cw)).join('')}`);
  }
  line('  (* culprit, † victim or the lost thing, · company-only witness)');
  for (const id of rowIds) {
    const rs = c.board.reasons[id];
    if (!rs) continue;
    const moves = Object.entries(rs).map(([h, r]) => `${h}: ${r}`);
    if (moves.length) line(`  ${pname(id)} moves — ${moves.join('; ')}`);
  }

  rule('The means');
  const m = c.means;
  line(`  ${cap(m.name)}. Origin: ${plname(m.origin)} — ${m.originText}.`);
  line(`  There to be taken at: ${m.available.join(', ')}. Delay: ${m.delay[0] === m.delay[1] ? `${m.delay[0]} min` : `${m.delay[0]}–${m.delay[1]} min`}.`);
  line(`  The crime: ${pname(c.crime.culprit)} at ${plname(c.crime.scene)} at ${c.crime.hour}. The office's window: ${c.crime.window.join('–')}.`);
  if (c.crime.whereNow) line(`  Where it is now: ${c.crime.whereNow.text}. Why: ${c.crime.why}.`);

  rule('Accounts (asked "Where were you tonight?")');
  const lieAt = new Set(c.lies.map((l) => key(l.person, l.hour)));
  for (const acc of c.accounts) {
    line(`  ${pname(acc.person)}${person(acc.person)?.role === 'company' ? ' (company-only)' : ''}:`);
    for (const h of hours) line(`    ${String(h).padStart(2)}  ${sayHour(acc, h)}${lieAt.has(key(acc.person, h)) ? '   [LIE]' : ''}`);
    for (const r of acc.remarks) line(`        “${r.text}”${r.side ? ' [side remark]' : ''}`);
  }

  function sayHour(acc: Account, h: Hour): string {
    const cl = acc.claims[h];
    if (!cl) return '(nothing)';
    const who = cl.company.map(pname);
    const withText = who.length ? `, with ${who.join(' and ')}` : ', alone';
    const reason = cl.reason ? ` (${cl.reason})` : '';
    return `“${cap(fmtHour(h))} o’clock, ${plname(cl.place)}${withText}.”${reason}`;
  }

  rule("Watchers' lists (asked \"Who was here tonight?\")");
  for (const l of c.lists) for (const x of renderList(l)) line(x);
  function renderList(l: WatchList): string[] {
    const rows = [`  ${pname(l.watcher)}, ${plname(l.place)}:`];
    for (const h of hours) {
      const es = l.entries[h];
      if (!es) {
        rows.push(`    ${String(h).padStart(2)}  (can't say)`);
        continue;
      }
      const pl = place(l.place);
      if (pl && (h < pl.open[0] || h > pl.open[1])) {
        rows.push(`    ${String(h).padStart(2)}  Closed. Nobody.`);
        continue;
      }
      const names = es.map((e) => ('person' in e ? pname(e.person) : 'other' in e ? (c.others?.find((o) => o.id === e.other)?.name ?? e.other) : `somebody ${e.look} I didn't know`));
      const said = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] ?? '');
      rows.push(`    ${String(h).padStart(2)}  ${names.length ? `${said}. Nobody else.` : 'Nobody.'}`);
    }
    if (l.unseen?.length) rows.push(`        (can't see ${l.unseen.map(pname).join(', ')})`);
    for (const r of l.remarks) rows.push(`        “${r.text}”${r.side ? ' [side remark]' : ''}`);
    return rows;
  }

  rule('Scene finds');
  for (const f of c.finds) line(`  ${cap(f.what)} at ${plname(f.place)}: ${f.text}${f.gives.means ? ' [the means]' : ''}${f.gives.why ? ' [the motive]' : ''}`);

  rule('The lies, and what each collides with');
  const T = techniquesUpTo(c.tier);
  const qs = questionsOf(c).map((q) => q.id);
  for (const l of c.lies) {
    const k = key(l.person, l.hour);
    const breaks = minimalSets(
      qs.filter((q) => !q.startsWith('confront:')),
      [],
      (held) => solve(c, held, { techniques: T }).status.get(k)?.s === 'broken',
      3,
      false,
    ).map((set) => set.filter((q) => q !== `account:${l.person}`).map((q) => questionById(c, q)?.label.replace(/^Ask /, '') ?? q).join(' + '));
    line(`  ${pname(l.person)} at ${l.hour} (${l.kind}): says ${plname(l.claim)}, was at ${plname(l.truth)}.`);
    line(`    collides with: ${breaks.length ? breaks.join('  |  ') : 'NOTHING'}`);
    const k2 = c.confrontations.find((x) => x.person === l.person && x.hour === l.hour);
    if (k2) line(`    put to it (${k2.response}): ${k2.text}${k2.secondLie ? `  [the second lie collides with ${k2.secondLie.collidesWith}]` : ''}`);
  }

  rule(`The designed path: par ${a.par} questions${a.motive ? ' + 1 motive search' : ''}, ${a.walks} walks; budget ${a.budget}`);
  a.path.forEach((s, i) => {
    line(`  ${i + 1}. ${s.label}  (at ${plname(s.at)})${s.techniques.length ? `  [${s.techniques.join(', ')}]` : ''}`);
    line(`       why: ${s.why}`);
    for (const g of s.gives) line(`       · ${g}`);
    if (s.connects.length) line(`       joins ${s.connects.join(', ')}`);
    if (s.removes.length) line(`       rules out ${s.removes.map(pname).join(', ')}`);
  });
  if (a.motive) line(`  +. ${questionById(c, a.motive)?.label ?? a.motive}  (why)`);

  rule('The suggested order (rule 18)');
  a.suggested.forEach((s, i) => {
    line(`  ${i + 1}. ${s.label}`);
    line(`       why: ${s.why}`);
  });

  rule('Rivals and their routes (crime hour known)');
  for (const r of a.rivals) {
    line(`  ${pname(r.id)}: ${r.routes.length} route${r.routes.length === 1 ? '' : 's'}`);
    for (const rt of r.routes) line(`    - ${rt.map((q) => questionById(c, q)?.label ?? q).join(' + ') || '(the scene search alone)'}`);
  }

  rule('Technique rating');
  const newAt = LADDER[c.tier]?.join(', ');
  line(`  Rated ${a.rating === null ? 'unsolvable' : TIER_NAMES[a.rating]} (Tatham: the lowest tier whose techniques finish). Built for ${TIER_NAMES[c.tier]}, whose new technique is ${newAt}.`);
  line(`  Budget: par ${a.par} + ${TIERS[c.tier].slack} = ${a.budget}.`);
  line(`  Interaction: ${a.interaction.ok ? 'every clue joins another; no single question settles who' : `loners ${a.interaction.loners.join(', ') || 'none'}; settles alone ${a.interaction.settles.join(', ') || 'none'}`}.`);
  if (Number.isFinite(a.par)) {
    const sc = refusalShortcut(c, a.par);
    line(
      `  Refusal shortcut (put it to every liar, name whoever won't own up): ${
        sc.fails ? 'names nobody, since more than one refuses' : `${sc.capped ? 'more than ' + (sc.cost! - 1) : sc.cost} questions, a gain of ${sc.capped ? 'at most ' : ''}${sc.gain} on par`
      }.`,
    );
  }
  const inv = invariantFailures(checkInvariants(c, Number.isFinite(a.par) ? a : undefined));
  line(`  Invariants: ${inv.length === 0 ? 'all hold' : ''}`);
  for (const x of inv) line(`    ✗ ${x}`);
  return out.join('\n');
}
