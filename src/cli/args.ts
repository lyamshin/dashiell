/**
 * `npm run case -- --seed 42 --json | head` closes stdout early, which Node
 * reports as an unhandled EPIPE and a stack trace. Piping into `head` is a
 * normal thing to do to these commands, so treat it as a clean exit.
 */
export function ignoreBrokenPipe(): void {
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') process.exit(0);
  });
}

export interface ParsedArgs {
  flags: Set<string>;
  values: Map<string, string>;
}

export type TierFlag = 0 | 1 | 2 | 3 | 4 | 5 | 'over-easy';
export type LevelFlag = 1 | 2 | 3 | 4;

/**
 * M7: `--tier 0..5|over-easy` and `--level 1..4`. Either may be left out: a
 * tier alone plays at Precinct (Raw always plays at Beat), a level alone plays
 * Hard-boiled on the M7 ladder. Neither is today's case, as before. `null`
 * means one of them was not a value the game has.
 */
export function parseTierLevel(
  values: Map<string, string>,
): { tier?: TierFlag; level?: LevelFlag } | null {
  const out: { tier?: TierFlag; level?: LevelFlag } = {};
  const tier = values.get('tier');
  if (tier !== undefined) {
    if (tier === 'over-easy') out.tier = 'over-easy';
    else if (['0', '1', '2', '3', '4', '5'].includes(tier)) out.tier = Number(tier) as TierFlag;
    else return null;
  }
  const level = values.get('level');
  if (level !== undefined) {
    if (!['1', '2', '3', '4'].includes(level)) return null;
    out.level = Number(level) as LevelFlag;
  }
  return out;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      values.set(name, next);
      i++;
    } else {
      flags.add(name);
    }
  }
  return { flags, values };
}
