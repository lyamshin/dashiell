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
