/**
 * Just enough of Node's surface for the CLIs and the tests.
 *
 * The dev dependencies are typescript, tsx, vitest and vite, and `@types/node`
 * is not one of them. These declarations keep `tsc --noEmit` honest without
 * adding it.
 */

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string | URL, encoding: string): string;
  /** The tests and `npm run trace` read the card files. */
  export function readdirSync(path: string | URL): string[];
  /** `scripts/claudisms.ts` walks src/ and content/ for a sentence's source. */
  export function readdirSync(path: string | URL, opts: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
  /** docs/50: the tiny model's export, as bytes. */
  export function readFileSync(path: string | URL): Uint8Array;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
}

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode: number | undefined;
  exit(code?: number): never;
  stdout: {
    write(chunk: string): boolean;
    on(event: 'error', listener: (err: { code?: string }) => void): void;
  };
  stderr: { write(chunk: string): boolean };
};
