import type { Environment, Id, Location, Tick } from './types.js';
import { ELEVATOR_EDGES } from './data/locations.js';

/**
 * Read-only view over a case's map. Movement is one edge per tick, or stay put.
 * The elevator edges drop out of the graph while the elevator is out of order,
 * which is how "anyone moving between floors then used the service stairs"
 * becomes a fact about the world rather than a sentence in a clue.
 */
export class MapGraph {
  readonly ids: Id[];
  readonly byId: Record<Id, Location>;
  private readonly elevatorOut: [Tick, Tick] | undefined;
  private readonly distCache: Record<string, number>;

  constructor(locations: Location[], env: Environment) {
    this.ids = locations.map((l) => l.id);
    this.byId = {};
    for (const l of locations) this.byId[l.id] = l;
    this.elevatorOut = env.elevatorOut;
    this.distCache = {};
    this.computeDistances();
  }

  loc(id: Id): Location {
    const l = this.byId[id];
    if (!l) throw new Error(`unknown location ${id}`);
    return l;
  }

  name(id: Id): string {
    return this.loc(id).name;
  }

  private elevatorDownAt(tick: Tick): boolean {
    if (!this.elevatorOut) return false;
    return tick >= this.elevatorOut[0] && tick <= this.elevatorOut[1];
  }

  private isElevatorEdge(a: Id, b: Id): boolean {
    return ELEVATOR_EDGES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  }

  /** Where you can be at `tick` if you were at `from` at `tick - 1`. Includes staying. */
  movesInto(from: Id, tick: Tick): Id[] {
    const out: Id[] = [from];
    for (const n of this.loc(from).adjacent) {
      if (this.elevatorDownAt(tick) && this.isElevatorEdge(from, n)) continue;
      out.push(n);
    }
    return out;
  }

  /** Shortest hop count ignoring the elevator outage. Used only for feasibility pruning. */
  dist(a: Id, b: Id): number {
    const v = this.distCache[`${a}|${b}`];
    return v === undefined ? Infinity : v;
  }

  adjacentOrSame(a: Id, b: Id): boolean {
    return a === b || this.loc(a).adjacent.includes(b);
  }

  /** Can a person standing at `from` see into `at`? */
  canSee(from: Id, at: Id): boolean {
    return from === at || this.loc(from).sightlines.includes(at);
  }

  private computeDistances(): void {
    for (const start of this.ids) {
      const seen: Record<Id, number> = { [start]: 0 };
      const queue: Id[] = [start];
      while (queue.length > 0) {
        const cur = queue.shift() as Id;
        for (const n of this.loc(cur).adjacent) {
          if (seen[n] === undefined) {
            seen[n] = (seen[cur] as number) + 1;
            queue.push(n);
          }
        }
      }
      for (const [k, v] of Object.entries(seen)) this.distCache[`${start}|${k}`] = v;
    }
  }
}
