#!/usr/bin/env node
// Strip Project Gutenberg header/footer boilerplate from a plain-text
// (.txt.utf-8) ebook, leaving the body text UTF-8 and otherwise unedited.
//
// Usage: node clean-gutenberg-txt.mjs <input.txt> <output.txt> ["Optional Title Header"]

import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath, headerTitle] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node clean-gutenberg-txt.mjs <input.txt> <output.txt> ["Title"]');
  process.exit(1);
}

let text = readFileSync(inPath, "utf8");

// Normalize line endings and strip a UTF-8 BOM if present.
text = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");

const startRe = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;
const endRe = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;

const startMatch = text.match(startRe);
const endMatch = text.match(endRe);

let body = text;
if (startMatch) {
  body = body.slice(startMatch.index + startMatch[0].length);
}
if (endMatch) {
  // Re-find end marker in the (possibly already trimmed) body.
  const endInBody = body.match(endRe);
  if (endInBody) {
    body = body.slice(0, endInBody.index);
  }
}

// Drop a leading "E-text prepared by ..." credits line block and leading
// blank lines.
body = body.replace(/^\s+/, "");

// Collapse runs of 3+ blank lines to a single blank line.
body = body.replace(/\n{3,}/g, "\n\n").trim();

const out = headerTitle ? `${headerTitle}\n\n${body}\n` : `${body}\n`;
writeFileSync(outPath, out, "utf8");

const words = body.split(/\s+/).filter(Boolean).length;
console.log(`${outPath}: ${words} words`);
