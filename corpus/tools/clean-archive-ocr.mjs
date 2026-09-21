#!/usr/bin/env node
// Clean an Internet Archive "_djvu.txt" OCR export down to plain UTF-8 text.
// Handles the common scanned-book noise: cover/title-page/table-of-contents
// junk before the real body, running headers ("12 THE WHITE CIRCLE" /
// "THE STRANGER IN THE NIGHT 13"), back-cover junk after "THE END", and
// end-of-line hyphenation from justified print.
//
// Usage:
//   node clean-archive-ocr.mjs <input.txt> <output.txt> \
//     --start-line N --end-line M ["Optional Title Header"]
//
// --start-line / --end-line are 1-indexed, inclusive, and refer to the RAW
// input file. Find them by inspecting the raw OCR text for where the real
// body starts (first chapter heading) and ends (last line of prose, before
// "THE END" / back-cover scan noise).

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const inPath = args[0];
const outPath = args[1];
let startLine = 1;
let endLine = Infinity;
let headerTitle;
for (let i = 2; i < args.length; i++) {
  if (args[i] === "--start-line") startLine = Number(args[++i]);
  else if (args[i] === "--end-line") endLine = Number(args[++i]);
  else headerTitle = args[i];
}

if (!inPath || !outPath) {
  console.error(
    'Usage: node clean-archive-ocr.mjs <input.txt> <output.txt> [--start-line N] [--end-line M] ["Title"]'
  );
  process.exit(1);
}

const raw = readFileSync(inPath, "utf8");
let lines = raw.split("\n");
lines = lines.slice(startLine - 1, endLine === Infinity ? undefined : endLine);

// Drop running-header / page-number lines: short standalone lines that are
// either bare page numbers, a page number plus a title-case heading, or a
// title-case heading plus a page number.
const headerLineRe =
  /^\s*(\d{1,4}\s+)?([A-Z][A-Za-z.,'’!?-]*(\s+(the|of|in|a|an|to|and|is)?\s*[A-Z][A-Za-z.,'’!?-]*)*)(\s+\d{1,4})?\s*$/;
const bareNumberRe = /^\s*\d{1,4}\s*$/;

function looksLikeHeader(line) {
  const t = line.trim();
  if (!t) return false;
  if (bareNumberRe.test(t)) return true;
  const hasDigitEdge = /^\d{1,4}\s/.test(t) || /\s\d{1,4}$/.test(t);
  if (!hasDigitEdge) return false;
  if (t.length > 55) return false;
  const words = t.replace(/\d{1,4}/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  // Every remaining "word" must start with an uppercase letter (title case
  // heading) or be a short lowercase connector.
  const connectors = new Set(["the", "of", "in", "a", "an", "to", "and", "is"]);
  return words.every((w) => /^[A-Z]/.test(w) || connectors.has(w.toLowerCase()));
}

lines = lines.filter((line) => !looksLikeHeader(line));

let text = lines.join("\n");

// Rejoin end-of-line hyphenation from justified print: "boule-\nvards" ->
// "boulevards". Only join when the character after the break is lowercase
// (avoids merging genuine em-dash-like breaks or headings).
text = text.replace(/([a-z])-\s*\n\s*([a-z])/g, "$1$2");

// Collapse remaining single newlines within a paragraph into spaces, but
// keep paragraph breaks (blank lines).
text = text
  .split(/\n\s*\n/)
  .map((para) =>
    para
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
  )
  .filter(Boolean)
  .join("\n\n");

// Normalize odd OCR space-before-punctuation artifacts and stray control chars.
text = text.replace(/[ \t]+/g, " ").trim();

const out = headerTitle ? `${headerTitle}\n\n${text}\n` : `${text}\n`;
writeFileSync(outPath, out, "utf8");

const words = text.split(/\s+/).filter(Boolean).length;
console.log(`${outPath}: ${words} words`);
