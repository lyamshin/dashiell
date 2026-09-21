# Corpus Notes — Phase A

## What's in the corpus

**Fiction — 708,843 words** (target 400,000–800,000, in range):

- Dashiell Hammett, all four public-domain-eligible works: *Red Harvest* (1929), *The Dain Curse* (1929), *The Maltese Falcon* (1930), and *The Continental Op Stories*, a 27-story collection spanning every Continental Op story Hammett published in *Black Mask* / *True Detective Mysteries* from Oct 1923 to Nov 1930. Sourced from Standard Ebooks, which maintains its own US-public-domain determinations and hosts clean, single-page HTML editions — much less cleanup work than a scanned source, and no OCR errors to fix.
- Carroll John Daly, *The White Circle* (1926) — the first Race Williams novel published in book form (Edward J. Clode, 1926; Race Williams himself debuted in *Black Mask* in 1923, ahead of the Continental Op). Only source found with a full public-domain text was an Internet Archive library scan, so this one is OCR and got real cleanup (see "OCR quality" below). Daly's other well-known novel, *The Snarl of the Beast* (1927, serialized in *Black Mask*), was **not included** — I found a LibriVox audio recording of it (confirming the text is in the public domain) but no accompanying OCR/text edition on Internet Archive, Gutenberg, or Wikisource. Flagging this as something a human with more time/other tools could probably still find (a library scan or a different LibriVox-adjacent text source).
- Ben Hecht, *A Thousand and One Afternoons in Chicago* (1922) — full collection, from Project Gutenberg. Exactly what docs/03 asked for: wrong city, right hard-boiled-city-column cadence.
- Ring Lardner, *You Know Me Al* (1916) — full novel-in-letters, from Project Gutenberg. Vernacular first-person voice, distinct from the hard-boiled register, useful as a contrast/reference point rather than a stylistic donor.

I did not add Erle Stanley Gardner's early *Black Mask* stories or any other *Black Mask*/*Dime Detective* fiction — I didn't find any with clean, verifiable-PD full text readily available (Gardner's early work seems to mostly survive only in scanned pulp-magazine issues on Internet Archive's Pulp Magazine Archive, which would need page-by-page OCR extraction similar to what I did for the newspapers, and by the time I'd covered Hammett + Daly + Hecht + Lardner the fiction target was already comfortably met, so I stopped rather than push toward 800k for its own sake).

**Period New York — 443,213 words** (target 200,000+, in range):

- The full body of *The New York City Guide* (the "WPA Guide to New York City"), the 1939 Federal Writers' Project / Random House original printing, from an Internet Archive scan (`possible-copyright-status: NOT_IN_COPYRIGHT`). This alone is 242,933 words and clears the period target by itself.
- 48 pages of *The Evening World* (New York), one of the three papers docs/03 named, spanning January 1920 through December 1922: one issue picked from the middle of each month (36 front pages), plus 12 inside "page 3" news pages (four months' worth) that lean more toward local/police-court items. 200,280 words.

**Total: 1,152,056 words** across 11 files.

## What I couldn't find / didn't reach

- **New-York Tribune and The Sun, 1920s.** docs/03 asks for all three papers. I confirmed LCCN identifiers (Tribune `sn83030214`, The Sun `sn83030272`) but could not find 1920s-era digitized batches for either in the bulk data mirror I had access to (see "Chronicling America access" below) — the one Sun-titled NDNP batch I found under the New York Public Library's digitizing program (`nn_nelson_ver01`) turned out to hold 1859–1861 issues, not 1920s ones. It's likely both papers' 1920s runs exist somewhere in Chronicling America (Tribune ran through 1924, and both were part of NDNP's NY contributions), but I could only browse via a static bulk-data directory listing (no working search), and did not exhaustively check the ~3,000 batches in that listing for other institutions' Tribune/Sun contributions. A human (or an agent that can pass a Cloudflare check some other legitimate way — e.g. an authenticated LOC API key, if that's available) could likely find more.
- **1923–1926 coverage.** The Evening World batches I found run through December 1922 only. Not a copyright problem — the paper kept publishing until 1931 — just a gap in what NYPL had digitized/what I could locate in the available batches.
- **Carroll John Daly's *The Snarl of the Beast* (1927)** and any Erle Stanley Gardner *Black Mask* stories (1923–1930) — see "Fiction" above.
- **Small period ephemera** (Automat menu, El timetable, Sears catalog page) that docs/03 mentions as optional extras — not pursued, since the two main period sources already exceed the word target by more than double.

## Chronicling America access

