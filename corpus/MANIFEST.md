# Corpus Manifest

One row per file in `corpus/raw/`. Word counts are computed by splitting on whitespace (see `corpus/tools/clean-se-html.mjs` / `corpus/tools/wordcount.mjs`) after boilerplate stripping, so they reflect the saved `.txt` file, not the original scan.

PD basis key:
- **95yr**: First published in the US on the stated date; the 95-year US copyright term (for a work whose copyright was secured/renewed under pre-1978 law) expired on January 1 of `first-publication-year + 96`. As of 2026, this covers everything first published in the US in 1930 or earlier.
- **fed-gov**: US federal government work, public domain regardless of date (17 U.S.C. § 105).
- **no-renewal**: Published 1930 or earlier in the US and never had its copyright renewed (moot for our purposes since 95yr already covers 1930 and earlier, but noted where a source specifically documents it).

## Fiction (`corpus/raw/fiction/`)

| File | Title | Author | Year | Source URL | PD basis | Word count | Notes |
|---|---|---|---|---|---|---|---|
| hammett-red-harvest-1929.txt | Red Harvest | Dashiell Hammett | 1929 | https://standardebooks.org/ebooks/dashiell-hammett/red-harvest (text/single-page) | 95yr — first published Feb 1929 (Black Mask serial Nov 1927–Feb 1928; book Alfred A. Knopf, Feb 1929). Standard Ebooks states the text is believed free of US copyright. | 60,708 | Full novel. Standard Ebooks edition, boilerplate/imprint/colophon stripped. |
| hammett-dain-curse-1929.txt | The Dain Curse | Dashiell Hammett | 1929 | https://standardebooks.org/ebooks/dashiell-hammett/the-dain-curse (text/single-page) | 95yr — first published July 1929 (Knopf); serialized in Black Mask Nov 1928–Feb 1929. | 67,993 | Full novel. |
| hammett-maltese-falcon-1930.txt | The Maltese Falcon | Dashiell Hammett | 1930 | https://standardebooks.org/ebooks/dashiell-hammett/the-maltese-falcon (text/single-page) | 95yr — first published Feb 1930 (Knopf); serialized in Black Mask Sep 1929–Jan 1930. | 66,690 | Full novel. |
| hammett-continental-op-stories-1923-1930.txt | The Continental Op Stories (collected) | Dashiell Hammett | 1923–1930 | https://standardebooks.org/ebooks/dashiell-hammett/continental-op-stories (text/single-page) | 95yr — every story in this collection first appeared in *Black Mask* or *True Detective Mysteries* between Oct 1923 and Nov 1930 (individually verified against Wikipedia's "The Continental Op" bibliography, see NOTES.md). | 307,645 | Collection of 27 stories: Arson Plus; Crooked Souls; Slippery Fingers; It; Bodies Piled Up; The Tenth Clew; Night Shots; Zigzags of Treachery; One Hour; The House in Turk Street; The Girl with the Silver Eyes; Women, Politics & Murder; The Golden Horseshoe; Who Killed Bob Teal?; Mike or Alec or Rufus; The Whosis Kid; The Scorched Face; Corkscrew; Dead Yellow Women; The Gutting of Couffignal; Creeping Siamese; The Big Knock-Over; $106,000 Blood Money; The Main Death; This King Business; Fly Paper; The Farewell Murder; Death and Company. |
| daly-white-circle-1926.txt | The White Circle | Carroll John Daly | 1926 | https://archive.org/details/whitecircle0000daly (scanned copy, OCR text: `whitecircle0000daly_djvu.txt`) | 95yr — first published 1926, New York: Edward J. Clode, Inc. (copyright page date confirmed in scan); confirmed as a 1926 Race Williams novel by Wikipedia's Carroll John Daly bibliography. | 68,137 | Full novel, first Race Williams book not counting serialization. Raw OCR from an Internet Archive library scan; cleaned with `corpus/tools/clean-archive-ocr.mjs` (front matter/ToC/running headers/back-cover scan noise stripped, end-of-line hyphenation rejoined) plus ~14 hand-fixed OCR misreads (e.g. "TI" → "I", "TowNnsenp" → "Townsend") verified against surrounding sentence sense. OCR quality is good but not publisher-clean; flagged in NOTES.md. |
| hecht-thousand-one-afternoons-chicago-1922.txt | A Thousand and One Afternoons in Chicago | Ben Hecht | 1922 | https://www.gutenberg.org/ebooks/7988 (`7988.txt.utf-8`) | 95yr — first published in book form 1922 by Covici-McGee, Chicago, collecting Hecht's 1921–1922 *Chicago Daily News* column; Project Gutenberg (US) lists it without a copyright notice. | 79,068 | Full collection of Chicago city vignettes ("wrong city, right cadence" per docs/03). PG boilerplate and italic-underscore markup stripped with `corpus/tools/clean-gutenberg-txt.mjs`. |
| lardner-you-know-me-al-1916.txt | You Know Me Al: A Busher's Letters | Ring Lardner | 1916 | https://www.gutenberg.org/ebooks/52670 (`52670.txt.utf-8`) | 95yr — magazine version serialized in *The Saturday Evening Post* 1914 (per the scan's copyright page: "Copyright 1914 by The Curtis Publishing Company"); book publication 1916, George H. Doran Company. | 59,678 | Full novel-in-letters. Vernacular first-person baseball voice. PG boilerplate, table of contents, `[Illustration]` placeholders, and italic-underscore markup stripped. |

## Period New York (`corpus/raw/period/`)

| File | Title | Author | Year | Source URL | PD basis | Word count | Notes |
|---|---|---|---|---|---|---|---|

## Totals

- Fiction: 709,919 words (target 400,000–800,000) — **in range**.
- Period: 0 words so far (target 200,000+).
