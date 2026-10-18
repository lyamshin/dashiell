/**
 * The voice kit's checker (model/voice/README.md): a recordings folder, finished or not, held to
 * what the fine-tune needs.
 *
 *   npx tsx scripts/voice-check.ts DIR                                   # DIR holds clips/, metadata.csv, progress.json
 *   npx tsx scripts/voice-check.ts DIR --script model/voice/script.json  # the script to count against (this is the default)
 *
 * Every clip: a RIFF WAVE of 16-bit PCM, mono, at 22,050 Hz, half a second to twelve seconds long,
 * with nothing at full scale. `metadata.csv`: `id|text`, a row for every clip and a clip for every
 * row, no id twice, no empty text; a row whose words aren't the script's words for that id now is a
 * warning (it was read from an older script, and its own words are the ones that count). Then the
 * minutes so far, in all and by section, how far through the script it is, and each clip's loudness
 * against the rest (one far off is a sitting that didn't match the others).
 *
 * Exits 1 on any error. `readWav`, `checkClip` and `checkFolder` take bytes and names, for the tests.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RATE = 22050;
export const MIN_SECONDS = 0.5;
export const MAX_SECONDS = 12;
/** A clip this far (dB) from the others' median loudness is flagged. */
export const LOUDNESS_SPREAD = 6;

export interface Wav {
  format: number;
  channels: number;
  rate: number;
  bits: number;
  frames: number;
  seconds: number;
  /** The first channel's samples, when they're 16-bit. */
  samples: Int16Array;
}

/** A WAV's format and samples, or what's wrong with it. Walks the chunks, so a longer header is fine. */
export function readWav(bytes: Uint8Array): Wav | string {
  if (bytes.length < 12) return 'too short to be a WAV file';
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number): string => String.fromCharCode(bytes[at] ?? 0, bytes[at + 1] ?? 0, bytes[at + 2] ?? 0, bytes[at + 3] ?? 0);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return 'not a RIFF WAVE file';
  let at = 12;
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;
  while (at + 8 <= bytes.length) {
    const id = tag(at);
    const len = v.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ') {
      if (len < 16 || body + 16 > bytes.length) return 'a broken fmt chunk';
      fmt = { format: v.getUint16(body, true), channels: v.getUint16(body + 2, true), rate: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true) };
    } else if (id === 'data') {
      if (!fmt) return 'its data comes before its format';
      const frameBytes = Math.max(1, fmt.channels * Math.ceil(fmt.bits / 8));
      const frames = Math.floor((Math.min(bytes.length, body + len) - body) / frameBytes);
      const samples = new Int16Array(fmt.bits === 16 ? frames : 0);
      if (fmt.bits === 16) for (let i = 0; i < frames; i++) samples[i] = v.getInt16(body + i * frameBytes, true);
      return { ...fmt, frames, seconds: frames / Math.max(1, fmt.rate), samples };
    }
    at = body + len + (len % 2);
  }
  return fmt ? 'no data chunk' : 'no fmt chunk';
}

export interface ClipReport {
  id: string;
  seconds: number;
  peakDb: number;
  rmsDb: number;
  fullScale: number;
  errors: string[];
  warnings: string[];
}

const db = (a: number): number => (a > 0 ? 20 * Math.log10(a) : -120);

