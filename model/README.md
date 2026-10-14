# The tiny model

docs/50: a transformer trained from scratch on Dashiell's own pages, small
enough to ship with the book and run in plain TypeScript. Nothing in the book
uses it yet. Phase 1 built the machinery; phase 2a (docs/50 §7) rebuilt the
corpus so the model generalises instead of recalling, added the page cache and
the worker, and wrote down phase 2b's gap format (§8); phase 2b (the gap data
and the fine-tune, after the microplanner of docs/49) decides whether it ships.

## What's where

| | |
|---|---|
| `scripts/model-corpus.ts` | builds the corpus: goldens, cards, the bible, 2,000 engine nights (deduped to one copy of each sentence), the public-domain prose → `model/data/<source>.{train,val}.txt` |
| `scripts/model-corpus-pd.ts` | the public-domain texts under `corpus/raw/`: which are kept, and how they are brought to the book's characters |
| `model/tokenizer.py` | the BPE tokenizer (training, encoding, the parity fixture), and the names of the gap format's special tokens |
| `model/prepare.py` | encodes the corpus and mixes the two training stages → `model/data/stage1.bin`, `stage2.bin`, `<source>.val.bin` |
| `model/gpt.py` | the network (nanoGPT-shaped) |
| `model/train.py` | pretraining, with this Mac's house rules; every eval scores each source apart |
| `model/evaluate.py` | held-out loss by source (a token, and in bits a character, to compare tokenizers), and on sentences never seen in training |
| `model/export.py` | int8 export → `model/export/dashiell.{bin,json}`, plus the forward-pass fixture |
| `model/gapformat.py` | phase 2b's gap format, the fine-tune's side (docs/50 §8) |
| `model/export/` | the export (committed): outside `public/`, so the built book doesn't carry it; the dev server serves it as `/model/export/` |
| `model/tokenizer.json` | the tokenizer (committed) |
| `model/data/corpus.json`, `tokens.json` | the corpus's counts and the stages' mix (committed) |
| `model/data/tok-parity.jsonl`, `fwd-parity.json`, `gap-parity.jsonl` | what Python gave, for the TypeScript tests (committed) |
| `model/runs/*.jsonl`, `*-eval*.json`, `*-probe*.json` | every training run's curve, the evaluations and the probes (committed) |
| `src/game/board/model/` | inference in TypeScript: tokenizer, forward pass with a KV cache (and its roll-back), seeded sampling, the gap verifier, the sampler's ban mask (`constrain.ts`), the gap format (`gapformat.ts`), a page's gaps with one cache (`page.ts`), the worker and its client (`worker.ts`), the loader (`load.ts`), the benchmarks |
| `scripts/model-sample.ts`, `model-bench.ts`, `model-bench.html` | `npm run model:sample`, `npm run model:bench`, and the browser bench (main thread and worker) |
| `scripts/model-probe.ts` | the pretrained model tried as a gap-filler: verifier pass rate, and how much is recalled |

Gitignored and rebuilt by the steps below: `model/.venv/`, `model/checkpoints/`,
`model/data/raw/`, `model/data/*.txt`, `model/data/*.bin`, `model/runs/*.log`.
The scripts read the export from `model/export/`; `--model DIR` (or
`MODEL_DIR=DIR`) reads another.

## Setup (once)

The Mac's system Python (3.9.6) is enough: PyTorch 2.8.0 still ships an arm64
wheel for 3.9, with MPS. Nothing is installed outside `model/.venv`.

```sh
/usr/bin/python3 -m venv model/.venv
model/.venv/bin/pip install --upgrade pip
model/.venv/bin/pip install -r model/requirements.txt
```

## Train and export, from nothing

From the repo root. Every step is deterministic except training itself.

```sh
# 1. The corpus (about 75 s): model/data/<source>.{train,val}.txt for goldens, cards, bible, pd
#    (the public domain) and nights (deduped), corpus.json, raw/.
npm run model:corpus

# 2. The tokenizer (about 5 s), and the fixtures the TypeScript tests check.
model/.venv/bin/python model/tokenizer.py train --vocab 6000
model/.venv/bin/python model/tokenizer.py parity
model/.venv/bin/python model/gapformat.py parity

# 3. Encode and mix: model/data/stage1.bin (the public domain), stage2.bin (the game mix, the
#    goldens and the bible repeated to 15% of it), <source>.val.bin, tokens.json.
model/.venv/bin/python model/prepare.py

# 4. Pretrain in two stages, each under 20 minutes on MPS: plain period prose, then the game mix.
model/.venv/bin/python model/train.py --name pd1 --data stage1 --select pd --dropout 0.2 --lr 1e-3 --min-lr 1e-4 --warmup 100 --iters 1500 --eval-every 100 --patience 5
model/.venv/bin/python model/train.py --name mix1 --data stage2 --init model/checkpoints/pd1.pt --select goldens,bible,pd --dropout 0.2 --lr 6e-4 --min-lr 6e-5 --warmup 100 --iters 3000 --eval-every 100 --patience 6

# 5. Score it (bits a character, so it compares with phase 1's tokenizer), and export the best
#    checkpoint to model/export/ (and model/data/fwd-parity.json).
model/.venv/bin/python model/evaluate.py model/checkpoints/mix1.pt --json model/runs/mix1-eval-full.json
model/.venv/bin/python model/export.py model/checkpoints/mix1.pt

# 6. Read it, time it, test it, and try it as a gap-filler.
npm run model:sample
npm run model:bench
npx vitest run --minWorkers=1 --maxWorkers=3 test/model
npx tsx scripts/model-probe.ts --n 400 --show 30 [--constrain]
```

