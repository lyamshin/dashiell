/**
 * docs/60: the texture dial, on its own so anything may read it (the voicings' chooser, the rhythm,
 * the writers) without importing the planner. `lean` is the default; `full` writes the pages as they
 * read before docs/60, byte for byte.
 */
export const TEXTURE: { mode: 'lean' | 'full' } = { mode: 'lean' };

/** Whether docs/60's rules are on. */
export function lean(): boolean {
  return TEXTURE.mode === 'lean';
}

/** Set the dial from a flag's value (`full` or `lean`); anything else is the default. */
export function setTexture(v: string | null | undefined): void {
  TEXTURE.mode = v === 'full' ? 'full' : 'lean';
}
