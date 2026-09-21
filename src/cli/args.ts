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
