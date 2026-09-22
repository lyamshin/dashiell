/**
 * Just enough of Node's surface for the two CLI entry points.
 *
 * The milestone allows exactly three dev dependencies — typescript, tsx and
 * vitest — so `@types/node` is not one of them. These declarations keep
 * `tsc --noEmit` honest without adding a fourth.
 */

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function existsSync(path: string): boolean;
  /** The golden loop's page dump clears its output directory before filling it. */
  export function rmSync(
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ): void;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare const process: {
  argv: string[];
  /** Read by the tests, to print the table that went into the notes. */
  env: Record<string, string | undefined>;
  exitCode: number | undefined;
  exit(code?: number): never;
  stdout: {
    write(chunk: string): boolean;
    on(event: 'error', listener: (err: { code?: string }) => void): void;
  };
  stderr: { write(chunk: string): boolean };
};
