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
}

declare const process: {
  argv: string[];
  exitCode: number | undefined;
  exit(code?: number): never;
  stdout: {
    write(chunk: string): boolean;
    on(event: 'error', listener: (err: { code?: string }) => void): void;
  };
  stderr: { write(chunk: string): boolean };
};