The variants in docs/50 §7 are the same steps with `npm run model:corpus -- --cap 2 --out DIR`
(two copies of each engine sentence; `--cap 3` three) and
`model/prepare.py --nights-train DIR/nights.train.txt [--cards-repeat 3] --stage2-name stage2c2`,
then `train.py --data stage2c2`.

The browser's numbers: `npm run dev`, open `/scripts/model-bench.html`, wait for
the title to say "done". The page runs the same benchmarks as `model:bench` on
its main thread, then writes eight pages in a Web Worker through `GapWorker`
(prefetch, take), and prints three seeded samples, which read exactly as the
first three of `model:sample` (the sampling is seeded, and the forward pass is
the same code).

### House rules for training on this Mac

`train.py` keeps them by itself: four CPU threads; MPS for the matmuls; it
waits while the one-minute load average is above 6 before it starts; it stops
at `--minutes` (18 by default, under the 20-minute cap) or when the mean
held-out loss of the `--select` sources hasn't improved for `--patience` evals;
it keeps one fp16 checkpoint per run, the best of that mean (13 MB, with the
tokenizer in it); if the held-out loss blows up it goes back to the best weights
at half the learning rate. Don't run two trainings at once.

## The tokenizer

Character-level BPE, 6,000 ids: 64 specials (`<|eot|>` 0, `<|unk|>` 1,
`<|gap|>` 2, `<|sep|>` 3, `<|endgap|>` 4, then the gap format's slots, tiers,
place kinds and manners, 5–37, and 26 spare; docs/50 §8), the 104 characters of
the corpus plus printable ASCII, then 5,832 merges, trained on every training
line once. A space joins the word after it; a word keeps its apostrophes
("he’d", "Rafferty’s"); a digit is its own chunk; punctuation runs together
(`.”`). The rules are written out at the top of `model/tokenizer.py` and again
in `src/game/board/model/tokenizer.ts`; `test/model/tokenizer.test.ts` holds
them to the same ids on 500 held-out lines. 4.3 characters a token on the
engine's pages, 3.8 on the public domain.

## The export

`model/export/dashiell.bin` is every tensor back to back, each start aligned to
4 bytes. Matrices (the token and position embeddings, qkv, proj, up, down) are
int8 with one float32 scale per row; LayerNorm weights and biases are float32.
`model/export/dashiell.json` is the header: the config, the tokenizer, each
tensor's name, dtype, shape and byte offsets, the binary's length and SHA-256,
and where it came from (the run, the step, the held-out loss in float and in
int8 on the nights and the public domain). `src/game/board/model/gpt.ts` reads
both and dequantizes once at load; `fetchModel(base)` fetches them from a
directory. It is outside `public/`, so `vite build` leaves it out of `dist/`.

## The checkpoint in `model/export/`

`mix1`, step 5,800: 6,326,784 parameters (6 layers, width 256, 4 heads, context
256, MLP 1,024, vocabulary 6,000, embeddings tied); 6.51 MB exported. Trained on
MPS at about 36,000 tokens a second, batch 32 × 256, AdamW (0.9, 0.95), weight
decay 0.1, residual dropout 0.2:

| run | data | from | rate | steps | minutes | held-out loss |
|---|---|---|---|---|---|---|
| pd1 | stage 1 | scratch | 1e-3 → 1e-4 | 0–4,700 | 18.1 | public domain 8.73 → 4.38 (900) → 4.23 (1,500) → 4.05 |
| mix1 | stage 2 | pd1 | 6e-4 → 6e-5 | 4,700–6,400 | 6.6 | goldens, bible, public domain: 4.84 → 3.977 (5,800, best) |
| mix2 | stage 2 | mix1 | 1.5e-4 → 1.5e-5 | 5,800–6,700 | 3.6 | 3.962; the goldens rising, dropped |
| mix4 | stage 2, two copies | pd1 | 6e-4 → 6e-5 | 4,700–7,600 | 11.2 | 3.846 (7,000) |
| mix3 | stage 2, three copies, cards ×3 | pd1 | 6e-4 → 6e-5 | 4,700–9,400 | 18.0 | 3.788 (9,000) |

The curves are in `model/runs/*.jsonl`; phase 1's (`lm1`, `lm2`, `lm3`,
`explore-*`) are kept. What the losses mean, the probe, thirty gaps read and the
speed are in docs/50 §7: the model no longer recites the cards (98% of its gaps
recalled → 14%), and scores unseen prose better than phase 1, but what it writes
when it isn't recalling is mostly not sense.
