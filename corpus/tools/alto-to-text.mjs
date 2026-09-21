#!/usr/bin/env node
// Convert an NDNP/Chronicling America ALTO XML page (word-level OCR with
// coordinates, as served from chroniclingamerica.loc.gov/data/batches/...)
// into plain UTF-8 text.
//
// Reconstructs each <TextBlock> as a paragraph: <TextLine>s joined with a
// space, <String CONTENT="..."> words joined with a space, blocks separated
// by a blank line (blocks in the XML are already in the OCR engine's
// reading order, which for newspaper columns is usually top-to-bottom,
// left-to-right per column).
//
// Drops:
//   - blocks whose mean word confidence (WC attribute) is below --min-wc
//     (default 0.5) -- usually masthead art, ad borders, halftone noise.
//   - blocks with fewer than --min-words words (default 4) -- page
//     furniture (rule lines, single stray characters, column numbers).
//
// Usage: node alto-to-text.mjs <input.xml> [--min-wc 0.5] [--min-words 4]
// Prints cleaned text to stdout.

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const inPath = args[0];
if (!inPath) {
  console.error("Usage: node alto-to-text.mjs <input.xml> [--min-wc 0.5] [--min-words 4]");
  process.exit(1);
}
let minWc = 0.5;
let minWords = 4;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--min-wc") minWc = Number(args[++i]);
  else if (args[i] === "--min-words") minWords = Number(args[++i]);
}

const xml = readFileSync(inPath, "utf8");

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Split into TextBlock chunks (non-greedy up to the closing tag).
const blockRe = /<TextBlock\b[^>]*>([\s\S]*?)<\/TextBlock>/g;
const lineRe = /<TextLine\b[^>]*>([\s\S]*?)<\/TextLine>/g;
const stringRe = /<String\b([^>]*)\/>/g;
const contentRe = /CONTENT="([^"]*)"/;
const wcRe = /WC="([^"]*)"/;

const paragraphs = [];

let blockMatch;
while ((blockMatch = blockRe.exec(xml))) {
  const blockBody = blockMatch[1];
  const lines = [];
  const wcValues = [];
  let wordCount = 0;

  let lineMatch;
  lineRe.lastIndex = 0;
  while ((lineMatch = lineRe.exec(blockBody))) {
    const lineBody = lineMatch[1];
    const words = [];
    let strMatch;
    stringRe.lastIndex = 0;
    while ((strMatch = stringRe.exec(lineBody))) {
      const attrs = strMatch[1];
      const contentMatch = contentRe.exec(attrs);
      if (!contentMatch) continue;
      const content = decodeEntities(contentMatch[1]);
      if (content === "") continue;
      words.push(content);
      wordCount++;
      const wcMatch = wcRe.exec(attrs);
      if (wcMatch) wcValues.push(Number(wcMatch[1]));
    }
    if (words.length) lines.push(words.join(" "));
  }

  if (lines.length === 0) continue;
  if (wordCount < minWords) continue;
  const meanWc = wcValues.length
    ? wcValues.reduce((a, b) => a + b, 0) / wcValues.length
    : 1;
  if (meanWc < minWc) continue;

  paragraphs.push(lines.join(" "));
}

const text = paragraphs.join("\n\n").replace(/[ \t]+/g, " ").trim();
process.stdout.write(text + "\n");
