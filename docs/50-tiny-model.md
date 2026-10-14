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
- **Format:** `<slot> <tier> <kind> <manner> <before> [GAP] <after> → <target>`, one example per gap.
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