/** One clip held to the format, the length and the level. */
export function checkClip(id: string, bytes: Uint8Array): ClipReport {
  const w = readWav(bytes);
  if (typeof w === 'string') return { id, seconds: 0, peakDb: -120, rmsDb: -120, fullScale: 0, errors: [w], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (w.format !== 1) errors.push(`format ${w.format}, not PCM`);
  if (w.channels !== 1) errors.push(`${w.channels} channels, not mono`);
  if (w.rate !== RATE) errors.push(`${w.rate} Hz, not ${RATE}`);
  if (w.bits !== 16) errors.push(`${w.bits}-bit, not 16`);
  if (w.seconds < MIN_SECONDS) errors.push(`${w.seconds.toFixed(2)} s, under ${MIN_SECONDS}`);
  if (w.seconds > MAX_SECONDS) errors.push(`${w.seconds.toFixed(2)} s, over ${MAX_SECONDS}`);
  let peak = 0;
  let sum = 0;
  let fullScale = 0;
  for (let i = 0; i < w.samples.length; i++) {
    const s = w.samples[i] as number;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    if (s >= 32767 || s <= -32767) fullScale++;
    sum += s * s;
  }
  const peakDb = db(peak / 32768);
  const rmsDb = db(Math.sqrt(sum / Math.max(1, w.samples.length)) / 32768);
  if (fullScale >= 3) errors.push(`clipped: ${fullScale} samples at full scale`);
  if (w.samples.length > 0 && peakDb < -30) warnings.push(`quiet: peak ${peakDb.toFixed(0)} dB`);
  return { id, seconds: w.seconds, peakDb, rmsDb, fullScale, errors, warnings };
}

export interface ScriptLine {
  id: string;
  text: string;
  section: string;
}

/** What the checker reads a folder through: the names in a subfolder, a file's bytes, a file's text. Null where there's none. */
export interface FolderIo {
  list(dir: string): string[] | null;
  read(path: string): Uint8Array | null;
  text(path: string): string | null;
}

export interface SectionReport {
  title: string;
  lines: number;
  done: number;
  seconds: number;
}

export interface FolderReport {
  clips: ClipReport[];
  rows: number;
  seconds: number;
  errors: string[];
  warnings: string[];
  sections: SectionReport[];
  /** Lines of the script with a clip from their words as they are now, and lines still to go. */
  done: number;
  toGo: number;
}

/** Parses `id|text` rows: Piper's single-speaker LJSpeech layout. */
export function parseMetadata(csv: string): { rows: { id: string; text: string; line: number }[]; errors: string[] } {
  const rows: { id: string; text: string; line: number }[] = [];
  const errors: string[] = [];
  csv.split(/\r?\n/).forEach((raw, i) => {
    if (raw.trim() === '') return;
    const bar = raw.indexOf('|');
    if (bar < 0) return void errors.push(`metadata.csv line ${i + 1}: no “|” between the id and the text`);
    const id = raw.slice(0, bar);
    const text = raw.slice(bar + 1);
    if (text.includes('|')) errors.push(`metadata.csv line ${i + 1}: more than two columns`);
    if (!/^[\w.-]+$/.test(id)) errors.push(`metadata.csv line ${i + 1}: “${id}” isn’t a clip id`);
    if (text.trim() === '') errors.push(`metadata.csv line ${i + 1}: ${id} has no text`);
    rows.push({ id, text, line: i + 1 });
  });
  return { rows, errors };
}

/** The whole folder: every clip, the metadata against the clips, the minutes by section. */
export function checkFolder(io: FolderIo, script: readonly ScriptLine[] | null): FolderReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const names = io.list('clips');
  if (names === null) errors.push('no clips folder: record a line and keep it first');
  const wavs = (names ?? []).filter((n) => /\.wav$/i.test(n)).sort();
  for (const n of names ?? []) if (!/\.wav$/i.test(n) && !n.startsWith('.')) warnings.push(`clips/${n} isn’t a WAV`);
  const ids = wavs.map((n) => n.replace(/\.wav$/i, ''));
  const clips: ClipReport[] = [];
  for (const id of ids) {
    const bytes = io.read(`clips/${id}.wav`);
    const c = bytes ? checkClip(id, bytes) : { id, seconds: 0, peakDb: -120, rmsDb: -120, fullScale: 0, errors: ['unreadable'], warnings: [] };
    clips.push(c);
    for (const e of c.errors) errors.push(`clips/${id}.wav: ${e}`);
    for (const w of c.warnings) warnings.push(`clips/${id}.wav: ${w}`);
  }
  // The metadata against the clips, and against the script.
  const csv = io.text('metadata.csv');
  const byId = new Map((script ?? []).map((l) => [l.id, l]));
  let rows = 0;
  if (csv === null) {
    if (ids.length > 0) errors.push('no metadata.csv: press “Write the index” in the recorder');
  } else {
    const parsed = parseMetadata(csv);
    errors.push(...parsed.errors);
    rows = parsed.rows.length;
    const seen = new Set<string>();
    for (const r of parsed.rows) {
      if (seen.has(r.id)) errors.push(`metadata.csv: ${r.id} is there twice`);
      seen.add(r.id);
      if (!ids.includes(r.id)) errors.push(`metadata.csv: ${r.id} has no clips/${r.id}.wav`);
      const line = byId.get(r.id);
      if (script && !line) warnings.push(`metadata.csv: ${r.id} isn’t in the script (an older script’s line: its own words still count)`);
      else if (line && line.text !== r.text) warnings.push(`metadata.csv: ${r.id} was read from other words than the script has now`);
    }
    for (const id of ids) if (!seen.has(id)) errors.push(`clips/${id}.wav has no row in metadata.csv: press “Write the index” in the recorder`);
  }
  // Loudness: each clip against the median of the rest.
  const sorted = clips.filter((c) => c.errors.length === 0).map((c) => c.rmsDb).sort((a, b) => a - b);
  const median = sorted.length ? (sorted[Math.floor(sorted.length / 2)] as number) : 0;
  if (sorted.length >= 8) {
    for (const c of clips) {
      if (c.errors.length === 0 && Math.abs(c.rmsDb - median) > LOUDNESS_SPREAD) warnings.push(`clips/${c.id}.wav: ${c.rmsDb > median ? 'louder' : 'quieter'} than the rest by ${Math.abs(c.rmsDb - median).toFixed(0)} dB`);
    }
  }
  // Minutes, by the script's sections.
  const seconds = clips.reduce((n, c) => n + c.seconds, 0);
  const clipById = new Map(clips.map((c) => [c.id, c]));
  const meta = csv === null ? new Map<string, string>() : new Map(parseMetadata(csv).rows.map((r) => [r.id, r.text]));
  const sections: SectionReport[] = [];
  let done = 0;
  for (const l of script ?? []) {
    let s = sections.find((x) => x.title === l.section);
    if (!s) {
      s = { title: l.section, lines: 0, done: 0, seconds: 0 };
      sections.push(s);
    }
    s.lines++;
    const c = clipById.get(l.id);
    if (c && (csv === null || meta.get(l.id) === l.text)) {
      s.done++;
      s.seconds += c.seconds;
      done++;
    }
  }
  const outside = clips.filter((c) => !byId.has(c.id));
  if (script && outside.length) sections.push({ title: 'Not in the script', lines: 0, done: outside.length, seconds: outside.reduce((n, c) => n + c.seconds, 0) });
  return { clips, rows, seconds, errors, warnings, sections, done, toGo: (script?.length ?? 0) - done };
}

