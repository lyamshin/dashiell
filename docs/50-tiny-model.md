# Spike: the babiest LLM

*2026-10-14. The designer wants the game lightweight and fully local, "a classic game you could have run on MS-DOS." No downloaded model. So the question is whether a transformer trained from scratch on Dashiell's own voice, a few million parameters and a few megabytes, can write the sentence between two facts well enough to be worth shipping. This is a spike: it ends in a yes or a no with evidence, not in a pipeline.*

## 1. What the model does, and doesn't

- The microplanner (docs/49) writes every fact sentence, **locked**, and marks **gaps** between them: why-here, walk, staging, ask, reaction, close, hand-off. Each gap has a card default.
- The model fills **one gap at a time**, given the units before and after it (about 120 tokens of context), the slot name, the tier, the place kind and the speaker's manner. It writes one or two sentences, 8–40 tokens.
- A **verifier** rejects a gap that contains any person name, place name, hour word or digit, "nobody else", a banned phrase (the prose lints), a repeat of a sentence already on the page, or anything outside length bounds. Gaps are texture; facts stay in the locked units. On rejection: one resample, then the card default.
- It runs on the CPU, in plain TypeScript, in the browser, in milliseconds. If the weights aren't loaded, the page is the card version. The player never waits for the model.

## 2. Phase 1: the machinery (runs alongside the microplanner)

In `model/` (Python, training) and `src/game/board/model/` (TypeScript, inference):

