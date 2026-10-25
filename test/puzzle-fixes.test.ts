/**
 * docs/65: the puzzle-side fixes. The passer-by's street (docs/63 U11's leftover), the refuser night's
 * shortcut (docs/61 §8), and round 6's three: a face matched for the player at Hard-boiled, a star
 * that picked one of two suspects the evidence treats the same, and star reasons at an hour that
 * didn't matter.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { crossingStreet, groundOf, placeSpot, streetReach, type Spot } from '../src/gen/board/streets.js';
import { pageStars, pickerFor } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid } from '../src/game/board/grid.js';
import { collisionsOf, faceUnmatched } from '../src/game/board/knowledge.js';
import { dealBoard, placeOf, type BoardDeal, type BoardRun, type Hour, type PlaceId } from '../src/game/board/model.js';
import { playReader } from '../src/game/board/oracle.js';
import { spot } from '../src/game/board/walk.js';

const played = (seed: number, tier: TierIndex, type: string, cmds: string[]): { d: BoardDeal; run: BoardRun } => {
  const d = dealBoard(seed, tier, type as 'murder');
  let run = newBoardRun(d);
  for (const c of cmds) {
    const r = stepBoard(d, run, c);
    expect(r.error, c).toBeUndefined();
    run = r.run;
  }
  return { d, run };
};

describe('docs/65 §1: the passer-by passes the culprit where their walks cross', () => {
  it('every side remark names a street on the passer-by’s walk and the culprit’s way to or from the scene', () => {
    let n = 0;
    let scene = 0;
    for (const world of [undefined, 'neighbourhood']) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const type of typesFor(4)) {
          const c = dealBoard(seed, 4, type, world ? { world } : {}).kase;
          for (const a of c.accounts) {
            for (const r of a.remarks) {
              const m = / I passed .+? on (.+?), /.exec(r.text);
              if (!m) continue;
              n++;
              const street = m[1] as string;
              const hc = c.crime.hour;
              const rows = c.board.rows;
              const at = (p: PlaceId): Spot => spot(c, p);
              const walk: [Spot, Spot] = [at(rows[a.person]?.[hc - 1] as PlaceId), at(rows[a.person]?.[hc] as PlaceId)];
              // On the passer-by's own walk, a block either side at most.
              expect(streetReach(street, groundOf(walk[0], walk[1]), walk[0]), `${c.id}: ${street}`).toBeDefined();
              // And where the generator's rule puts it: the scene's own street where the walks cross on it.
              const C = c.crime.culprit;
              const after = (rows[C]?.[hc + 1] ?? (c.type === 'murder' ? 'h' : 'bar')) as PlaceId;
              const theirs: [Spot, Spot][] = [[at(rows[C]?.[hc - 1] as PlaceId), at(c.crime.scene)], [at(c.crime.scene), at(after)]];
              expect(crossingStreet(walk, at(c.crime.scene), theirs), c.id).toBe(street);
              if (street === placeOf(c, c.crime.scene)?.street) scene++;
            }
          }
        }
      }
    }
    expect(n).toBe(48);
    // Most nights still say the scene's own street.
    expect(scene / n).toBeGreaterThan(0.4);
  });

  it('Medium 14: Pickering, from Catherine Street to the chop house on Grand Street, passed Thorndike on Broome Street', () => {
    const c = dealBoard(14, 4, 'lost-pet').kase;
    const r = c.accounts.find((a) => a.person === 'pickering')?.remarks[0];
    expect(r?.text).toBe('Walking over to the chop house at ten I passed Thorndike on Broome Street, going fast, no hat.');
    expect(placeOf(c, 'neighbours')?.street).toBe('Catherine Street');
    expect(placeOf(c, 'bar')?.street).toBe('Grand Street');
  });

  it('the walk reads the same map', () => {
    const c = dealBoard(14, 4, 'lost-pet').kase;
    for (const p of c.places) expect(spot(c, p.id)).toEqual(placeSpot(p, p.id));
  });
});

describe('docs/65 §2: a collision keeps the line that first broke the story', () => {
  it('the last-liar reader, citing what the collision shows against the other liar, no longer solves the refusers’ nights', () => {
    let n = 0;
    let solved = 0;
    for (const tier of [3, 4] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        for (let seed = 1; seed <= 10; seed++) {
          n++;
          if (playReader(dealBoard(seed, tier, type), seed, { guess: 'last', cite: true }).ok) solved++;
        }
      }
    }
    expect(solved / n).toBeLessThan(0.15);
  });
});

describe('docs/65 §3: at Hard-boiled the player puts the name to the face', () => {
  const route = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'ask grasso evening', 'put grasso 10 list:xwatcher@10', 'go bar', 'ask barkeep list', 'ask abramowitz evening', 'go h', 'ask renfro evening'];

  it('Hard-boiled 8: Renfro’s ten isn’t a clash until the camel coat is pencilled on Abramowitz', () => {
    const { d, run } = played(8, 5, 'murder', route);
    const c = d.kase;
    expect(faceUnmatched(c, run, 'renfro', 10 as Hour)).toBe(true);
    expect(boardGrid(c, run).rows.find((r) => r.id === 'renfro')?.cells[10]?.collision).toBe(false);
    expect(collisionsOf(c, run, 'renfro')).toEqual([]);
    expect(collisionsOf(c, run, 'renfro', { all: true }).map((x) => x.hour)).toEqual([10]);
    expect(pickerFor(d, run, 'renfro')).toBeNull();
    // The tester's own pencil: Abramowitz at the Odessa at ten.
    const marked: BoardRun = { ...run, marks: { abramowitz: { '10': { at: 'bar' } } } };
    expect(boardGrid(c, marked).rows.find((r) => r.id === 'renfro')?.cells[10]?.collision).toBe(true);
    expect(pickerFor(d, marked, 'renfro')?.claims.map((x) => x.label)).toEqual(['the Odessa at ten']);
    // Or Renfro pencilled out of the Odessa.
    expect(faceUnmatched(c, { ...run, marks: { renfro: { '10': { notAt: ['bar'] } } } }, 'renfro', 10 as Hour)).toBe(false);
    // A clash the face plays no part in shows as before: Grasso's, against the landlady's list.
    expect(boardGrid(c, run).rows.find((r) => r.id === 'grasso')?.cells[10]?.collision).toBe(true);
  });

  it('the put still lands, and once it has the grid shows it', () => {
    const { d, run } = played(8, 5, 'murder', [...route, 'put renfro 10 list:barkeep@10']);
    expect(run.puts.at(-1)?.landed).toBe(true);
    expect(faceUnmatched(d.kase, run, 'renfro', 10 as Hour)).toBe(false);
  });

  it('nothing is held back below Hard-boiled', () => {
    for (const tier of [0, 1, 2, 3, 4] as TierIndex[]) {
      const d = dealBoard(3, tier, 'murder');
      const p = playReader(d, 3);
      for (const x of collisionsOf(d.kase, p.run, undefined, { all: true })) expect(faceUnmatched(d.kase, p.run, x.person, x.hour as Hour)).toBe(false);
    }
  });
});

describe('docs/65 §4 and §5: stars name everybody the evidence treats the same, for the hour that matters', () => {
  it('Raw 11: after Mrs. Kowalski’s list the star names Bellucci and Steinbach together, and Moe’s stars them both', () => {
    const { d, run } = played(11, 0, 'lost-item', ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list']);
    const walk = pageStars(d, run).find((s) => s.command === 'go bar');
    expect(walk?.why).toBe('Bellucci and Steinbach could have had the spare key, and nobody had said where either of them was at ten — ask them where they were');
    const at = played(11, 0, 'lost-item', ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list', 'go bar']);
    expect(pageStars(at.d, at.run).map((s) => s.command)).toEqual(expect.arrayContaining(['ask bellucci evening', 'ask steinbach evening']));
  });

  it('Medium 14: Alfano is asked for at ten, not for eight', () => {
    const { d, run } = played(14, 4, 'lost-pet', ['go scene', 'search scene', 'go neighbours', 'ask whitfield evening', 'go bar', 'ask barkeep list', 'ask pickering evening', 'go h', 'ask thorndike evening']);
    expect(pageStars(d, run)[0]?.why).toBe('Alfano was at the meeting, and nobody had said where she was at ten — ask Alfano where she was');
  });

  it('a reason keeps its pointer’s own capitals: “Kowalski’s — the spare key is in the sugar tin there”', () => {
    const d = dealBoard(11, 0, 'lost-item');
    const st = pageStars(d, newBoardRun(d)).find((s) => s.command === 'go neighbours');
    expect(st?.why).toBe('the spare key is in the sugar tin there — ask the landlady who was there');
  });
});
