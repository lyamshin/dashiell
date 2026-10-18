/**
 * The voice kit (model/voice/README.md): the recorder's own WAV encoder and trimmer, run from
 * record.html as written and read back by the checker; the checker on a folder; the resume logic;
 * and the script generator's sections, counts, coverage and lints.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { checkClip, checkFolder, parseMetadata, readWav, type FolderIo, type ScriptLine } from '../scripts/voice-check.js';
import { balanceQuotes, buildScript, hintsFor, lineProblem, MAX_WORDS, scriptStats, SECTIONS, splitLong, type ScriptBuild } from '../scripts/voice-script.js';
import { wordsIn } from '../src/game/board/plan/sentences.js';

interface Levels {
  peak: number;
  peakDb: number;
  rmsDb: number;
  clipped: number;
}
interface Progress {
  version: number;
  clips: Record<string, { text: string | null; seconds: number; at: string }>;
  skipped: Record<string, { text: string; at: string }>;
  sittings: { start: string; kept?: number }[];
}
interface Summary {
  lines: number;
  done: number;
  skipped: number;
  toGo: number;
  seconds: number;
  sections: { title: string; lines: number; done: number; skipped: number; seconds: number }[];
}
interface Core {
  RATE: number;
  encodeWav(samples: Float32Array, rate: number): Uint8Array;
  wavHeader(bytes: Uint8Array, size?: number): { format: number; channels: number; rate: number; bits: number; frames: number; seconds: number } | null;
  levels(x: Float32Array): Levels;
  trimSilence(x: Float32Array, rate: number, padMs?: number): { start: number; end: number; samples: Float32Array } | null;
  takeWarnings(seconds: number, lv: Levels): { level: string; text: string }[];
  emptyProgress(): Progress;
  mergeProgress(a: unknown, b: unknown): Progress;
  summarize(script: ScriptLine[], progress: Progress, onDisk?: Set<string>): Summary;
  firstToDo(script: ScriptLine[], progress: Progress, onDisk?: Set<string>): number;
  metadataCsv(script: ScriptLine[], progress: Progress, onDisk?: Set<string>): string;
  resumeText(sum: Summary): string;
}

/** The recorder's own code: record.html's `<voice-core>` block, run as it stands. */
function core(): Core {
  const html = readFileSync(new URL('../model/voice/record.html', import.meta.url), 'utf8');
  const m = /\/\* <voice-core>[\s\S]*?\*\/([\s\S]*?)\/\* <\/voice-core> \*\//.exec(html);
  if (!m) throw new Error('record.html has no <voice-core> block');
  const names = 'RATE, encodeWav, wavHeader, levels, trimSilence, takeWarnings, emptyProgress, mergeProgress, summarize, firstToDo, metadataCsv, resumeText';
  return new Function(`${m[1]}\nreturn { ${names} };`)() as Core;
}

const tone = (rate: number, seconds: number, amp: number, hz = 220): Float32Array => {
  const x = new Float32Array(Math.round(rate * seconds));
  for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin((2 * Math.PI * hz * i) / rate);
  return x;
};

/** A folder in memory: `clips/…` names to bytes, the rest to text. */
function memIo(files: Record<string, Uint8Array | string>): FolderIo {
  return {
    list: (d) => {
      const xs = Object.keys(files).filter((k) => k.startsWith(`${d}/`)).map((k) => k.slice(d.length + 1));
      return xs.length ? xs : null;
    },
    read: (p) => {
      const f = files[p];
      return f instanceof Uint8Array ? f : null;
    },
    text: (p) => {
      const f = files[p];
      return typeof f === 'string' ? f : null;
    },
  };
}