`chroniclingamerica.loc.gov`, `www.loc.gov`, and `nyshistoricnewspapers.org` all sit behind a Cloudflare bot check (a "Verify you are human" Turnstile challenge) that blocked both plain `curl` and an automated browser session. I did not attempt to solve it — that's bot-detection bypass, which is out of bounds regardless of the purpose. Instead I found that `chroniclingamerica.loc.gov/data/batches/` (the raw NDNP bulk-data mirror, meant for programmatic/bulk access) was not behind the same challenge, and used that directly: it serves each digitized "batch" as a bag of METS/ALTO XML (word-level OCR with bounding boxes, not plain text) plus page images. I wrote `corpus/tools/alto-to-text.mjs` to convert those ALTO files into plain text, reconstructing paragraphs from `<TextBlock>`/`<TextLine>`/`<String>` elements and dropping low-confidence or very short OCR blocks (masthead art, ad borders, rule lines). This is why the newspaper source URLs in MANIFEST.md point at the `/data/batches/` bulk mirror rather than the normal `chroniclingamerica.loc.gov/lccn/.../seq-N/` page URLs — the latter return a 403 challenge page for a non-browser client.

## OCR quality, flagged for a human read-through

- **The White Circle (Daly, 1926):** good OCR overall (Internet Archive `whitecircle0000daly_djvu.txt`). I fixed roughly 20 clear, high-confidence OCR misreads by hand (e.g. `"TI` → `"I`, a repeated garble where the OCR doubled the letter "I" after an opening quotation mark; `AlI- most` → `Almost`; a handful of sentence-initial small-caps words that got scrambled, like `TowNnsenp's` → `Townsend's`, `TuiIs` → `This`). I did not do a full line-by-line proofread against the scan, so there may be a few remaining minor OCR errors (a wrong letter here or there) that wouldn't show up as an obviously malformed word.
- **New York City Guide (WPA, 1939):** the scan's typeface produced a systematic confusion — digit "1" read as letter "i", "0" as "o", "7" as "y" — inside street numbers and years ("14th St." → "i4th St.", "1937" → "i93y"). I wrote a targeted, conservative regex pass (only touching tokens that mix letters from that set with an actual digit, so it wouldn't touch real words) and fixed ~320 instances, spot-checking a sample against surrounding sentence context. I also dropped ~150 isolated one-to-five-character fragments that were map-legend/diagram scan noise. This book is 830-some pages; I did not proofread all 243,000 words, so some noise likely remains, especially in the bibliography ("Books About New York") section, which has more stray digit-OCR artifacts I didn't chase down (e.g. a page count printed as "21 lp." instead of "211p.").
- **The Evening World pages:** the nameplate/masthead line at the top of nearly every page OCRs badly (decorative masthead type defeats the OCR engine) and survived the confidence filter as a line of near-gibberish before the real article text starts. I left these in rather than hand-edit 48 pages' worth of mastheads — they're a small fraction of each page's word count and are honestly representative of what 1920s newspaper OCR looks like. Anyone mining this file for lexicon/cadence should expect to skip the first line or two of each page block.
- All three of the above are, per docs/03's own instruction, "OCR text is fine" for the period category — the cleanup done goes beyond minimum bar already (stripping boilerplate/page numbers/OCR garbage runs), not below it.

## Public domain determinations — how I checked

For every fiction work: confirmed first US publication year against at least one secondary source (Wikipedia bibliography pages, Standard Ebooks' own "Uncopyright" pages, or the scan's own copyright-page text) before saving anything, and recorded the specific basis in MANIFEST.md. For the 27 Continental Op stories bundled in one file, I checked the *year* of every individual story against Wikipedia's "The Continental Op" bibliography (all fall between Oct 1923 and Nov 1930) rather than trusting the collection's cover date. For the WPA Guide, relied on both docs/03's explicit statement that it qualifies as a Federal Writers' Project work and Internet Archive's independent `possible-copyright-status: NOT_IN_COPYRIGHT` metadata for that scan; flagged the nominal 1939 copyright notice printed in the book (in the name of its sponsoring body, not the FWP) in MANIFEST.md as something worth a second human opinion. Excluded per the explicit exclusion list in docs/03: no Chandler, no *Glass Key* (1931) or *Thin Man* (1934), no Woolrich, no Cain, no Damon Runyon, no post-1930 *Black Mask*. Also excluded (found while researching but not eligible): Hammett's *Adventures of Sam Spade* stories (1932+) and Daly's later Race Williams material.

## Word counts by category

| Category | Words | Target | Status |
|---|---|---|---|
| Fiction | 708,843 | 400,000–800,000 | in range |
| Period New York | 443,213 | 200,000+ | in range |
| **Total** | **1,152,056** | | |

See `corpus/MANIFEST.md` for the full per-file breakdown, source URLs, and PD basis for each of the 11 files.
