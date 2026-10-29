/**
 * The claudisms lint (docs/56): the tics of model-written prose (A) and the
 * builders' own words leaking into what the player reads (B), counted over
 * rendered nights, not over source.
 *
 *   npx tsx scripts/claudisms.ts                  # the 36 nights, every pattern, counts and sources
 *   npx tsx scripts/claudisms.ts --nights 12      # the first twelve of them
 *   npx tsx scripts/claudisms.ts --only A08,B10   # some patterns
 *   npx tsx scripts/claudisms.ts --examples 5     # more verbatim examples a pattern
 *   npx tsx scripts/claudisms.ts --trace 60       # trace up to 60 hits a pattern to their source (default 25; 0 skips)
 *   npx tsx scripts/claudisms.ts --json           # the whole tally, as JSON
 *   npx tsx scripts/claudisms.ts --dump DIR       # write each night's surfaces to DIR, to read
 *   npx tsx scripts/claudisms.ts --gates          # docs/59 item 7's gates: exit 1 on any breach
 *
 * The nights: tiers 0–5, both worlds (the dealt city and the neighbourhood),
 * three case types each (Raw to Poached: murder, lost pet, lost thing; above:
 * murder, lost pet, murder), each read along the oracle's route, the way
 * `npm run read` reads it. What is read, by surface:
 *
 *   page      each page's body (pageBodyText), narration and speech;
 *             a pattern scoped `narration` sees it with the quoted speech taken out
 *   choices   every page's choice labels, notes and star reasons (choicesText)
 *   notebook  the notebook and the grid at the night's end (notebookText)
 *   verdict   the scored report, said plainly, and the closing
 *   story     "What really happened"
 *   curtain   the true board, the lies and the path
 *   ui        the book's and the play CLI's own strings: string literals in
 *             src/ui/, src/cli/play-lib.ts and src/game/board/teach.ts, and
 *             index.html's description; once, not a night
 *
 * A page hit is traced with scripts/trace-line.ts (`traceRun`) to the card,
 * voicing, template or engine string that wrote it; the other surfaces name
 * the function that renders them, and a ui hit its file and line.
 *
 * Nothing here gates the suite but `--gates` (docs/59 item 7, held by `test/clarity.test.ts` over
 * twelve nights): one simile frame a page ("as if", "like somebody", "the way you’d"); the room asked
 * to help ("as if the tables could help") once a night; "as it turned out" and "which I wrote down"
 * (and kin) once a night each; a running gag (the radiator, the register) on two pages a night at
 * most. The rest is a measure, and the numbers in docs/56 are its output.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { parseArgs } from '../src/cli/args.js';
import type { CaseType, TierIndex } from '../src/gen/board/types.js';
import { boardChoices } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { curtainOfBoard, scoreBoard, storyOfBoard } from '../src/game/board/report.js';
import { choicesText, notebookText, pageBodyText } from '../src/game/board/text.js';
import { traceRun } from './trace-line.js';
import { ticIssues } from '../src/game/board/clarity-lint.js';

/* ------------------------------------------------------------ the patterns */

type Surface = 'page' | 'choices' | 'notebook' | 'verdict' | 'story' | 'curtain' | 'ui';
/** `narration`: page bodies with quoted speech removed. `page`: page bodies whole. `player`: every surface. `labels`: every surface but page bodies. */
type Scope = 'narration' | 'page' | 'player' | 'labels';

export interface Pattern {
  id: string;
  group: 'A' | 'B';
  name: string;
  scope: Scope;
  re: RegExp;
  /** Intended game term the player is taught: counted, flagged as not a leak. */
  taught?: boolean;
}

const Q = `[’']`; // an apostrophe, curly or straight
const SENT = `(?:^|[.!?]["”’)]?\\s+)`; // a sentence start

