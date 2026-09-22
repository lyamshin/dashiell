import { generateCase } from '../src/gen/index.js';

const k = generateCase(7, { difficulty: 2, detectiveName: 'Dashiell' });
console.log(k.places.map((p) => [p.id, p.shortName, p.kind, p.watcher ?? '-'].join(' | ')).join('\n'));
const client = k.people.find((p) => p.id === k.clientId);
console.log('client', k.clientId, client?.surname, client?.foundAt, client?.archetypeId);
console.log(
  'starting',
  k.starting
    .map((id) => {
      const c = k.findable.find((c) => c.id === id);
      return `${c?.id}:${c?.kind}`;
    })
    .join(', '),
);
console.log('par', k.par, 'budget', k.budget, 'scene', k.solution.murderPlaceId, 'hood', k.neighborhood);
