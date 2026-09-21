/**
 * Just enough of Node's surface for the two CLI entry points.
 *
 * The milestone allows exactly three dev dependencies — typescript, tsx and
 * vitest — so `@types/node` is not one of them. These declarations keep
 * `tsc --noEmit` honest without adding a fourth.
 */

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare const process: {
  argv: string[];
  exitCode: number | undefined;
  exit(code?: number): never;
  stdout: { write(chunk: string): boolean };
  stderr: { write(chunk: string): boolean };
};
