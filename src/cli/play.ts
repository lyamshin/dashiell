/**
 * `npm run play -- <command> … --save <file>`: the book, played blind, in
 * plain text. See docs/37-play-cli.md, or `npm run play -- help`.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ignoreBrokenPipe } from './args.js';
import { runPlay } from './play-lib.js';

ignoreBrokenPipe();

const result = runPlay(process.argv.slice(2), {
  read: (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null),
  write: (path, data) => writeFileSync(path, data, 'utf8'),
});
(result.code === 0 ? process.stdout : process.stderr).write(`${result.out}\n`);
process.exitCode = result.code;