describe('the recorder’s WAV, read back by the checker', () => {
  it('encodes a synthetic buffer as 22,050 Hz mono 16-bit PCM, and reads back sample for sample', () => {
    const c = core();
    const x = tone(c.RATE, 0.75, 0.5, 440);
    x[10] = 1.5;
    x[11] = -1.5;
    const bytes = c.encodeWav(x, c.RATE);
    expect(bytes.length).toBe(44 + x.length * 2);
    const w = readWav(bytes);
    if (typeof w === 'string') throw new Error(w);
    expect([w.format, w.channels, w.rate, w.bits, w.frames]).toEqual([1, 1, 22050, 16, x.length]);
    expect(w.seconds).toBeCloseTo(0.75, 3);
    for (let i = 0; i < x.length; i += 37) {
      const want = x[i] as number;
      const s = Math.max(-1, Math.min(1, want));
      expect(Math.abs((w.samples[i] as number) - Math.round(s < 0 ? s * 32768 : s * 32767))).toBeLessThanOrEqual(1);
    }
    // Out of range is clamped, never wrapped round.
    expect([w.samples[10], w.samples[11]]).toEqual([32767, -32768]);
    // The page reads a clip's length from its first bytes, the way it recovers a folder.
    expect(c.wavHeader(bytes.slice(0, 64), bytes.length)?.seconds).toBeCloseTo(0.75, 3);
    // And the checker passes it: two samples at full scale isn't clipping.
    expect(checkClip('t', bytes).errors).toEqual([]);
  });

  it('trims to the speech with 150 ms either side, and a key’s click isn’t speech', () => {
    const c = core();
    const R = c.RATE;
    const x = new Float32Array(Math.round(R * 2.5));
    for (let i = 0; i < x.length; i++) x[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.001;
    for (let i = Math.round(0.1 * R); i < Math.round(0.104 * R); i++) x[i] = 0.9;
    for (let i = R; i < Math.round(1.8 * R); i++) x[i] = (x[i] as number) + 0.3 * Math.sin((2 * Math.PI * 220 * i) / R);
    const t = c.trimSilence(x, R, 150);
    if (!t) throw new Error('no speech found');
    expect(t.start / R).toBeGreaterThan(0.83);
    expect(t.start / R).toBeLessThan(0.86);
    expect(t.end / R).toBeGreaterThan(1.94);
    expect(t.end / R).toBeLessThan(1.97);
    expect(t.samples.length).toBe(t.end - t.start);
    expect(c.trimSilence(new Float32Array(R), R, 150)).toBeNull();
  });

  it('warns of a clipped, long, short or quiet take', () => {
    const c = core();
    const loud = tone(c.RATE, 1, 1.2);
    const lv = c.levels(loud);
    expect(lv.clipped).toBeGreaterThan(100);
    expect(c.takeWarnings(1, lv).map((w) => w.level)).toContain('bad');
    expect(c.takeWarnings(13, c.levels(tone(c.RATE, 1, 0.3))).some((w) => /twelve/.test(w.text))).toBe(true);
    expect(c.takeWarnings(0.3, c.levels(tone(c.RATE, 0.3, 0.3))).some((w) => w.level === 'bad')).toBe(true);
    expect(c.takeWarnings(1, c.levels(tone(c.RATE, 1, 0.01))).map((w) => w.level)).toEqual(['warn']);
    expect(c.takeWarnings(2, c.levels(tone(c.RATE, 2, 0.3)))).toEqual([]);
  });
});

describe('the checker on a folder', () => {
  const script: ScriptLine[] = [
    { id: 'wu-1', text: 'One.', section: 'Warm-up' },
    { id: 'wu-2', text: 'Two.', section: 'Warm-up' },
    { id: 'pg-3', text: 'Three.', section: 'Pages' },
  ];

  it('passes a partial folder, and counts it by section', () => {
    const c = core();
    const clip = c.encodeWav(tone(c.RATE, 1.2, 0.3), c.RATE);
    const r = checkFolder(memIo({ 'clips/wu-1.wav': clip, 'clips/wu-2.wav': clip, 'metadata.csv': 'wu-1|One.\nwu-2|Two.\n' }), script);
    expect(r.errors).toEqual([]);
    expect(r.clips.length).toBe(2);
    expect(r.seconds).toBeCloseTo(2.4, 2);
    expect([r.done, r.toGo]).toEqual([2, 1]);
    expect(r.sections.map((s) => [s.title, s.done, s.lines])).toEqual([
      ['Warm-up', 2, 2],
      ['Pages', 0, 1],
    ]);
  });

  it('refuses the wrong rate, clipping, a clip too short, and metadata that doesn’t match', () => {
    const c = core();
    const r = checkFolder(
      memIo({
        'clips/wu-1.wav': c.encodeWav(tone(44100, 1, 0.3), 44100),
        'clips/wu-2.wav': c.encodeWav(tone(c.RATE, 1, 1.3), c.RATE),
        'clips/pg-3.wav': c.encodeWav(tone(c.RATE, 0.2, 0.3), c.RATE),
        'metadata.csv': 'wu-1|One.\nwu-2|Two.\nzz-9|Nine.\n',
      }),
      script,
    );
    const all = r.errors.join('\n');
    expect(all).toMatch(/wu-1\.wav: 44100 Hz, not 22050/);
    expect(all).toMatch(/wu-2\.wav: clipped/);
    expect(all).toMatch(/pg-3\.wav: 0\.20 s, under 0\.5/);
    expect(all).toMatch(/pg-3\.wav has no row in metadata\.csv/);
    expect(all).toMatch(/zz-9 has no clips\/zz-9\.wav/);
  });

  it('reads Piper’s id|text rows and nothing looser', () => {
    expect(parseMetadata('a-1|Words, “quoted”.\n\nb-2|More.\n').rows.map((r) => r.id)).toEqual(['a-1', 'b-2']);
    expect(parseMetadata('a-1|one|two\nno bar\n').errors.length).toBe(2);
    expect(checkFolder(memIo({ 'clips/wu-1.wav': core().encodeWav(tone(22050, 1, 0.3), 22050) }), script).errors.join()).toMatch(/no metadata\.csv/);
  });
});

describe('stop and resume', () => {
  const script: ScriptLine[] = [
    { id: 'a', text: 'A one.', section: 'S' },
    { id: 'b', text: 'B two.', section: 'S' },
    { id: 'c', text: 'C three.', section: 'T' },
    { id: 'd', text: 'D four.', section: 'T' },
  ];
  const local = { version: 1, clips: { a: { text: 'A one.', seconds: 61, at: '2026-10-18T10:00:00Z' } }, skipped: {}, sittings: [{ start: 's1', kept: 1 }] };
  const folder = {
    version: 1,
    clips: { a: { text: 'A one.', seconds: 61, at: '2026-10-18T10:00:00Z' }, b: { text: 'B two.', seconds: 30, at: '2026-10-18T11:00:00Z' } },
    skipped: { c: { text: 'C three.', at: '2026-10-18T11:01:00Z' } },
    sittings: [{ start: 's1', kept: 1 }, { start: 's2', kept: 1 }],
  };

  it('says how far it got, and starts at the first line neither kept nor skipped', () => {
    const c = core();
    const p = c.mergeProgress(local, folder);
    const sum = c.summarize(script, p);
    expect(c.resumeText(sum)).toBe('2 lines done, 1 skipped, 1 to go, about 2 minutes recorded so far.');
    expect(c.firstToDo(script, p)).toBe(3);
    expect(p.sittings.map((s) => s.start)).toEqual(['s1', 's2']);
    expect(c.resumeText(c.summarize(script, c.emptyProgress()))).toBe('Nothing recorded yet: 4 lines to go.');
  });

  it('loses nothing to a cleared browser: the folder’s progress alone says the same', () => {
    const c = core();
    expect(c.summarize(script, c.mergeProgress(null, folder))).toEqual(c.summarize(script, c.mergeProgress(local, folder)));
  });

  it('holds a clip to its words, and to the folder it’s in', () => {
    const c = core();
    const p = c.mergeProgress(local, folder);
    expect(c.firstToDo(script.map((l) => (l.id === 'a' ? { ...l, text: 'A one, again.' } : l)), p)).toBe(0);
    expect(c.firstToDo(script, p, new Set(['b']))).toBe(0);
    expect(c.metadataCsv(script, p, new Set(['a', 'b']))).toBe('a|A one.\nb|B two.\n');
    // A clip kept from an older script keeps its own words in the index.
    const older = c.mergeProgress(p, { clips: { z: { text: 'Gone from the script.', seconds: 2, at: '2026-10-18T12:00:00Z' } } });
    expect(c.metadataCsv(script, older)).toBe('a|A one.\nb|B two.\nz|Gone from the script.\n');
    // A recording beats an older skip of the same words.
    const redone = c.mergeProgress(p, { clips: { c: { text: 'C three.', seconds: 3, at: '2026-10-18T12:00:00Z' } } });
    expect(redone.skipped.c).toBeUndefined();
  });
});

describe('the script generator', () => {
  let built: ScriptBuild;
  beforeAll(() => {
    built = buildScript();
  }, 120_000);

  it('has the five sections in recording order, at their sizes, about an hour', () => {
    const st = scriptStats(built.lines);
    expect(st.sections.map((s) => s.title)).toEqual(SECTIONS.map((s) => s.title));
    // In order: a section's lines all come before the next's.
    const order = built.lines.map((l) => SECTIONS.findIndex((s) => s.title === l.section));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    SECTIONS.forEach((s, i) => {
      const n = st.sections[i]?.lines ?? 0;
      expect(n, s.title).toBeGreaterThanOrEqual(s.range[0]);
      expect(n, s.title).toBeLessThanOrEqual(s.range[1]);
    });
    expect(st.lines).toBeGreaterThanOrEqual(650);
    expect(st.lines).toBeLessThanOrEqual(800);
    expect(st.minutes).toBeGreaterThanOrEqual(55);
    expect(st.minutes).toBeLessThanOrEqual(65);
    // Mostly four to twelve words, none too long to read in one clip.
    expect(st.short / st.lines).toBeGreaterThan(0.55);
    expect(st.longest).toBeLessThanOrEqual(MAX_WORDS);
  });

  it('every line passes the jargon and prose lints, in curly quotes and American spelling, with an id of its own', () => {
    const warmUp = SECTIONS[0]?.title;
    for (const l of built.lines) expect(lineProblem(l.text, { help: l.section === warmUp }), l.text).toBeNull();
    const ids = built.lines.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of built.lines) expect(l.id).toMatch(/^(?:wu|nm|hr|pg|ph)-[0-9a-f]{8}$/);
    expect(new Set(built.lines.map((l) => l.text.toLowerCase())).size).toBe(built.lines.length);
    // The lints catch what they're for.
    expect(lineProblem('She said "no".')).toBe('straight quote');
    expect(lineProblem('He was the grey man.')).toBe('British spelling');
    expect(lineProblem('At ten, the hour that mattered, she was out.')).toMatch(/^engine word/);
    expect(lineProblem('It was 10 o’clock.')).toBe('digit');
  });

  it('reads every composite shape and texture slot, the favorites, the hard names with a hint', () => {
    expect(built.missing).toEqual([]);
    const pages = built.lines.filter((l) => l.section === 'Pages');
    expect(pages.filter((l) => /playtesters’ favorite/.test(l.note ?? '')).length).toBeGreaterThanOrEqual(18);
    expect(pages.some((l) => l.text.includes('which is manners of a kind'))).toBe(true);
    const names = built.lines.filter((l) => l.section === 'Names and places');
    for (const hard of ['Hochstetter', 'Kaminsky', 'Szabo', 'Teitel', 'Wojcik', 'Ostrow', 'Crowninshield']) {
      const ls = names.filter((l) => l.text.includes(hard));
      expect(ls.length, hard).toBeGreaterThanOrEqual(2);
      for (const l of ls) expect(l.note ?? '', hard).toContain(`${hard}: ${hintsFor(hard)?.split(': ')[1]}`);
    }
    // Every hour of the night, in the game's own wordings.
    const hours = built.lines.filter((l) => l.section === 'Hours, money and numbers').map((l) => l.text).join(' ');
    for (const w of ['seven', 'eight', 'nine', 'ten', 'eleven', 'Midnight', 'half past eleven', 'nine or ten', 'twenty minutes to an hour']) expect(hours).toContain(w);
  });

  it('marks speech with a note, so a character gets a light shift', () => {
    const speech = built.lines.filter((l) => l.text.includes('“'));
    expect(speech.length).toBeGreaterThan(100);
    for (const l of speech) expect(l.note ?? '', l.text).toMatch(/speech|quot|Speech/i);
    for (const l of speech) expect((l.text.match(/“/g) ?? []).length, l.text).toBe((l.text.match(/”/g) ?? []).length);
  });

  it('cuts a long sentence where it can be said in two, and gives a quotation cut from its paragraph its marks', () => {
    const long = 'Now his story had a hole in it: the flats over Lipsky’s at ten, but if what he said now was true, he had been at the card room over Feingold’s garage at ten, not home.';
    const split = splitLong(long);
    expect(split?.pieces).toEqual(['Now his story had a hole in it: the flats over Lipsky’s at ten.', 'But if what he said now was true, he had been at the card room over Feingold’s garage at ten, not home.']);
    expect(split?.pieces.every((p) => wordsIn(p) <= MAX_WORDS)).toBe(true);
    expect(splitLong('A short one.')).toBeNull();
    expect(balanceQuotes('Next was nine.', true)).toBe('“Next was nine.”');
    expect(balanceQuotes('“Eight?', false)).toBe('“Eight?”');
    expect(balanceQuotes('Alone at ten and eleven.”', true)).toBe('“Alone at ten and eleven.”');
  });
});

describe('model/voice/script.json, as committed', () => {
  it('has the shape the recorder reads: id, text, section and a note where there is one', () => {
    const lines = JSON.parse(readFileSync(new URL('../model/voice/script.json', import.meta.url), 'utf8')) as Record<string, unknown>[];
    expect(lines.length).toBeGreaterThanOrEqual(650);
    expect(lines.length).toBeLessThanOrEqual(800);
    for (const l of lines) {
      expect(Object.keys(l).every((k) => ['id', 'text', 'section', 'note'].includes(k))).toBe(true);
      expect(typeof l.id === 'string' && typeof l.text === 'string' && typeof l.section === 'string').toBe(true);
    }
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    expect([...new Set(lines.map((l) => l.section))]).toEqual(SECTIONS.map((s) => s.title));
  });
});