function nodeIo(dir: string): FolderIo {
  return {
    list: (d) => (existsSync(join(dir, d)) ? readdirSync(join(dir, d)) : null),
    read: (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f)) : null),
    text: (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null),
  };
}

function minutes(s: number): string {
  return `${(s / 60).toFixed(1)} min`;
}

const isMain = process.argv[1] !== undefined && /voice-check\.ts$/.test(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const si = args.indexOf('--script');
  const scriptPath = si >= 0 ? (args[si + 1] as string) : 'model/voice/script.json';
  const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--script');
  if (!dir) {
    process.stderr.write('usage: npx tsx scripts/voice-check.ts DIR [--script model/voice/script.json]\n');
    process.exit(2);
  }
  const script = existsSync(scriptPath) ? (JSON.parse(readFileSync(scriptPath, 'utf8')) as ScriptLine[]) : null;
  if (!script) process.stdout.write(`(no script at ${scriptPath}: counting the clips only)\n`);
  const r = checkFolder(nodeIo(dir), script);
  const scriptSeconds = (script ?? []).reduce((n, l) => n + (l.text.split(/\s+/).length / 145) * 60 + 0.3, 0);
  process.stdout.write(`voice check: ${dir}\n`);
  process.stdout.write(`  ${r.clips.length} clips, ${minutes(r.seconds)}${script ? ` (the script reads in about ${Math.round(scriptSeconds / 60)} min); ${r.done} of ${script.length} lines done, ${r.toGo} to go` : ''}\n`);
  for (const s of r.sections) process.stdout.write(`  ${s.title.padEnd(30)} ${String(s.done).padStart(4)}${s.lines ? ` of ${String(s.lines).padEnd(4)}` : '        '} ${minutes(s.seconds).padStart(9)}\n`);
  if (r.clips.length) {
    const peaks = r.clips.map((c) => c.peakDb).sort((a, b) => a - b);
    process.stdout.write(`  peaks from ${(peaks[0] as number).toFixed(0)} to ${(peaks[peaks.length - 1] as number).toFixed(0)} dB; ${r.rows} rows in metadata.csv\n`);
  }
  const show = (label: string, xs: string[]): void => {
    if (!xs.length) return;
    process.stdout.write(`\n${label} (${xs.length}):\n`);
    for (const x of xs.slice(0, 40)) process.stdout.write(`  ${x}\n`);
    if (xs.length > 40) process.stdout.write(`  … and ${xs.length - 40} more\n`);
  };
  show('errors', r.errors);
  show('warnings', r.warnings);
  process.stdout.write(r.errors.length ? '\nNot ready: fix the errors above.\n' : '\nReady for the fine-tune, as far as it goes.\n');
  process.exitCode = r.errors.length ? 1 : 0;
}
