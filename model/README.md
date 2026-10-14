# The tiny model

docs/50, phase 1: a transformer trained from scratch on Dashiell's own pages,
small enough to ship with the book and run in plain TypeScript. Nothing in the
book uses it yet; phase 2 (the gap data and the fine-tune, after the
microplanner of docs/49) decides whether it ships.

## What's where

| | |
|---|---|
| `scripts/model-corpus.ts` | builds the corpus: goldens, cards, the bible, 2,000 engine nights → `model/data/` |
| `model/tokenizer.py` | the BPE tokenizer (training, encoding, the parity fixture) |
| `model/prepare.py` | encodes the corpus to `model/data/{train,val}.bin` |
| `model/gpt.py` | the network (nanoGPT-shaped) |
| `model/train.py` | pretraining, with this Mac's house rules |
| `model/evaluate.py` | held-out loss by source, and on sentences never seen in training |
| `model/export.py` | int8 export → `public/model/dashiell.{bin,json}`, plus the forward-pass fixture |
| `model/tokenizer.json` | the tokenizer (committed) |
| `model/data/corpus.json`, `tokens.json` | the corpus's counts (committed) |
| `model/data/tok-parity.jsonl`, `fwd-parity.json` | what Python gave, for the TypeScript tests (committed) |
| `model/runs/*.jsonl` | every training run's curve (committed) |
| `src/game/board/model/` | inference in TypeScript: tokenizer, forward pass with a KV cache, seeded sampling, the gap verifier, the benchmark |
| `scripts/model-sample.ts`, `model-bench.ts`, `model-bench.html` | `npm run model:sample`, `npm run model:bench`, and the browser bench |
| `scripts/model-probe.ts` | the pretrained model tried as a gap-filler: verifier pass rate, and how much is recalled |

Gitignored and rebuilt by the steps below: `model/.venv/`, `model/checkpoints/`,
`model/data/raw/`, `model/data/*.txt`, `model/data/*.bin`, `model/runs/*.log`.

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
# 1. The corpus (about 80 s): model/data/train.txt, val.txt, val.src, corpus.json, raw/.
npm run model:corpus

# 2. The tokenizer (about 10 s), and the 500 held-out lines the TypeScript test checks.
model/.venv/bin/python model/tokenizer.py train --vocab 6000
model/.venv/bin/python model/tokenizer.py parity

# 3. Encode: model/data/train.bin, val.bin, tokens.json.
model/.venv/bin/python model/prepare.py

# 4. Pretrain: two runs of under 20 minutes on MPS, the second annealing the first at a tenth
#    of the rate. (Restarting at 3e-4 instead, lm2, set the held-out loss back; see below.)
model/.venv/bin/python model/train.py --name lm1 --layers 6 --lr 1e-3 --warmup 200 --iters 4400 --minutes 18
model/.venv/bin/python model/train.py --name lm3 --init model/checkpoints/lm1.pt --lr 1e-4 --min-lr 1e-5 --warmup 50 --iters 4300 --patience 10 --minutes 18

# 5. Score it, and export the best checkpoint to public/model/ (and model/data/fwd-parity.json).
model/.venv/bin/python model/evaluate.py model/checkpoints/lm3.pt --json model/runs/lm3-eval.json
model/.venv/bin/python model/export.py model/checkpoints/lm3.pt

# 6. Read it, time it, test it, and try it as a gap-filler before phase 2.
npm run model:sample
npm run model:bench
npx vitest run --minWorkers=1 --maxWorkers=3 test/model
npx tsx scripts/model-probe.ts --n 200
```

The browser's number: `npm run dev`, open `/scripts/model-bench.html`, wait for
the title to say "done". The page runs the same benchmark as `model:bench` on
its main thread and prints three seeded samples, which read exactly as the
first three of `model:sample` (the sampling is seeded, and the forward pass is
the same code).

### House rules for training on this Mac

`train.py` keeps them by itself: four CPU threads; MPS for the matmuls; it
waits while the one-minute load average is above 6 before it starts; it stops
at `--minutes` (18 by default, under the 20-minute cap) or when the held-out
loss hasn't improved for six evals; it keeps one fp16 checkpoint per run, the
best held-out loss (13 MB); if the held-out loss blows up it goes back to the
best weights at half the learning rate. Don't run two trainings at once.

## The tokenizer

Character-level BPE, 6,000 ids: 64 specials (`<|eot|>` 0, `<|unk|>` 1,
`<|gap|>` 2, `<|sep|>` 3, the rest reserved for phase 2's slot, tier, kind and
manner), the 107 characters of the corpus plus printable ASCII, then 5,829
merges. A space joins the word after it; a word keeps its apostrophes ("he’d",
"Rafferty’s"); a digit is its own chunk; punctuation runs together (`.”`).
The rules are written out at the top of `model/tokenizer.py` and again in
`src/game/board/model/tokenizer.ts`; `test/model/tokenizer.test.ts` holds them
to the same ids on 500 held-out lines. The corpus's vocabulary is small (under
5,000 distinct words), so nearly every word is one token: 4.3 characters a token.

## The export

`public/model/dashiell.bin` is every tensor back to back, each start aligned to
4 bytes. Matrices (the token and position embeddings, qkv, proj, up, down) are
int8 with one float32 scale per row; LayerNorm weights and biases are float32.
`public/model/dashiell.json` is the header: the config, the tokenizer, each
tensor's name, dtype, shape and byte offsets, the binary's length and SHA-256,
and where it came from (the run, the step, the held-out loss in float and in
int8). `src/game/board/model/gpt.ts` reads both and dequantizes once at load.

## The checkpoint in `public/model/`

`lm3`, step 9,000: 6,326,784 parameters (6 layers, width 256, 4 heads, context
256, MLP 1,024, vocabulary 6,000, embeddings tied); 6.52 MB exported. Trained on
MPS at about 38,000 tokens a second, batch 32 × 256, AdamW (0.9, 0.95), weight
decay 0.1, residual dropout 0.1:

| run | from | rate | steps | minutes | held-out loss |
|---|---|---|---|---|---|
| lm1 | scratch | 1e-3 → 1e-4 | 0–5,000 | 18.5 | 8.73 → 1.18 (500) → 0.40 (2,000) → 0.32 (4,000) → 0.312 |
| lm2 | lm1 | 3e-4, warmed up again | 5,000–6,500 | 5.6 | rose to 0.328, back to 0.314; stopped flat, dropped |
| lm3 | lm1 | 1e-4 → 1e-5 | 5,000–10,000 | 18.7 | 0.312 → 0.300 (8,000) → 0.299 (9,000) → 0.298: flat |

Held-out loss in float and in int8 is the same (0.2977). The curves are in
`model/runs/`; `explore-pre1` and `explore-pre2` are the first runs, on the
corpus before the goldens' notes were cut and with dropout inside attention,
which blew up on MPS at step 2,250 (0.46 to 4e5 between two evals).

What the loss means is in `model/runs/lm3-eval.json`: held-out nights 0.25 a
token, but sentences the model never saw score 1.01 overall, and the
designer's fresh prose (the goldens' held-out sections, the bible's) about 4.5,
a perplexity near 90. It has the engine's pages by heart, not the voice in
general. docs/50 §6 has the read.