export const PATTERNS: Pattern[] = [
  // ---------------------------------------------------------------- A: claudisms
  { id: 'A01', group: 'A', name: '"the way people/you/somebody …" simile', scope: 'page', re: new RegExp(`(?<!\\b(?:on|by|all|of|along|out of|halfway|across|part of|in) )\\bthe way (?:you|you${Q}d|people|a man|a woman|men|women|somebody|someone|anybody|everybody|a |an |they|he|she|kids|cops|dogs|cats|some|other|only|the)\\b`, 'gi') },
  { id: 'A02', group: 'A', name: 'simile frame: "like a/somebody …", "as if", "as though"', scope: 'page', re: /\b(?:like (?:a|an|somebody|someone|something|the|it was|he was|she was|they were|he|she|they)\b|as if\b|as though\b)/gi },
  { id: 'A03', group: 'A', name: '"which is to say"', scope: 'page', re: /\bwhich is to say\b/gi },
  { id: 'A04', group: 'A', name: '"in a way that …"', scope: 'page', re: /\bin a way (?:that|nobody|you|only|I)\b/gi },
  { id: 'A05', group: 'A', name: '"not X but Y" / "isn’t X. It’s Y"', scope: 'page', re: new RegExp(`\\bnot (?:[\\w’']+[ ,]+){1,5}but (?!I\\b|he\\b|she\\b|they\\b|it\\b|nobody\\b|there\\b|then\\b|now\\b)|\\b(?:isn|wasn)${Q}t [^.!?]{1,40}[.;] (?:It|This|That)${Q}?s?(?: was)? `, 'gi') },
  { id: 'A06', group: 'A', name: 'polysyndeton: "X, and Y, and Z"', scope: 'page', re: /, and [^.;:!?,“”]{1,60}, and /gi },
  { id: 'A07', group: 'A', name: 'tag-ons: "did most of the work", "which suited us both", "and meant it", "knew it", "in that company"', scope: 'page', re: new RegExp(`\\b(?:did|does|doing) (?:most|all|half|the rest|the bulk) of the (?:work|talking|lifting)\\b|\\bwhich suited (?:us|me|him|her|them|everybody)\\b|\\band (?:I|he|she|they) meant it\\b|\\b(?:and|but) (?:he|she|it|they|I) knew it\\b|\\bin that company\\b|\\b(?:I|he|she) meant it\\b`, 'gi') },
  { id: 'A08', group: 'A', name: 'objects with feelings (rooms that remember, stairs that warn, "by way of hello")', scope: 'page', re: /\b(?:the |a |my |his |her )?(?:room|rooms|house|place|stairs|staircase|door|street|chair|lamp|clock|city|building|bar|night|rain|window|glass|desk|office|hat|coat|shadow|light|cat|dog|telephone|fire|kettle|stove|boiler|radiator|floor|wall|walls|cup|bottle|sign|radio|el|elevator|mat|awning|piano|engine|car|mirror|block|tenement|landing)\b(?:(?!\b(?:I|he|she|they|we|you|everybody|nobody|somebody|anybody|who|that|which)\b)[^.;!?“”]){0,22}?\b(?:remember(?:s|ed)?|forgot|forgave|forgiv\w+|approv\w+|disapprov\w+|agreed|sulk\w*|warn\w*|liked|didn[’']t like|minded|didn[’']t mind|wanted|didn[’']t want|decided|pretend\w*|had opinions|had given up|gave up|was waiting|had been waiting|knew\b|knows\b|let it pass|without comment|with (?:real )?conviction|took it personally|had seen worse|kept its own counsel|didn[’']t care|cared|sighed|complained|objected)|\bby way of (?:hello|greeting|apology|comment|answer|welcome|conversation)\b|\b(?:had|has|have) given up\b(?! on (?:me|him|her|them|it)\b)|\bfor reasons of (?:its|their) own\b|\bto think things over\b|\bhad never had company\b|\b(?:to itself|to themselves)\b/gi },
  { id: 'A09', group: 'A', name: '"a little"', scope: 'page', re: /\ba little\b/gi },
  { id: 'A10', group: 'A', name: '"somehow"', scope: 'page', re: /\bsomehow\b/gi },
  { id: 'A11', group: 'A', name: '"for a moment" / "a moment"', scope: 'page', re: /\b(?:for )?a moment\b/gi },
  { id: 'A12', group: 'A', name: '"for the moment"', scope: 'page', re: /\bfor the moment\b/gi },
  { id: 'A13', group: 'A', name: '"the kind of …" / "its own kind of"', scope: 'page', re: /\b(?:the|its own|that|this) (?:kind|sort) of\b/gi },
  { id: 'A14', group: 'A', name: 'restated-then-undercut: "He didn’t X. He just Y." / "I said it. I meant it."', scope: 'page', re: new RegExp(`\\b(I|He|She|They|It) (?:didn${Q}t|wasn${Q}t|don${Q}t|doesn${Q}t|did not|was not) [^.!?“”]{1,60}[.!?] \\1 (?:just|only|simply)\\b|\\b(I|He|She) (\\w+) it\\. \\2 (\\w+) it\\.`, 'g') },
  { id: 'A15', group: 'A', name: 'abstract nouns doing the work: "the business", "the arrangement", "the matter"', scope: 'page', re: /\bthe (?:business|arrangement|matter|situation|affair|whole thing)\b/gi },
  { id: 'A16', group: 'A', name: '"worth" constructions: "worth knowing", "worth the walk"', scope: 'player', re: /\bworth (?:\w+ing\b|the \w+|a \w+|it\b|something|anything|having|keeping)/gi },
  { id: 'A17', group: 'A', name: 'the narrator on his own narrating: "I’ll say this", "Here’s what I had", "as I say"', scope: 'page', re: new RegExp(`\\b(?:I${Q}ll say (?:this|that|it)|I should say|I${Q}ll be honest|to be honest|if I${Q}m honest|as I say|as I said|so to speak|as it were|I won${Q}t pretend|I${Q}ll admit|Here${Q}s what I had|I${Q}ll put it|let me put it|put another way|to put it|I should mention)\\b`, 'gi') },
  { id: 'A18', group: 'A', name: '"honest", "plain", "proper" as filler', scope: 'page', re: /\b(?:honest|honestly|plain|plainly|proper|properly)\b/gi },
  { id: 'A19', group: 'A', name: 'sentence-initial "So"', scope: 'narration', re: new RegExp(`${SENT}So\\b`, 'g') },
  { id: 'A20', group: 'A', name: 'fragment openers: "Which …", "As if …"', scope: 'page', re: new RegExp(`${SENT}(?:Which|As if)\\b`, 'g') },
  { id: 'A21', group: 'A', name: '", which …" tag-on comment', scope: 'page', re: new RegExp(`, which (?:is|was|wasn${Q}t|isn${Q}t|I|has|had|made|makes|suited|meant|it|they|nobody|everybody|says|said)\\b`, 'g') },
  { id: 'A22', group: 'A', name: 'the colon-fronted aside: "Signing a program nobody asked for: I didn’t interrupt him."', scope: 'page', re: new RegExp(`(?:^|\\n\\n)[A-Z][a-z]+ing\\b[^:\\n]{2,120}: I didn${Q}t (?:interrupt|disturb|bother|stop)\\b`, 'g') },
  { id: 'A23', group: 'A', name: 'the punchline "the only one/way/thing"', scope: 'page', re: /\bthe only (?:one|way|thing|man|woman|person|time|place|part)\b/gi },
  { id: 'A24', group: 'A', name: '"all of it" / "all of them" as a closer', scope: 'page', re: /\ball of (?:it|them)\b/gi },
  { id: 'A25', group: 'A', name: 'aphorism openers: "Some rooms …", "A man’s papers are …", "… is what you …"', scope: 'narration', re: new RegExp(`${SENT}(?:Some (?:rooms|people|things|evenings|nights|men|women|questions|days|places|lies|doors)\\b|A (?:man|woman)${Q}s \\w+ (?:is|are)\\b|Nobody (?:ever )?(?:\\w+s) a\\b)|\\b(?:is|are) what (?:you|people|a man|a woman|somebody|anybody)\\b`, 'g') },
  { id: 'A26', group: 'A', name: 'stock idiom tags: "as calm as you please", "for good measure", "and not a bit sorry"', scope: 'page', re: /\bas \w+ as you please\b|\bfor good measure\b|\bnot a bit (?:sorry|\w+)\b|\bwith real conviction\b|\bgive or take\b|\bfor what it was worth\b|\bif you like\b/gi },
  { id: 'A27', group: 'A', name: '"Somewhere …, and somewhere else …" opener', scope: 'narration', re: new RegExp(`${SENT}Somewhere\\b`, 'g') },
  { id: 'A28', group: 'A', name: '"X that didn’t want to be X" / "was its own kind of"', scope: 'page', re: /\b(\w+) that didn[’']t want to be (?:a |an )?\1\b|\bits own kind of\b/gi },

  { id: 'A29', group: 'A', name: 'stock beats repeated nightly: "I hadn’t come for the furniture", "From his post …", "I wrote it down."', scope: 'page', re: /\bcome for the furniture\b|\bFrom (?:his|her) post\b|\bI wrote it down\b|\bwith my hat in my hand\b/g },
  { id: 'A30', group: 'A', name: 'the narrator’s war stories: "I’ve seen …", "in my experience", "in my line of work"', scope: 'narration', re: new RegExp(`\\bI${Q}ve (?:seen|stood|heard|lost|known|finished|had|been)\\b|\\bin my (?:experience|line of work|trade|business)\\b`, 'g') },
  // ---------------------------------------------------------------- B: jargon
  { id: 'B01', group: 'B', name: 'tier names in prose (Raw … Hard-boiled)', scope: 'player', re: /\b(?:Raw|Coddled|Poached|Soft-boiled|Medium|Hard-boiled)\b(?! [a-z]+ steak)/g },
  { id: 'B02', group: 'B', name: '"par"', scope: 'player', re: /\bpar\b/gi },
  { id: 'B03', group: 'B', name: '"call(s)" as the unit of the night', scope: 'player', re: /\b(?:\d+|one|two|three|a|no|the|\w+teen|twenty|ten|eleven|twelve) calls?\b(?! (?:it|him|her|them|out|on|for|from|up|in)\b)|\bcalls? (?:left|run out|are spent|spent|against)\b/gi, taught: true },
  { id: 'B04', group: 'B', name: 'builders’ words: route, oracle, seed, engine, pointer, hand-off, why-here, composite, profile, dealt, fixture, golden, the small board', scope: 'player', re: /\b(?:route|oracle|(?<!sunflower-)seeds?|engine|pointer|hand-off|why-here|composite|profile|dealt|fixture|golden|the small board|small board)\b/gi },
  { id: 'B05', group: 'B', name: '"card" (not the card room or a card in a window)', scope: 'player', re: /\bcards?\b(?! room| game| table| players?| sharp| party| in (?:the|a) window)(?<!\bcard room)/gi },
  { id: 'B06', group: 'B', name: '"star", "beat", "world", "deck", "slot" (as the builders use them)', scope: 'player', re: /\b(?:stars?|starred|beat|world|deck|slot)\b/gi },
  { id: 'B10', group: 'B', name: '"X’s list" / "the list" in narration', scope: 'narration', re: new RegExp(`\\b\\w+${Q}s list\\b|\\b(?:the|his|her|their) list\\b|\\blists?\\b`, 'g') },
  { id: 'B11', group: 'B', name: '"account" in narration', scope: 'narration', re: /\baccounts?\b/g },
  { id: 'B12', group: 'B', name: '"claim" in narration', scope: 'narration', re: /\bclaim(?:s|ed)?\b/g },
  { id: 'B13', group: 'B', name: '"story" as the mechanic ("his story", "a second story", "new story")', scope: 'narration', re: new RegExp(`\\b(?:his|her|their|\\w+${Q}s|a second|second|new|own) story\\b|\\bstory (?:held|broke|had a hole)\\b`, 'g') },
  { id: 'B14', group: 'B', name: '"(and) nobody else" in narration', scope: 'narration', re: /\bnobody else\b/g },
  { id: 'B15', group: 'B', name: '"the hour that mattered/counted", "when it counted", "the hour I cared about", "the crime hour"', scope: 'player', re: /\bthe hours? that (?:mattered|counted)\b|\bwhen it counted\b|\bthe hours? I cared about\b|\bthe crime hour\b|\bthe window\b(?= (?:was|is|had|of)\b)/gi },
  { id: 'B16', group: 'B', name: '"X has/had Y at <place>" (whose list puts whom where)', scope: 'labels', re: /\b(?:has|had) (?:[A-Z][\w.’']+ )+at (?:the |[A-Z])/g },
  { id: 'B17', group: 'B', name: '"word" / "count" as the mechanic ("her own word", "on her count")', scope: 'narration', re: new RegExp(`\\b(?:his|her|their|\\w+${Q}s|own) word\\b|\\bword under it\\b|\\bon (?:his|her|their) count\\b`, 'g') },
  { id: 'B18', group: 'B', name: 'collides / collision', scope: 'player', re: /\bcollid\w*|\bcollisions?\b/gi },
  { id: 'B19', group: 'B', name: 'placed / cleared / access / means / "the way in"', scope: 'player', re: /\b(?:placed|cleared|access|means)\b|\bthe way in\b/gi },
  { id: 'B20', group: 'B', name: '"put it to" in narration', scope: 'narration', re: /\bput (?:it|this|that) to\b/gi },
  { id: 'B21', group: 'B', name: '"Put it to …", "put to them" (the taught verb, in labels)', scope: 'labels', re: /\bput (?:it )?to (?:them|him|her|[A-Z])|\bPut to (?:it|them)\b/gi, taught: true },
  { id: 'B22', group: 'B', name: 'grid/notebook/curtain legends and headings: "X✓ both", "your pencil", "Says:", "Where it stands", "COLLISIONS", "THE PATH"', scope: 'labels', re: /✓ both\b|\byour pencil\b|^\s*Says:|\bWhere it stands\b|\bWhat I have\b|\bCOLLISIONS\b|\bTHE TRUE BOARD\b|\bTHE PATH\b/gm },
  { id: 'B23', group: 'B', name: 'mechanic labels: "topics", "free to look", "claims", "lines I hold", "the motive search"', scope: 'labels', re: /\btopics?\b|\bfree to look\b|\bclaims?\b|\blines? I hold\b|\bthe motive search\b|\bline that breaks\b/gi },
];

/* -------------------------------------------------------------- the nights */

export interface NightSpec {
  seed: number;
  tier: TierIndex;
  type: CaseType;
  world?: string;
}

/** The 36 nights docs/56 is measured on. */
export function nightSpecs(): NightSpec[] {
  const out: NightSpec[] = [];
  for (let t = 0; t <= 5; t++) {
    for (const world of [undefined, 'neighbourhood']) {
      for (let k = 1; k <= 3; k++) {
        const type: CaseType = k === 1 ? 'murder' : k === 2 ? 'lost-pet' : t < 3 ? 'lost-item' : 'murder';
        const seed = 100 + t * 7 + k * 13 + (world ? 500 : 0);
        out.push({ seed, tier: t as TierIndex, type, ...(world ? { world } : {}) });
      }
    }
  }
  return out;
}

interface Text {
  surface: Surface;
  text: string;
  /** Page bodies: 1-based page number. */
  page?: number;
  /** Where it comes from, when the surface says so (ui literals). */
  source?: string;
}

interface Night {
  spec: NightSpec;
  d: BoardDeal;
  run: BoardRun;
  texts: Text[];
  pages: number;
}

function readNight(spec: NightSpec): Night {
  const d = dealBoard(spec.seed, spec.tier, spec.type, spec.world ? { world: spec.world } : {});
  const p = playBoardOracle(d);
  const run = p.run;
  const texts: Text[] = [];
  run.log.forEach((page, i) => texts.push({ surface: 'page', text: pageBodyText(page), page: i + 1 }));
  // The choices each page offered, along the route, each distinct label once a night.
  let st = newBoardRun(d);
  const seen = new Set<string>();
  for (const cmd of p.commands) {
    for (const line of choicesText(boardChoices(d, st)).split('\n')) {
      const l = line.replace(/^\s*[>*]?\s*\d+\.\s*/, '').trim();
      if (l && !seen.has(l)) {
        seen.add(l);
        texts.push({ surface: 'choices', text: l });
      }
    }
    st = stepBoard(d, st, cmd).run;
  }
  texts.push({ surface: 'notebook', text: notebookText(d, run) });
  const v = scoreBoard(d, run, p.report);
  texts.push({ surface: 'verdict', text: [v.scoreLine, ...v.fields.map((f) => `${f.label}: ${f.given}`), ...v.closing].join('\n\n') });
  texts.push({ surface: 'story', text: storyOfBoard(d).join('\n\n') });
  texts.push({ surface: 'curtain', text: curtainOfBoard(d, run, p.report) });
  return { spec, d, run, texts, pages: run.log.length };
}

/* ------------------------------------------------------------ the ui strings */

function literalsOf(file: string): Text[] {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const out: Text[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    let text: string | null = null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) text = n.text;
    else if (ts.isTemplateExpression(n)) text = [n.head.text, ...n.templateSpans.map((s) => `{…}${s.literal.text}`)].join('');
    if (text !== null) {
      const parent = n.parent;
      const key = parent && ts.isPropertyAssignment(parent) && parent.initializer === n ? parent.name.getText(sf).replace(/['"]/g, '') : '';
      const skip = ['class', 'type', 'role', 'id', 'name', 'for', 'value', 'min', 'autocomplete', 'data-command', 'data-spent'].includes(key);
      // Prose, not identifiers or class names: words with a space, and a capital, a function word or a stop.
      const prose = !/^\s*</.test(text) && /\s/.test(text) && /[A-Za-z]{2,}/.test(text) && (/^[A-Z‘“(]/.test(text) || /\b(?:the|a|an|and|of|to|is|it|you|I)\b/.test(text) || /[.?!:,]/.test(text));
      if (!skip && prose) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        out.push({ surface: 'ui', text, source: `${file}:${line + 1}` });
      }
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function uiTexts(): Text[] {
  const files = [...readdirSync('src/ui').filter((f) => f.endsWith('.ts')).map((f) => `src/ui/${f}`), 'src/cli/play-lib.ts', 'src/game/board/teach.ts'];
  const out = files.flatMap(literalsOf);
  const html = readFileSync('index.html', 'utf8');
  const m = /<meta name="description" content="([^"]*)"/.exec(html);
  if (m) out.push({ surface: 'ui', text: m[1] as string, source: 'index.html (meta description)' });
  return out;
}

/* --------------------------------------------------------------- matching */

/** Page text with quoted speech taken out, quote by quote, paragraph by paragraph. */
function narrationOf(text: string): string {
  return text
    .split(/\n\n/)
    .map((p) => p.replace(/\n/g, ' ').replace(/“[^”]*(?:”|$)/g, ' … '))
    .join('\n\n');
}

function unwrap(text: string): string {
  return text.split(/\n\n/).map((p) => p.replace(/\n(?!\n)/g, ' ').replace(/ {2,}/g, ' ')).join('\n\n');
}

function inScope(scope: Scope, surface: Surface): boolean {
  if (scope === 'narration' || scope === 'page') return surface === 'page';
  if (scope === 'labels') return surface !== 'page';
  return true;
}

/** The sentence a match sits in. */
function sentenceAt(text: string, at: number, len: number): string {
  const before = text.slice(0, at);
  const para = before.lastIndexOf('\n\n');
  // A stop after Mr., Mrs., Dr. or St. doesn't end a sentence.
  const stops = [...before.matchAll(/(?<!\b(?:Mr|Mrs|Dr|St|Mt))[.?!]["”’]?\s+/g)];
  const lastStop = stops.length ? (stops[stops.length - 1] as RegExpMatchArray) : null;
  const start = Math.max(para >= 0 ? para + 2 : 0, lastStop ? (lastStop.index ?? 0) + lastStop[0].length : 0);
  const rest = text.slice(at + len);
  const ends = [/(?<!\b(?:Mr|Mrs|Dr|St|Mt))[.!?]["”’]?(?=\s|$)/.exec(rest), /\n\n/.exec(rest)].filter((m): m is RegExpExecArray => m !== null).map((m) => m.index + (m[0] === '\n\n' ? 0 : m[0].length));
  const end = at + len + (ends.length ? Math.min(...ends) : rest.length);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

interface Hit {
  night: number;
  surface: Surface;
  page?: number;
  match: string;
  sentence: string;
  /** The page's last paragraph. */
  last: boolean;
  source?: string;
}

const SURFACE_SOURCE: Record<Exclude<Surface, 'page' | 'ui'>, string> = {
  choices: 'choice labels (src/game/board/choices.ts, stars.ts)',
  notebook: 'notebook and grid (src/game/board/text.ts notebookText, knowledge.ts, thread.ts recap, grid.ts)',
  verdict: 'verdict (src/game/board/report.ts scoreBoard, closingLines; content/decks endings)',
  story: 'story (src/game/board/report.ts storyLines)',
  curtain: 'curtain (src/game/board/report.ts curtainOfBoard)',
};

function hitsIn(p: Pattern, t: Text, night: number): Hit[] {
  if (!inScope(p.scope, t.surface)) return [];
  const whole = unwrap(t.text);
  const text = p.scope === 'narration' ? narrationOf(t.text) : whole;
  const paras = text.split('\n\n');
  const lastStart = text.length - (paras[paras.length - 1]?.length ?? 0);
  const out: Hit[] = [];
  p.re.lastIndex = 0;
  for (const m of text.matchAll(p.re)) {
    const at = m.index ?? 0;
    // The sentence-start patterns match the stop before; point at the word.
    const lead = /^[.!?]["”’)]?\s+/.exec(m[0])?.[0].length ?? 0;
    out.push({
      night,
      surface: t.surface,
      ...(t.page !== undefined ? { page: t.page } : {}),
      match: m[0].slice(lead).trim(),
      sentence: sentenceAt(text, at + lead, m[0].length - lead),
      last: t.surface === 'page' && at >= lastStart,
      ...(t.source ? { source: t.source } : t.surface !== 'page' ? { source: SURFACE_SOURCE[t.surface as keyof typeof SURFACE_SOURCE] } : {}),
    });
  }
  return out;
}

/* ---------------------------------------------------------------- tracing */

function traceLabel(night: Night, hit: Hit): string {
  // The page's last line for somebody still at it: their `doing`, framed by the engine.
  if (/: I didn[’']t (?:interrupt|disturb)\b/.test(hit.sentence)) return 'lastSeenLine (src/game/board/world.ts) + staying() (src/game/board/pages.ts), on a person’s doing (content/neighbourhood/people.json, content/board/people.json)';
  // The sentence as the page has it (narration had its quotes taken out; trace a piece without them).
  const piece = hit.sentence.split(' … ').sort((a, b) => b.length - a.length)[0] ?? hit.sentence;
  const q = piece.length > 160 ? piece.slice(0, 160).replace(/\s\S*$/, '') : piece;
  try {
    const found = traceRun(night.run, q).find((h) => h.page === hit.page) ?? traceRun(night.run, hit.match)[0];
    const s = found?.sources[0]?.source;
    if (!s) return grepSource(hit.sentence);
    if (s.kind === 'deck') return `card ${s.id} (${s.file})`;
    if (s.kind === 'engine') return `${s.id} (${s.file})`;
    return `${s.where} (${s.file})`;
  } catch {
    return grepSource(hit.sentence);
  }
}

let GREP: { file: string; lines: string[] }[] | null = null;
/** The fallback when the trace finds nothing: the sentence's longest clause, in a content file or a string in src/ (never a comment). */
function grepSource(sentence: string): string {
  if (!GREP) {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(ts|json)$/.test(e.name) ? [`${dir}/${e.name}`] : []));
    GREP = [...walk('src'), ...walk('content')].map((file) => ({ file, lines: readFileSync(file, 'utf8').split('\n') }));
  }
  const fold = (x: string): string => x.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').toLowerCase();
  const clauses = sentence.split(/[,;:…“”]|\s—\s/).map((c) => c.trim()).filter((c) => c.length >= 14).sort((a, b) => b.length - a.length);
  for (const clause of clauses.slice(0, 3)) {
    const want = fold(clause);
    for (const { file, lines } of GREP) {
      const i = lines.findIndex((l) => !/^\s*(?:\*|\/\/|\/\*)/.test(l) && fold(l).includes(want));
      if (i >= 0) return `${file}:${i + 1} (by its words)`;
    }
  }
  return 'untraced';
}

/* ------------------------------------------------------------------ report */

export interface Tally {
  id: string;
  group: 'A' | 'B';
  name: string;
  taught: boolean;
  total: number;
  perNight: number;
  nights: number;
  pagesWith: number;
  pageShare: number;
  lastParagraph: number;
  bySurface: Record<string, number>;
  examples: { where: string; sentence: string }[];
  sources: { source: string; n: number }[];
  traced: number;
  /** The words matched, folded, most common first. */
  forms: { form: string; n: number }[];
}

export function measure(opts: { nights?: number; only?: string[]; examples?: number; trace?: number } = {}): { nights: number; pages: number; tallies: Tally[]; rhythm: { paragraphs: number; shortClosers: number; pagesEndingShort: number }; stock: { sentence: string; nights: number; source: string }[] } {
  const specs = nightSpecs().slice(0, opts.nights ?? 36);
  const nights = specs.map(readNight);
  const ui = uiTexts();
  const patterns = PATTERNS.filter((p) => !opts.only || opts.only.includes(p.id));
  const pages = nights.reduce((n, x) => n + x.pages, 0);
  const tallies: Tally[] = [];
  for (const p of patterns) {
    const hits: Hit[] = [];
    nights.forEach((n, i) => {
      for (const t of n.texts) hits.push(...hitsIn(p, t, i));
    });
    for (const t of ui) hits.push(...hitsIn(p, t, -1));
    const pageKeys = new Set(hits.filter((h) => h.surface === 'page').map((h) => `${h.night}:${h.page}`));
    const bySurface: Record<string, number> = {};
    for (const h of hits) bySurface[h.surface] = (bySurface[h.surface] ?? 0) + 1;
    // Examples: from different nights and different sentences.
    const examples: Hit[] = [];
    const seenNight = new Set<number>();
    const seenSent = new Set<string>();
    for (const pass of [0, 1]) {
      for (const h of hits) {
        if (examples.length >= (opts.examples ?? 3)) break;
        if (seenSent.has(h.sentence) || (pass === 0 && seenNight.has(h.night))) continue;
        examples.push(h);
        seenSent.add(h.sentence);
        seenNight.add(h.night);
      }
    }
    // Sources: page hits traced, the rest named by surface.
    const sources = new Map<string, number>();
    const traceMax = opts.trace ?? 25;
    const traced = new Map<string, string>();
    let tracedN = 0;
    for (const h of hits) {
      let s = h.source;
      if (!s) {
        const k = h.sentence;
        if (!traced.has(k) && traced.size < traceMax) traced.set(k, traceLabel(nights[h.night] as Night, h));
        s = traced.get(k);
        if (!s) continue;
      }
      tracedN++;
      sources.set(s, (sources.get(s) ?? 0) + 1);
    }
    const name = (h: Hit): string => (h.night < 0 ? h.source ?? 'ui' : `${(nights[h.night] as Night).d.kase.id}${h.page ? ` p${h.page}` : ` ${h.surface}`}`);
    tallies.push({
      id: p.id,
      group: p.group,
      name: p.name,
      taught: !!p.taught,
      total: hits.length,
      perNight: +(hits.filter((h) => h.night >= 0).length / nights.length).toFixed(2),
      nights: new Set(hits.filter((h) => h.night >= 0).map((h) => h.night)).size,
      pagesWith: pageKeys.size,
      pageShare: +(pageKeys.size / pages).toFixed(3),
      lastParagraph: hits.filter((h) => h.last).length,
      bySurface,
      examples: examples.map((h) => ({ where: name(h), sentence: h.sentence })),
      sources: [...sources.entries()].sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, n })),
      traced: tracedN,
      forms: (() => {
        const f = new Map<string, number>();
        for (const h of hits) {
          const k = h.match.toLowerCase().replace(/[’']/g, '’').replace(/\s+/g, ' ').slice(0, 40);
          f.set(k, (f.get(k) ?? 0) + 1);
        }
        return [...f.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([form, n]) => ({ form, n }));
      })(),
    });
  }
  // Rhythm: narration paragraphs of two sentences or more that end on a short one (five words or fewer).
  let paragraphs = 0;
  let shortClosers = 0;
  let pagesEndingShort = 0;
  for (const n of nights) {
    for (const t of n.texts.filter((x) => x.surface === 'page')) {
      const paras = unwrap(t.text).split('\n\n').filter((x) => !/^[“(—]/.test(x));
      paras.forEach((para, i) => {
        const sents = para.split(/(?<=[.!?]["”’]?)\s+(?=[A-Z“])/).filter(Boolean);
        if (sents.length < 2) return;
        paragraphs++;
        const lastWords = (sents[sents.length - 1] as string).split(/\s+/).length;
        if (lastWords <= 5) {
          shortClosers++;
          if (i === paras.length - 1) pagesEndingShort++;
        }
      });
    }
  }
  // Stock sentences: the same sentence (names masked) on many nights. A tic a player meets every night.
  const bySentence = new Map<string, { nights: Set<number>; example: string; night: number; page: number }>();
  nights.forEach((n, i) => {
    for (const t of n.texts.filter((x) => x.surface === 'page')) {
      for (const para of unwrap(t.text).split('\n\n')) {
        for (const sent of para.split(/(?<=(?<!\b(?:Mr|Mrs|Dr|St))[.!?]["”’]?)\s+(?=[A-Z“])/)) {
          if (sent.split(/\s+/).length < 4) continue;
          const key = sent.replace(/(?<=\S\s+)(?:Mr\.|Mrs\.|Dr\.|Miss)?\s*[A-Z][\w’'.-]*(?:\s+[A-Z][\w’'.-]*)*/g, 'X').replace(/\b(?:seven|eight|nine|ten|eleven|twelve)\b/gi, 'H').replace(/\b(?:him|her|them|his|he|she|they)\b/gi, 'P');
          const e = bySentence.get(key) ?? { nights: new Set<number>(), example: sent, night: i, page: t.page ?? 0 };
          e.nights.add(i);
          bySentence.set(key, e);
        }
      }
    }
  });
  const stock = [...bySentence.values()]
    .filter((e) => e.nights.size >= Math.max(3, Math.ceil(nights.length / 6)))
    .sort((a, b) => b.nights.size - a.nights.size)
    .slice(0, 30)
    .map((e) => {
      const n = nights[e.night] as Night;
      const source = traceLabel(n, { night: e.night, surface: 'page', page: e.page, match: e.example, sentence: e.example, last: false });
      return { sentence: e.example, nights: e.nights.size, source };
    });
  tallies.sort((a, b) => (a.group === b.group ? b.total - a.total : a.group < b.group ? -1 : 1));
  return { nights: nights.length, pages, tallies, rhythm: { paragraphs, shortClosers, pagesEndingShort }, stock };
}

/** docs/59 item 7: the gates, over the first N of the nights: every breach, by night and page. */
export function gates(opts: { nights?: number } = {}): string[] {
  const out: string[] = [];
  for (const spec of nightSpecs().slice(0, opts.nights ?? 36)) {
    const n = readNight(spec);
    for (const x of ticIssues(n.run)) out.push(`${n.d.kase.id}${spec.world ? ' (neighbourhood)' : ''}${x.page >= 0 ? ` p${x.page + 1}` : ''}: ${x.detail}`);
  }
  return out;
}

function main(argv: string[]): void {
  const { values, flags } = parseArgs(argv);
  if (flags.has('gates')) {
    const g = gates(values.has('nights') ? { nights: Number(values.get('nights')) } : {});
    process.stdout.write(g.length ? `${g.join('\n')}\n${g.length} breaches\n` : 'the gates hold: one simile frame a page, each night tic once, a running gag twice at most\n');
    if (g.length) process.exitCode = 1;
    return;
  }
  const only = values.get('only')?.split(',').map((s) => s.trim());
  const r = measure({
    ...(values.has('nights') ? { nights: Number(values.get('nights')) } : {}),
    ...(only ? { only } : {}),
    examples: Number(values.get('examples') ?? 3),
    trace: Number(values.get('trace') ?? 25),
  });
  const dump = values.get('dump');
  if (dump) {
    for (const spec of nightSpecs().slice(0, Number(values.get('nights') ?? 36))) {
      const n = readNight(spec);
      const body = n.texts.map((t) => (t.surface === 'page' ? `=== page ${t.page}\n${t.text}` : t.surface === 'choices' ? `  [choice] ${t.text}` : `=== ${t.surface}\n${t.text}`)).join('\n\n');
      writeFileSync(`${dump}/${n.d.kase.id}${spec.world ? '-nbhd' : ''}.txt`, `${body}\n`);
    }
    return;
  }
  if (flags.has('json')) {
    process.stdout.write(`${JSON.stringify(r, null, 1)}\n`);
    return;
  }
  const out: string[] = [];
  out.push(`claudisms: ${r.nights} nights, ${r.pages} pages`);
  out.push(`rhythm: ${r.rhythm.shortClosers} of ${r.rhythm.paragraphs} narration paragraphs (2+ sentences) end on a sentence of five words or fewer (${Math.round((100 * r.rhythm.shortClosers) / Math.max(1, r.rhythm.paragraphs))}%); ${r.rhythm.pagesEndingShort} of them close the page`);
  out.push('');
  out.push(`stock sentences (the same words, names masked, on ${Math.max(3, Math.ceil(r.nights / 6))} or more of the ${r.nights} nights):`);
  for (const x of r.stock) out.push(`  ${x.nights}/${r.nights}  ${x.sentence}  — ${x.source}`);
  for (const t of r.tallies) {
    out.push('');
    out.push(`${t.id} ${t.name}${t.taught ? ' [taught term]' : ''}`);
    out.push(`  ${t.total} hits · ${t.perNight} a night · on ${t.pagesWith} pages (${(t.pageShare * 100).toFixed(1)}%) · ${t.nights}/${r.nights} nights · ${t.lastParagraph} in a page's last paragraph · ${Object.entries(t.bySurface).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    if (t.forms.length > 1) out.push(`  forms: ${t.forms.map((f) => `"${f.form}" ×${f.n}`).join(', ')}`);
    for (const e of t.examples) out.push(`  e.g. [${e.where}] ${e.sentence}`);
    if (t.sources.length) out.push(`  sources (of ${t.traced} traced): ${t.sources.slice(0, 6).map((s) => `${s.source} ×${s.n}`).join('; ')}`);
  }
  process.stdout.write(`${out.join('\n')}\n`);
}

if (/claudisms\.ts$/.test(process.argv[1] ?? '')) main(process.argv.slice(2));
