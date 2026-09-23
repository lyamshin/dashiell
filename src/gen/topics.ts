import type { Case, Clue, Person } from './types.js';

/**
 * M10 §A.5: "I would ask Crowninshield about their own evening."
 *
 * The logic pool writes one topic for everybody's account of themselves,
 * "their own evening", because it is one key in the ask table. On the page it
 * is always about one person, and the case knows that person's sex, so the
 * finished case says "his own evening" or "her own evening" instead. The key
 * stays one key per person: every clue that person tells about their own
 * evening carries the same words.
 */
export function ownTopics(kase: Case): Case {
  const byId = new Map<string, Person>(kase.people.map((p) => [p.id, p]));
  const fix = (c: Clue): void => {
    if (c.source.type !== 'person' || !/\btheir own\b/.test(c.source.topic)) return;
    const person = byId.get(c.source.personId);
    const gender = person?.gender ?? person?.dossier?.gender;
    if (gender !== 'm' && gender !== 'f') return;
    c.source = { ...c.source, topic: c.source.topic.replace(/\btheir own\b/g, gender === 'f' ? 'her own' : 'his own') };
  };
  for (const c of kase.candidates) fix(c);
  for (const c of kase.findable) fix(c);
  return kase;
}