- **Corpus for pretraining:** the goldens in `docs/golden/`, every card in `content/board/` and `content/decks/`, the bible's text, and 2,000 engine nights exported with `npm run read` (both worlds, all tiers). Clean to plain text, one page per line. Expect 3–6 MB.
- **Tokenizer:** word-piece or BPE, about 6,000 tokens, trained on the corpus; implemented twice, in Python for training and in TypeScript for inference, with a test that both tokenize 500 lines identically.
- **Model:** nanoGPT-shaped decoder, 4–6 layers, width 256, 4 heads, context 256, about 4–6M parameters. Train on the Mac (M1 Pro, 16 GB): a venv under `model/.venv` (the system Python is 3.9; use it, or install a newer one locally under `model/` if torch won't install), PyTorch with MPS where it helps, `torch.set_num_threads(4)`, and check `uptime` load before any run. Pretrain as a language model on the corpus until held-out loss flattens; keep runs under 20 minutes each and the checkpoint small.
- **Export:** int8 weights to one binary file plus a JSON header, target ≤ 8 MB; the TypeScript loader reads it (fetch, or a file in `public/model/`).
- **Inference in TypeScript:** no dependencies; matmul in typed arrays; KV cache; temperature and top-p sampling with the night's seed, so the same page renders the same way twice; a benchmark script reporting ms per 30-token gap on this Mac's CPU and in the browser.
- **Verifier:** as in §1, in TypeScript, with tests.
- **Deliverable of phase 1:** `npm run model:sample` prints twenty unconditioned samples; the benchmark numbers; the size.

## 3. Phase 2: the gap data and the fine-tune (after the microplanner lands)

- **Skeletons:** `scripts/skeletons.ts --n 400 --tier all` for both worlds, about 2,000 pages, about 10,000 gaps.
- **Targets:** each gap rewritten in the voice by a strong model (this is the designer's "use you to build and train"), given the same context the tiny model will see: the slot, the locked units either side, the place kind, the manner, the tier. Write in batches of 200 pages with one helper at a time; every target passes the verifier and the reader lint before it enters the set; a 10% sample is read by the lead against `docs/golden/seed3-camp.md` and `board-connective.md`. Targets that restate a fact, name anyone, or add a second joke are cut.
- **Format:** `<slot> <tier> <kind> <manner> <before> [GAP] <after> → <target>`, one example per gap. (Superseded by §8, which puts the page first so a page's gaps share one cache.)
- **Fine-tune** from the phase-1 checkpoint; hold out 10% of pages (not gaps).

## 4. The judgment

Report, on the held-out pages:

| measure | target |
|---|---|
| verifier pass rate, first sample | ≥ 80% |
| pass rate after one resample | ≥ 95% |
| held-out loss vs. the card baseline (the card default scored by the model) | lower |
| size on disk | ≤ 8 MB |
| ms per gap, CPU, this Mac, single thread | ≤ 50 |
| ms per gap, browser, WASM-free TypeScript | ≤ 150 |
| **the read:** 20 pages, model gaps vs. card gaps, side by side, judged by the lead and by two blind readers who don't know which is which | model preferred in ≥ 50% of pairs |

Also report: the ten best and ten worst model gaps, verbatim; what the model does badly (repetition, cliché, drift from the slot); and whether a model twice the size would plausibly fix it (train one 2× run if time allows and say).

## 5. Done means

- Phase 1 machinery in the repo behind nothing (the game doesn't use it until phase 2 passes), with tests.
- Phase 2 data under `model/data/` (committed if ≤ 20 MB, else documented how to regenerate).
- The judgment table filled in, in this doc, with the samples. A PR per phase, not merged.
- If it passes: a one-paragraph plan for wiring it behind `?model=1` with prefetch and fallback. If it fails: say why, plainly.

## 6. Phase 1, built (2026-10-14)

Branch `tiny-model`. Nothing in the book uses the model: `src/ui` and `pages.ts` are untouched, and the game's bundle doesn't import `src/game/board/model/`. How to rebuild every piece is in `model/README.md`.

### The corpus

`npm run model:corpus` (`scripts/model-corpus.ts`), one page per line, paragraphs joined by " ¶ ":

| source | lines | bytes |
|---|---|---|
| engine nights: 2,000 (both worlds × 6 tiers × 167 seeds, each tier's case types in turn, two in three on the oracle's route, one on the wanderer's), the page bodies `read --no-choices` prints, built in process; none failed | 25,934 pages (25,277 distinct) | 24.9 MB |
| cards, `content/board/` and `content/decks/`: every string of five words or more, slots filled plainly ({name} → "the man"); 246 with a slot left over skipped | 1,700 | 160 KB |
| the bible, `content/neighbourhood/`: every line of five words or more, speech in quotes | 818 | 80 KB |
| goldens, `docs/golden/`: the quoted or written pages, one section a line; the notes, rules and measurement files left out | 49 | 49 KB |

24.0 MB to train on (26,499 lines), 1.2 MB held out (1,344 lines: every twentieth seed's night, and one line in twenty of the rest). It is bigger than the 3–6 MB expected because the engine deals the same cards night after night: the distinct sentences come to 5.3 MB (75,000 of 400,000). "Nobody else." alone is there 2,382 times.

### The tokenizer

BPE over characters, 6,000 ids: 64 specials (`<|eot|>`, `<|unk|>`, `<|gap|>`, `<|sep|>`, and 60 kept for phase 2's slot, tier, kind and manner), 107 characters, 5,829 merges. The corpus has under 5,000 distinct words, so nearly every word is one token: 5.40M tokens to train on, 4.34 characters a token, no unknowns. Python (`model/tokenizer.py`) and TypeScript (`src/game/board/model/tokenizer.ts`) give the same ids on 500 held-out lines and eight edge cases (`test/model/tokenizer.test.ts`).

### The model and the training

nanoGPT's shape: 6 layers, width 256, 4 heads, context 256, MLP 1,024, learned positions, the head tied to the embedding. **6,326,784 parameters.** PyTorch 2.8.0 installs on the Mac's own Python 3.9.6, so the venv (`model/.venv`) needed nothing newer. MPS, about 38,000 tokens a second, batch 32 × 256:

| run | steps | minutes | held-out loss |
|---|---|---|---|
| lm1, from scratch, 1e-3 → 1e-4 | 0–5,000 | 18.5 | 8.73 → 1.18 (500) → 0.56 (1,000) → 0.40 (2,000) → 0.35 (3,000) → 0.32 (4,000) → 0.312 |
| lm2, lm1 at 3e-4 again | 5,000–6,500 | 5.6 | up to 0.328, back to 0.314: dropped |
| lm3, lm1 at 1e-4 → 1e-5 | 5,000–10,000 | 18.7 | 0.304 (7,000) → 0.300 (8,000) → 0.299 (9,000) → 0.298 (10,000): **flat** |

The checkpoint is lm3 at step 9,000; train loss about 0.27 there. Ten thousand steps is 82M tokens, about fifteen passes over the corpus. The first exploratory run had dropout inside attention and blew up on MPS at step 2,250 (0.46 to 400,000 between two evals); attention dropout is off now, and `train.py` goes back to the best weights at half the rate if it ever happens again.

### The export

`public/model/dashiell.bin` (6,427,072 bytes) and `dashiell.json` (87,989 bytes, with the tokenizer in it): **6.52 MB.** Every matrix int8 with a float32 scale a row, LayerNorms float32. int8 costs nothing measurable: held-out 0.2977 in float, 0.2977 in int8. The TypeScript forward pass matches PyTorch's logits on the int8 weights to 2e-3, and gives the same logits fed at once, in pieces or a token at a time (`test/model/gpt.test.ts`).

### Speed

`npm run model:bench`: a gap is 120 tokens of context fed from an empty cache, then 30 sampled.

| | ms per gap | context | each token | load | target |
|---|---|---|---|---|---|
| this Mac (M1 Pro), Node 22, one thread | **345** | 225 | 4.0 | 17 | ≤ 50 |
| the browser: the Claude app's Chromium 152 pane, hidden, on the dev server (`/scripts/model-bench.html`) | **505** | 315 | 6.3 | 172 | ≤ 150 |

Seven times over on the CPU, three and a half in the browser. The kernels are already the fastest of the shapes measured in V8 (four rows by four tokens in a batch, about 3 GMAC/s; four rows sharing x one token at a time, about 1.8); weights in an Int8Array ran no faster than float32. The arithmetic: a gap is about 0.75 billion multiply-adds (120 × 4.7M for the context, 30 × 6.3M for the tokens), and plain JavaScript does about 2 billion a second. Fifty milliseconds is about 100 million: a model of a million parameters (two layers, width 128, a smaller vocabulary), or a page fed once into the cache with each gap feeding only its own 30 tokens, which needs phase 2's format to put what comes before the gap first and what comes after it short. Node and the browser draw the same samples from the same seed.

### Twenty samples

`npm run model:sample`: from `<|eot|>`, temperature 0.8, top-p 0.9, up to 120 tokens. Ten of them, verbatim:

1. I went over the parlor, and then the door, and then the parlor again. ¶ Russo sat on the arm of a chair and watched me go over his own parlor like a stranger’s. ¶ The hook by the window where the cage hung was empty. The key was back under the mat, and there wasn’t a mark on the door. Whoever it was had known exactly where to look. ¶ So it was somebody who’d heard Russo at Sokol’s between eight and ten, and had come here after. That made Sokol’s the place to start counting. ¶ There was a potted palm in the lobby, long dead […]
3. From there to the Peacock was a couple of blocks. The cat from the step was on a different step now. Even the cat had somewhere to be. ¶ The Peacock was a cellar club under Kornblum & Sons, Funeral Directors, on Chrystie Street. You went down an outside stair beside the undertaker’s window, past a coffin on display with its lid up and the price folded discreetly on the pillow, to a steel door with a slot in it. After midnight the band was still going, and you could feel the bass drum through the door before you heard it. There was the cigarette girl’s tray, Luckies […]
4. I sat down at the kitchen table with the form, under the one good light. Whatever I wrote down, I’d have to be able to say whose word it stood on. ¶ The office stairs would still be a little shorter when I climbed them next. Paid rent does that to a building.
5. I hadn’t come for the furniture. I’d come for Miss Moskin. ¶ I sat down where she could see me, and didn’t hurry. She had big dark eyes that she knows how to use, and uses. I asked her where she’d been tonight, and who with, hour by hour. ¶ She thought for a second, the way anybody does, and started at the beginning. ¶ “Oh, my evening. Let me do it properly. You have to set the scene, or it doesn’t play. I was home at the flats over Lipsky’s all evening. Miss Nowak and Miss Lowenthal were there at […]
8. I hadn’t come for the furniture. I’d come for Mrs. Nagy. I went over to her and waited until she had a moment, which took a moment. ¶ I asked Mrs. Nagy to count the night for me, face by face. She started at the top of the evening and went down it like a column of figures. ¶ “Eight o’clock, Kessler, Rosenbaum, Wehrle and Reinhardt. Nobody else at all. Nine, Renfro and Wehrle. Nobody else, that hour. Ten, Mosley and Petrosino. Nobody else. The spare key for the Corrigan flat was on its nail at eight. […]
11. I hadn’t come for the furniture. I’d come for Mrs. Sobel. She was knitting a baby’s cap of no particular size. She had spectacles on a chain, and a face that has seen everybody on Orchard Street at their very first and is not impressed by their since. ¶ I asked her to walk me through her night, every stop of it. ¶ She put down what she was holding and gave me her attention. ¶ “Sit, sit. I delivered half this street. I can deliver an evening. I was home at the flats over Lipsky’s all evening. Mrs. Greco, Mrs. Greco […]
15. I took the form out and smoothed it flat on my knee. It was my name at the bottom, so it had better be my reasons above it. ¶ The new money would go in the desk drawer with the old. The drawer had never had company before.
16. I hadn’t come for the furniture. I’d come for Mrs. Whitfield. I kept my voice down. She kept her eyes on me. ¶ I asked her for her evening, in order, the way you’d ask for a receipt. She smoothed the front of her coat, as if the evening were on it, and began. ¶ “I was home at Rafferty’s all evening. At eight it was just me; Margolis was there at nine; at ten and eleven it was just me. I had Mimi at my place at nine, to keep the mice down, and put her back in the flat just […]
19. I took the form out and smoothed it flat on my knee. I read the night back to myself, from the office to here, and started at the top of the form. ¶ The office telephone never had rung tonight. It hadn’t needed to. The trouble had taken the stairs.
20. I hadn’t come for the furniture. I’d come for Wojcik. ¶ The janitor knocks his pipe out on the stoop rail so often the rail has a dent in it the shape of the bowl. I asked Wojcik to count the night for me, face by face. ¶ He didn’t look at the room to answer. He didn’t need to. ¶ “Seven, I bank the boiler for the night. She sulks. Then she settles. Seven o’clock, Teitel, Mrs. Krantz and Teitel. Nobody else. Eight, Mrs. Krantz, Mrs. Krantz and Teitel. Nobody else at all. Nine, Mrs […]

### The first read

**The voice is there, but the model recalls it; it doesn't write it.** The samples read like the engine's own pages because they're built from the engine's sentences: the jokes land because they're the deck's jokes, in the deck's order. It also slips where the engine never would: a name twice in one hour ("Teitel, Mrs. Krantz and Teitel"), and, in other samples, Mrs. Nagy asked and Mrs. Kowalski answering. The held-out loss says the same thing more plainly (`model/runs/lm3-eval.json`): 0.25 a token on held-out nights, 1.01 on held-out sentences that appear nowhere in training, and about 4.5 (a perplexity near 90) on the designer's fresh prose, the goldens' and the bible's held-out lines.

`scripts/model-probe.ts` tries it as a gap-filler with no fine-tune: 200 texture sentences from held-out night pages, the page up to each as context, one sentence sampled in its place. The verifier passes 86% first time and 94% after one resample, close to §4's 80% and 95%. But of the 188 gaps it filled, 57% are the card's own sentence and 42% another sentence from training; one is new, and it's a bible line with "She" changed to "He". At temperature 1.1 and top-p 0.97 it's still 99% recalled. Sometimes the swap is good ("I wiped my feet, because somebody in that house would notice if I didn’t." for "I stood still and listened."); sometimes it's a fact with no name in it, "The laudanum had come from here." The verifier now rejects a means word and takes the night's own clue words (`facts`), since nothing else in it caught that.

So as it stands it's the card system with extra steps, and slower. The real question is whether phase 2's ten thousand gap targets can teach a model this size, on a corpus this narrow, to write rather than recall. My expectation is that it will mostly learn the targets by heart too. What would give it a better chance: pretrain first on the public-domain corpus already in `corpus/raw/` (Hammett, Daly, Hecht, Lardner, the WPA guide, about 1.15M words) for plain English, then on the game's pages; upweight the goldens, which are 0.2% of the corpus; and hold out by sentence as well as by night, so the loss can say whether it writes.

### Open

- **Speed is the hard limit**, more than size: 345 ms and 505 ms against 50 and 150. The ways out are a model about a sixth the size, a page-level cache with a gap format that puts the text before the gap first, or a budget of seconds (gaps written in a worker while the player reads the page before), which §1's "the player never waits" already allows.
- **The browser number was taken in the Claude app's pane, hidden.** A foreground Chrome or Safari is likely faster; that's still to measure. The preview tool runs the main checkout's `.claude/launch.json`, so the worktree's own Vite ran on port 5181 and the pane was pointed at it.
- **`public/model/` ships with the next deploy** (6.5 MB in `dist/model/`), though nothing fetches it. Move it out of `public/` until phase 2 if that matters.
- **The verifier is strict.** Taken one sentence at a time, the cards' own text passes 79% and the goldens' 37% (mostly on names and hours, as it should). It can't see a fact that has no name, hour, digit or means word in it, so phase 2 should pass the night's clue words in `facts`.
- Re-warming the rate (lm2) set the loss back; continue at a tenth of the rate instead. `--patience` counts from the run's first eval.

## 7. Phase 2a: generalise first (2026-10-14)

*Phase 1's model recalled the cards rather than writing (§6). Before phase 2b spends ten thousand written targets on it, 2a tries to make the pretrained model generalise: the engine's repetition out of the corpus, plain period prose in, the designer's own prose weighted up, and two training stages. Plus the speed plumbing 2b needs (the page cache, the worker), the export out of `public/`, and 2b's data format (§8). Branch `tiny-model-2a`; nothing in the book uses any of it.*

### The corpus, before → after

`npm run model:corpus` (`scripts/model-corpus.ts`, `model-corpus-pd.ts`), from main with bible-2:

| source | phase 1 | phase 2a |
|---|---|---|
| engine nights, training | 24.0 MB: 24,704 pages (24,136 distinct), 364,052 sentences of which 77,748 distinct (5.8 MB): **24% distinct** | **6.29 MB**: 20,674 pages, 99,906 sentences, every distinct sentence once plus 22,158 repeats of glue (sentences of three words or fewer, "Midnight.", "I said.", "Nobody else.", kept wherever they fall): **93% distinct** |
| engine nights, held out | 1 night in 20 by seed | the same 100 nights, 1,172 pages, whole as dealt (1.18 MB) |
| public domain | none | **3.67 MB** training, 0.22 MB held out (1 chunk in 20): 689,000 of `corpus/raw/`'s 1,152,000 words |
| cards | 160 KB, once | 152 KB, once (91 held out) |
| bible | bible-1, 80 KB, once | bible-2, 133 KB, **×10** (76 lines held out) |
| goldens | 47 sections, once (2 held out) | 42 sections, **×10** (7 held out: phase 1's 2 and five more, from six files) |

The dedupe (`dedupeNights`): exact duplicate pages dropped; then, in a seeded order, each sentence of four words or more is kept the first time it comes up and cut from every later page. The first page to deal a card keeps it in place; later pages keep what's theirs (the accounts, the lists, the names), with the glue between. "Nobody else." was there 2,384 times, "I hadn't come for the furniture." 1,845: now the second is there once.

The public domain, brought to the book's characters (no dashes, no ellipses, no accents but é; a dash becomes a comma, an ellipsis a full stop, the WPA's small capitals title case): **kept** Hammett's four Standard Ebooks texts and Hecht whole (OCR-free; paragraphs dropped only for headings or characters the book never uses), Daly's OCR where its words are spelled (96% of lowercase words in the clean texts' vocabulary, no "i6l"-type tokens), and the WPA guide's running prose only (514 of 4,598 paragraphs: no page references, prices, addresses or figures). **Left out:** Lardner's *You Know Me Al* (misspelled and unpunctuated on purpose, a busher's letters; nothing a verifier could catch), and the three years of *Evening World* pages (headline fragments in raw OCR: "tho", "havo", "mado").

**Two stages** (`model/prepare.py`): stage 1 is the public domain alone (0.94M tokens); stage 2 is every training line of every source once, the public domain again so stage 1 isn't forgotten, and the goldens and the bible repeated k times, k = 10 chosen so they are 15% of stage 2's 2.84M tokens:

| stage 2 | nights | public domain | bible ×10 | goldens ×10 | cards |
|---|---|---|---|---|---|
| share of tokens | 50.2% | 33.1% | 11.9% | 3.5% | 1.3% |

**The tokenizer**, retrained on every training line once: 6,000 ids, the same 64 specials (now named, §8), 104 characters, 5,832 merges. 4.27 characters a token on the nights, 4.09 on the goldens, 3.78 on the public domain (Hammett's vocabulary is wider than the book's). No unknowns.

### Training

Same shape as phase 1 (6 layers, width 256, 4 heads, context 256, 6,326,784 parameters, 6.51 MB int8). **Eight layers doesn't fit:** 7.89M parameters is 8.08 MB exported, over the 8 MB line, and a third slower a token, which the speed budget below can't spare; and with 3.8M tokens of text the model is short of data, not depth. MPS, batch 32 × 256, residual dropout 0.2 (the data is small), about 36,000 tokens a second with the evals; every eval scores each source's held-out lines on its own, and stage 2 keeps the checkpoint with the best mean over the goldens, the bible and the public domain (`--select`), the designer's prose and plain English, not the engine pages a model can learn by heart.

| run | data | from | rate | steps | minutes | held-out loss (nats a token) |
|---|---|---|---|---|---|---|
| pd1 | stage 1 | scratch | 1e-3 → 1e-4 (1,500), then 1e-4 | 0–4,700 | 18.1 (time) | public domain 8.73 → 4.80 (400) → 4.38 (900) → 4.23 (1,500) → 4.12 (3,100) → **4.05** (4,700), still falling 0.006 a hundred steps; train 3.54 |
| **mix1** | stage 2 | pd1 | 6e-4 → 6e-5 | 4,700–6,400 | 6.6 (flat) | selection 4.84 → 4.15 (5,000) → **3.977 (5,800)**: goldens 3.76, bible 3.88, public domain 4.29, nights 2.34 |
| mix2 | stage 2 | mix1 | 1.5e-4 → 1.5e-5 | 5,800–6,700 | 3.6 (flat) | 3.962 (6,000), the goldens rising: dropped |
| mix4 | stage 2, two copies a sentence | pd1 | 6e-4 → 6e-5 | 4,700–7,600 | 11.2 (flat) | 3.846 (7,000): goldens 3.67, bible 3.64, public domain 4.23, nights 1.68 |
| mix3 | stage 2, three copies, cards ×3 | pd1 | 6e-4 → 6e-5 | 4,700–9,400 | 18.0 (time) | 3.788 (9,000): goldens 3.66, bible 3.47, public domain 4.23, nights 1.18 |

**The export is mix1** (step 5,800), the corpus as specified, one copy of each sentence. mix4 and mix3 are the same recipe with `--cap 2` and `--cap 3` (and the cards ×3): experiments, to see what the one-copy rule costs. int8 costs nothing measurable again (nights 2.3694 → 2.3698, public domain 4.2778 → 4.2779).

### Generalisation, before → after

`model/evaluate.py`, every held-out line scored whole. **Bits a character**, because the two models have different tokenizers (nats a token in brackets). Phase 1's numbers on the goldens are on the two sections it never saw (it trained on five of today's seven); everything else is held out from both.

| held out | phase 1 (lm3) | **2a (mix1)** | mix4 (2 copies) | mix3 (3 copies, cards ×3) |
|---|---|---|---|---|
| engine pages (1,169) | **0.357** (1.06) | 0.797 (2.32) | 0.567 | 0.391 |
| goldens (the 2 neither saw) | 1.487 (4.25) | **1.110** (3.14) | 1.038 | 1.029 |
| goldens, all 7 | (1.119, trained on 5) | 1.310 (3.72) | | |
| bible-2 (76 lines, new to both) | 1.554 (4.43) | **1.501** (4.03) | 1.383 | 1.300 |
| public domain (228 chunks) | 3.004 (7.04) | **1.627** (4.27) | 1.602 | 1.600 |
| cards (91) | **0.796** (2.36) | 1.061 (3.07) | 0.933 | 0.835 |
| *sentences in no training text:* engine (2,000) | 0.427 | **0.327** | 0.274 | 0.258 |
| goldens (42) | 1.584 | **1.145** | 1.106 | 1.124 |
| bible (85) | 1.798 | **1.509** | 1.423 | 1.373 |
| public domain (2,000) | 2.897 | **1.559** | 1.533 | 1.529 |

Everything that isn't a dealt page got better: the designer's unseen prose by a quarter, plain English by half, and **sentences the engine wrote that appear in no training text by a quarter** (0.43 → 0.33). Whole held-out pages got worse (0.36 → 0.80): they are mostly cards phase 1 knew by heart, which is the point. The variants show the trade: every extra copy of the engine's sentences buys loss everywhere, the novel ones included.

### The probe: does it still recall?

`scripts/model-probe.ts`: 400 texture sentences from held-out night pages, the page up to each (120 tokens) as context, one sentence sampled in its place (temperature 0.8, top-p 0.9), the verifier, one resample. **Recalled** = the card's own sentence, another training sentence verbatim, or a run of eight words or more shared with the training text. *Constrained* = names, hours, digits, honorifics and means kept out at the sampler (`gapBans`, `src/game/board/model/constrain.ts`), as the page writer does.

| 400 gaps | phase 1 | **2a (mix1)** | 2a, constrained | mix4 | mix3 (200 gaps) | mix3, constrained |
|---|---|---|---|---|---|---|
| verifier pass, first sample | 90% | 15% | 35% | 20% | 24% | 54% |
| after one resample | 95% | 26% | 52% | 30% | 33% | 70% |
| the card's own sentence | 51% | 0% | 0% | 0% | 3% | 2% |
| another training sentence, verbatim | 46% | 1% | 3% | 7% | 5% | 8% |
| eight words or more from training | 1% | 13% | 29% | 18% | 32% | 38% |
| **recalled, in all** | **98%** | **14%** | 31% | 24% | 40% | 48% |

**Recall is under 20%** (14%, from 98%). But the pass rate fell with it, from 95% to 26%: what phase 1 put in a texture slot was the texture that was there, recalled. 2a writes what an engine page *usually* says next, and that is a fact: an account in quotes, a list, a name. The first-try rejections are names (427), hours (105), an empty gap (81: it ended the page), length (76) and an unclosed quote (69). Keeping the facts out at the sampler doubles the pass rate (52%) and raises the recall (31%), mostly eight-word runs of the engine's own templates with a word swapped ("For twenty, the hour that mattered, she said home"). More copies of the engine's text, the variants, buy pass rate and pay for it in recall, almost one for one. At this size, writing and recalling don't come apart.

### Thirty gaps, read

The first thirty of the constrained probe on mix1, verbatim: the sentence the book would have taken (or, where both drafts failed, the first draft), the card it stood in for, and my one-line read.

| # | the model | in place of | read |
|---|---|---|---|
| 1 | *(card; tried)* “It’s Caruso,” she said, “or somebody has taken it, which is worse. | I drank it anyway; it was lighter than holding my head. | A name and an open quote; the cadence ("which is worse") is the voice, the content is testimony. Fail. |
| 2 | That was a hole in my notebook, and she was at the desk, sitting where she could see every seat in the place. | I took the money and my coat, and turned off the lamp. | Two card fragments spliced; "she" is nobody (the client is a man). No sense here. |
| 3 | I went up to the card room over the garage to meet the quiet do it. | There were lace mats on every chair back… | Breaks down at the end; also a move the night never made. Nonsense. |
| 4 | *(card; tried: nothing)* | There wasn’t a mark on the door or the window. | It ended the page. |
| 5 | The landlady at the chop house would have seen everybody who came in. | The china shepherdess went on minding her doily. | Fluent and in the voice, but a pointer (who saw whom), not texture; a template it knows. |
| 6 | But the people had found something to do with them, now. | It had taken them long enough, but they’d done it properly. | Grammatical, vague, "them" is nobody. Harmless filler at best. |
| 7 | The stairs creaked under it and the key was locked, the way people look up when they’re paying for your time. | That settled where I was going. | Starts well; "the key was locked" and the simile are non sequiturs. |
| 8 | The woman had given up for three minutes, and to tell me about it, which would be no doubt that it was all right. | The doctors were right, and so were the steaks. | Word salad after the first clause. |
| 9 | *(card; tried: nothing)* | She smelled of gasoline and cold coffee… | Ended the page. |
| 10 | *(card; tried)* “Ask about Caruso,” he said. | She put down what she was holding… | A name, and "he" for a woman. Fail. |
| 11 | If she went at the chop house at night at the bakery yard at the back at the back, not at the chop house. | The samovar went on steaming… | Loops on place words. Nonsense. |
| 12 | It turned out I was at the far end of the bar, nursing something. | I could have used a glass from the samovar. | An engine template with the subject turned to "I": grammatical, accidentally funny, wrong. |
| 13 | *(card; tried: nothing)* | I’d started it, and I’m a professional. | Ended the page. |
| 14 | The room was a room with a gas jet over it, a bar down one side and a dozen stools over a newspaper. | Rain ran down the window in the lamplight… | In the voice until "stools over a newspaper", and it's the office: there's no bar. |
| 15 | “I don’t like gossip, but she has had people.” | I offered him the chair. | A line of speech with no speaker; half a sense. |
| 16 | *(card; tried: nothing)* | That was a room, more or less. | Ended the page. |
| 17 | The dead man was open, a little by the table, the table and not much want to look at a man. | The key was back under the mat… | Nonsense, and a dead man in a lost-pet case. |
| 18 | *(card; tried: nothing)* | He had a pleasant, forgettable face… | Ended the page. |
| 19 | It was a long way people do when they don’t want to look at a room. | I asked him to count the night for me, face by face. | The rhythm of the voice with no meaning in it. |
| 20 | *(card; tried)* “I was at the chop house from evening. | Thin, and bent at the shoulders… | Testimony, open quote. Fail. |
| 21 | I was at the chop house, with my hat on the way you’d count change, carefully and a list from the desk I was at the chop house. | I went over it once more, the way you go over a bill you know is wrong. | Card fragments glued end to end. Nonsense. |
| 22 | The rest held where I could check it: I could check it: the way people do with an evening, and an evening, and not the audience. | It was a narrow brick house… | Stutters. Nonsense. |
| 23 | It turned out I hadn’t looked properly at the place. | I wiped my feet, late. | Grammatical, sensible, in the voice. The best of the thirty. |
| 24 | *(card; tried)* “The usual. | The stairs outside creaked twice… | A fragment. Fail. |
| 25 | *(card; tried)* “Find out who.” | “When did this happen, as near as you can say?” | Apt for the client, but three words: too short for a gap. |
| 26 | She knocked once and went at the place, because there’s no such thing as a place you’re finished with. | I stood still a moment and let the place get used to me. | The second half is a good line (a card's, recalled); the first is muddled and "she" is wrong. |
| 27 | *(card; tried)* “At half past night, I was at the back room, and stayed through with a shoe clerk who was in it. | It was her flat… | Testimony, routed round the banned hour ("half past night"). Fail. |
| 28 | Every seat sold a man’s a drink he hoped would like it. | It was asking a lot. | Broken grammar. |
| 29 | The hall smelled of clove oil, and a smell of clove oil, and the stairs went by nothing in the dark. | The hall smelled of paprika and floor wax… | The card's own frame, then it repeats itself and dissolves. |
| 30 | *(card; tried)* “At the window. | Young and tidy and a little tired… | A fragment. Fail. |

**One good sentence in thirty (23), two harmless (6, 15), two fluent but wrong for the slot (5, 12).** The rest is the voice's rhythm with the sense worn off: loops, wrong referents, fragments of cards glued together, or a fact where texture was asked for. That is what a model of six million parameters makes of four million tokens once it can't lean on memory.

### Speed: a page in the background

The gap runs in a Web Worker (`src/game/board/model/worker.ts`): `GapWorker` on the book's side (`load`, `prefetch(id, plan)` as soon as the next page is dealt, `take(id, waitMs)` on the page turn, which gives the page or `null`, the cards), and the host on the worker's side, which writes pages one at a time in the order asked. Nothing in the book creates it yet.

**The page cache** (`writePage`, `src/game/board/model/page.ts`): the page so far stays in the KV cache. A locked unit is fed once. A gap marks the cache, feeds its header and the unit after it (§8), drafts, and on a rejection rolls back to the mark and drafts again (`TinyLM.truncate`, exact: the keys before the mark don't depend on what came after); then it rolls back to before the header and feeds the chosen text as page text. When the window fills, the cache is primed again with the page's last 120 tokens (once on the bench page).

`npm run model:bench` and `/scripts/model-bench.html`: the golden's office page as a skeleton, five gaps, every draft exactly 30 tokens and taken first time (the verifier off): the worst case for length, the best for tries.

| | a gap from cold (120 + 30) | **a 5-gap page, cached** | the page fed alone (gaps as cards) | each gap adds |
|---|---|---|---|---|
| this Mac (M1 Pro), Node 22, one thread | 347 ms | **1,680 ms** | 470 ms | 242 ms |
| the Claude app's Chromium 152 pane (hidden), main thread | 505 ms | 2,465 ms | 664 ms | 360 ms |
| the same, **in a Web Worker**, prefetch → take, 8 pages | | **2,465 ms** (worst 2,474) | | |

**A five-gap page fits in 3 s in a worker on this Mac: 2.5 s**, with room for two or three resamples at 0.19 s each (30 tokens at 6.3 ms). A 2b model that ends at `<|endgap|>` after 20 tokens or so would be nearer 2 s. (An earlier run, with training on the GPU, timed the worker at 1.7 s and the main thread at 2.6 s; the quiet run gave 2.5 s for both, so the worker's number is 1.7–2.5 s.) Cached, a gap costs 360 ms on top of reading the page once (660 ms), against 505 ms for a gap from cold that sees only the 120 tokens before it; at five gaps the saving is small, and what the cache really buys is that every gap sees the whole page so far and the unit after it for that price. Load is 170 ms (fetch, dequantize).

### The export, out of `public/`

`model/export/dashiell.{bin,json}` (6.51 MB), not `public/model/`: `vite build` doesn't copy it (`dist/` is 852 KB, and `test/model/gpt.test.ts` checks `public/model/` is gone). `fetchModel(base)` takes the directory (`src/game/board/model/load.ts`); the dev server serves the repo, so the bench fetches `/model/export/`; the Node scripts take `--model DIR`. When the book uses it, the build will have to copy it somewhere deliberate.

### The call on 2b

2a did what it was asked: the model no longer recites the cards (98% recalled → 14%), and it scores the designer's unseen prose, plain English, and the engine's unseen sentences better than phase 1 did. The plumbing 2b needs is built and fast enough: a page's gaps in a worker in 2.5 s, the format written down (§8).

But what it writes when it isn't recalling is mostly not sense: one good sentence in thirty. That's a property of the size and the data, not of the corpus recipe: the variants show that every step back toward the engine's repetition buys a little loss and pass rate and pays for it in recall (26% → 30% → 33% passing, 14% → 24% → 40% recalled), and the best of them on loss (mix3) reads no better. Ten thousand gap targets add about 250,000 target tokens; they will teach the format, the slot and the length, and the ban mask already keeps out the names and the hours, but they won't teach a six-million-parameter model grammar it doesn't have from four million tokens, and on a set that small it will learn the targets by heart the way phase 1 learned the cards. §4's read wants the model preferred over the designer's cards in half the pairs; I'd expect it under one in five.

**My call: don't run 2b's fine-tune as the next step; do write the targets.** Ten thousand strong-model gap sentences, keyed by slot, tier, place kind and manner, verified, read and cut as §3 says, are worth more as a deck: the book can deal them deterministically, with no model, no weights and no worker, and they are new text the player hasn't read. If the designer still wants the experiment, the fine-tune is a day once the targets exist (§8 has the format, mix1 is the base, mix4 the alternative if fluency matters more than recall), and the kill line should be set before it runs: below 30% preferred on the blind read, ship the targets as cards.

### Open

- **The probe is prefix-only.** It can't tell the model a slot is texture; 2b's format can. Some of the fall in the pass rate (the names, the testimony, the ended pages) is that, and would be fixed by the slot token and the fine-tune, not by a bigger model.
- **The verifier misses facts with no name in them**: "Somebody has taken a silver cigarette case", "The spare key was on the nail in the hall at the chop house" (mix3's drafts) pass. 2b's `facts` will catch some; a fact detector (a lost thing, a key, a place word in a texture slot) would catch more.
- **The ban mask is routed round:** with the hours banned, mix1 wrote "half past night" and "at twenty". Add the number words, or let the verifier reject them.
- **Stage 1 was still learning at 18 minutes** (public domain 4.05 and falling). A second stage-1 run would help plain English a little; it won't change the call.
- The browser numbers are the Claude app's pane, hidden, as in phase 1; a foreground Chrome or Safari is still unmeasured.

## 8. Phase 2b's data: the gap format

*The contract between the agents writing the gap targets, the fine-tune, and the book. Written down before any target is, so all three build to the same thing. The code is `src/game/board/model/gapformat.ts` (the book's side) and `model/gapformat.py` (the fine-tune's); `test/model/gapformat.test.ts` holds them to the same ids on 40 examples (`model/data/gap-parity.jsonl`).*

### The example

One gap is one example. The prompt puts the page so far first, so a page's gaps share one KV cache (§7, speed): the page is fed once, each gap adds only its header, the unit after it and its draft, and is rolled back.

```
<|eot|>BEFORE<|gap|><|slot:S|><|tier:T|><|kind:K|><|manner:M|><|sep|>AFTER<|sep|>TARGET<|endgap|>
```

Written out, with the tokenizer's names for the specials (`showExample`):

```
<|eot|>Midnight. My office was a room at the top of a walk-up on Mulberry Street. ¶<|gap|><|slot:why-here|><|tier:poached|><|kind:office|><|manner:none|><|sep|> “My name is Ilse Hauck,” she said.<|sep|> Nobody climbs those stairs at that hour to be sociable.<|endgap|>
```

The fine-tune learns TARGET and `<|endgap|>` only; the prompt's tokens carry no loss.

| part | what it is | budget (tokens) |
|---|---|---|
| **BEFORE** | the page so far as the reader will see it: every unit before the gap in order, locked units verbatim, earlier gaps as written (their targets, not their card defaults), paragraphs joined by `" ¶ "`; when the gap opens a paragraph, BEFORE ends with `" ¶"`. Cut to its last N tokens on a token boundary, N drawn uniformly from 120–160 per example when the page is longer (the writer re-primes to 120 when its window fills, then grows to 160). | 120–160 |
| header | `<\|gap\|>`, the slot, the tier, the page's place kind, the speaker's manner, `<\|sep\|>` | 6 |
| **AFTER** | the next **locked** unit's text (skip over any gap between), with a leading `" "`, or `" ¶ "` when it opens a paragraph; its first 48 tokens. Empty when no locked unit follows (a close or a hand-off at the end of the page). | ≤ 48 |
| `<\|sep\|>` | | 1 |
| **TARGET** | the gap, written: one or two sentences, a leading space, no paragraph mark; must pass the verifier (below) | 8–40 |
| `<\|endgap\|>` | the end of the gap | 1 |

160 + 6 + 48 + 1 + 40 = 255, inside the context of 256.

**The card default is not in the prompt.** The model never sees what the card would have said; a target writer may read it, and must not copy it or paraphrase it closely (the point of 2b is writing, and phase 1's model already does the card). A target that restates a fact, names anyone, or adds a second joke is cut (§3).

### The specials

Ids 0–63 are reserved in the tokenizer (`model/tokenizer.py`, `SPECIALS`); phase 2a named them, so 2b needs no new tokenizer. Phase 2a's export carries these names.

| ids | tokens |
|---|---|
| 0–3 | `<\|eot\|>` `<\|unk\|>` `<\|gap\|>` `<\|sep\|>` (phase 1) |
| 4 | `<\|endgap\|>` |
| 5–11 | `<\|slot:why-here\|>` `walk` `staging` `ask` `reaction` `close` `hand-off` (docs/49 §3's slots) |
| 12–17 | `<\|tier:raw\|>` `coddled` `poached` `soft-boiled` `medium` `hard-boiled` (`TIER_NAMES`, by index 0–5) |
| 18–33 | `<\|kind:bar\|>` `club` `restaurant` `theatre` `rooming` `scene-murder` `scene-lost` `work` `shift` `unwatched` `flat` `rooms` `home` (the page's `PlaceKind` in `pages.ts`), and `office` `sheet` `street` for the pages that aren't a place (the opening, the form, a walk) |
| 34–37 | `<\|manner:plain\|>` `terse` `careful` (`WorldManner`) and `none`: the narrator's own gap, nobody speaking |
| 38–63 | spare |

### What the skeleton has to give

docs/49 §3's `Unit` is nearly enough. For each page the exporter (`scripts/skeletons.ts`) needs, beyond the units:

- **`para`** on every unit: whether it opens a paragraph (BEFORE and AFTER carry the paragraph marks; without them the model can't learn where a gap sits);
- the page's **place kind** (one of the 16 above) and, per gap, the **speaker's manner** (`none` when the gap isn't in anyone's mouth);
- the night's **seed and tier**, and the page's index (for the held-out split and the seeds);
- the verifier's inputs, below.

### The data file

`model/data/gaps.jsonl` (and `gaps.val.jsonl`), one gap a line, UTF-8, the book's characters (curly quotes, no dashes):

```json
{"night": "dealt/4/37/lost-pet/oracle", "page": 6, "unit": 3,
 "slot": "walk", "tier": 4, "kind": "bar", "manner": "none",
 "before": "… the page so far, paragraphs joined by ' ¶ ' …", "after": " ¶ Brennan was on a stool by the door.",
 "card": "the card default, for the writer and the read; never in the prompt",
 "target": "The written gap.",
 "verify": {"names": ["Brennan", "Mrs. Nagy"], "places": ["the Blue Lantern", "Orchard Street"], "facts": ["the cameo brooch", "Mimi"], "page": ["every other unit's text on the page, before and after"]}}
```

`before` is stored whole (uncut); the cut to 120–160 tokens is the fine-tune's, at encoding time (`gap_example(…, before_tokens=N)`), so the same file serves a later context length. `after` is stored as it goes in (leading space or `" ¶ "`), uncut.

### The verifier's inputs

`verifyGap(target, ctx)` (`src/game/board/model/verifier.ts`) with:

- `names`: the night's people as the page writes them ("Corrigan", "Mrs. Krantz", "Nora Hanrahan");
- `places`: the night's places and streets;
- `facts`: the night's clue words (the lost thing, the pet's name, the means as dealt, what was found);
- `page`: every other unit's final text on the page, before and after the gap (a gap may not repeat a sentence of it);
- `countTokens`: the tokenizer's count, `minTokens` 8, `maxTokens` 40; `maxSentences` 2 (the default).

Every target passes it before it enters the set; the book runs the same check on the model's draft, resamples once, then takes the card default (§1).

### The split, the seeds, the mix

- **Held out: one night in ten by seed** (`seed % 10 == 0`), every page of it, every world and tier. Never by gap: a page's gaps share their BEFORE.
- **Seeds:** a draft is `gapSeed(seed, tier, page, unit, attempt)` (`sample.ts`); `writePage` takes `[seed, tier, page]` as `plan.seed` and adds the unit and the try.
- **The fine-tune** starts from phase 2a's checkpoint (`mix1`), loss on TARGET + `<|endgap|>`, and keeps a share of plain LM batches from `stage2.bin` (a third, say) so the voice it learned in 2a isn't traded away for the format. Stop on the held-out gaps' loss, then the probe and §4's read.
