#!/usr/bin/env node
// Clean a Standard Ebooks "single-page" HTML export down to plain UTF-8 text.
// Strips frontmatter (titlepage, toc, imprint, dedication, halftitlepage)
// and backmatter (colophon, uncopyright) sections, keeps bodymatter only,
// strips tags, decodes entities, normalizes whitespace.
//
// Usage: node clean-se-html.mjs <input.html> <output.txt> ["Optional Title Header"]

import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath, headerTitle] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node clean-se-html.mjs <input.html> <output.txt> [\"Title Header\"]");
  process.exit(1);
}

let html = readFileSync(inPath, "utf8");

// Drop the <nav id="toc">...</nav> table of contents block, and the top
// "Standard Ebooks / Back to ebook" breadcrumb <header><nav>...</nav></header>.
html = html.replace(/<nav[^>]*id="toc"[\s\S]*?<\/nav>/, "");
html = html.replace(/<nav[^>]*id="landmarks"[\s\S]*?<\/nav>/, "");
html = html.replace(/<header><nav>[\s\S]*?<\/nav><\/header>/, "");

// Drop specific frontmatter/backmatter <section> blocks by id. Sections do not
// nest in these Standard Ebooks exports (chapters are siblings), so a
// non-greedy match up to the next top-level </section> is safe.
const dropIds = [
  "titlepage",
  "imprint",
  "dedication",
  "halftitlepage",
  "colophon",
  "uncopyright",
  "copyright-page",
];
for (const id of dropIds) {
  const re = new RegExp(
    `<section[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/section>`,
    "g"
  );
  html = html.replace(re, "");
}

// Isolate <body>...</body> if present.
const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
let body = bodyMatch ? bodyMatch[1] : html;

// Convert block-level closings/paragraph breaks into double newlines before
// stripping tags, so paragraphs remain separated.
body = body
  .replace(/<\/(p|h[1-6]|hgroup|li|blockquote|figure)>/g, "\n\n")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<hr\s*\/?>/g, "\n\n---\n\n");

// Strip all remaining tags.
body = body.replace(/<[^>]+>/g, "");

// Decode common HTML entities.
const entities = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
};
body = body.replace(/&[a-zA-Z#0-9]+;/g, (m) => {
  if (entities[m]) return entities[m];
  const numMatch = m.match(/^&#(\d+);$/);
  if (numMatch) return String.fromCodePoint(Number(numMatch[1]));
  const hexMatch = m.match(/^&#x([0-9a-fA-F]+);$/);
  if (hexMatch) return String.fromCodePoint(parseInt(hexMatch[1], 16));
  return m;
});

// Strip invisible Unicode formatting characters Standard Ebooks inserts as
// no-break hints (word joiner, zero-width space, soft hyphen).
body = body.replace(/[⁠​­]/g, "");

// Normalize whitespace: trim each line, collapse runs of blank lines.
body = body
  .split("\n")
  .map((line) => line.replace(/[ \t]+/g, " ").trim())
  .join("\n");
body = body.replace(/\n{3,}/g, "\n\n").trim();

const out = headerTitle ? `${headerTitle}\n\n${body}\n` : `${body}\n`;
writeFileSync(outPath, out, "utf8");

const words = body.split(/\s+/).filter(Boolean).length;
console.log(`${outPath}: ${words} words`);
