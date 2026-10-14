/**
 * docs/50: the tiny model's export, read from disk for the Node scripts
 * (`model:sample`, `model:bench`) and the tests. The book will fetch it
 * instead (`fetchModel` in src/game/board/model/).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TinyLM, type ModelHeader } from '../src/game/board/model/index.js';

/** `public/model/`, or `MODEL_DIR` to read another export. */
export const EXPORT_DIR = process.env.MODEL_DIR ?? join('public', 'model');

export function modelHeader(dir = EXPORT_DIR): ModelHeader {
  return JSON.parse(readFileSync(join(dir, 'dashiell.json'), 'utf8')) as ModelHeader;
}

export function loadModel(dir = EXPORT_DIR): TinyLM {
  const header = modelHeader(dir);
  const buf = readFileSync(join(dir, 'dashiell.bin'));
  const bin = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new TinyLM(header, bin);
}

export function hasModel(dir = EXPORT_DIR): boolean {
  return existsSync(join(dir, 'dashiell.json')) && existsSync(join(dir, 'dashiell.bin'));
}
