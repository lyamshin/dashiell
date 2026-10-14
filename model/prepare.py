"""
docs/50 §2 and §7: encode the corpus, and mix the two training stages.

  python model/prepare.py [--golden-share 0.15]

Reads model/data/<source>.train.txt and <source>.val.txt (one page per line,
from `npx tsx scripts/model-corpus.ts`), encodes each line with
model/tokenizer.json, ends each with <|eot|>, and writes (uint16):

  model/data/<source>.val.bin   each source's held-out lines, for train.py's evals
  model/data/stage1.bin         stage 1, plain period prose: the public-domain lines
  model/data/stage2.bin         stage 2, the game mix: every training line of every
                                source once (the deduped nights, the cards, the
                                public domain again so the first stage isn't
                                forgotten), and the goldens and the bible repeated
                                k times, k chosen so they are --golden-share of
                                the stage's tokens. Lines are shuffled together
                                (seeded), so a batch draws from all of them.

and model/data/tokens.json (the counts, each source's share of each stage).
"""

import argparse
import json
import os
import sys

import numpy as np

from tokenizer import DATA, EOT, SOURCES, Tokenizer, read_lines


def encode_lines(tok, lines):
    out = []
    for l in lines:
        ids = tok.encode(l)
        ids.append(EOT)
        out.append(ids)
    return out


def write(name, seqs):
    arr = np.array([i for s in seqs for i in s], dtype=np.uint16)
    arr.tofile(os.path.join(DATA, name + ".bin"))
    return int(arr.size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--golden-share", type=float, default=0.15, help="the goldens' and the bible's share of stage 2's tokens")
    ap.add_argument("--seed", type=int, default=50)
    ap.add_argument("--nights-train", default=None, help="another nights.train.txt (a dedupe experiment, docs/50 §7)")
    ap.add_argument("--cards-repeat", type=int, default=1, help="the cards this many times in stage 2")
    ap.add_argument("--stage2-name", default="stage2")
    a = ap.parse_args()
    tok = Tokenizer.load()
    assert tok.size < 65536
    stats = {"vocab": tok.size, "sources": {}, "stage1": {}, "stage2": {}}
    train = {}
    for s in SOURCES:
        tl = read_lines(a.nights_train if (s == "nights" and a.nights_train) else os.path.join(DATA, s + ".train.txt"))
        vl = read_lines(os.path.join(DATA, s + ".val.txt"))
        train[s] = encode_lines(tok, tl)
        val = encode_lines(tok, vl)
        vt = write(s + ".val", val)
        tt = sum(len(x) for x in train[s])
        chars = sum(len(l) + 1 for l in tl)
        stats["sources"][s] = {
            "train_lines": len(tl),
            "train_tokens": tt,
            "val_lines": len(vl),
            "val_tokens": vt,
            "chars_per_token": round(chars / max(1, tt), 2),
            "unk": int(sum(x.count(1) for x in train[s])),
        }

    # Stage 1: the public domain, in its own order (a chunk follows the chunk before it in the book).
    n1 = write("stage1", train["pd"])
    stats["stage1"] = {"tokens": n1, "share": {"pd": 1.0}}

    # Stage 2: everything once, the designer's own prose k times.
    reps_of = lambda s: a.cards_repeat if s == "cards" else 1
    once = sum(reps_of(s) * sum(len(x) for x in train[s]) for s in SOURCES if s not in ("goldens", "bible"))
    gb = sum(len(x) for x in train["goldens"]) + sum(len(x) for x in train["bible"])
    # k·gb = share · (once + k·gb)  →  k = share·once / (gb·(1 − share))
    k = max(1, round(a.golden_share * once / (gb * (1 - a.golden_share))))
    seqs = []
    for s in SOURCES:
        reps = k if s in ("goldens", "bible") else reps_of(s)
        for _ in range(reps):
            seqs.extend((s, x) for x in train[s])
    rng = np.random.RandomState(a.seed)
    order = rng.permutation(len(seqs))
    n2 = write(a.stage2_name, [seqs[i][1] for i in order])
    share = {}
    for s in SOURCES:
        reps = k if s in ("goldens", "bible") else reps_of(s)
        share[s] = round(reps * sum(len(x) for x in train[s]) / n2, 4)
    stats["stage2"] = {"name": a.stage2_name, "tokens": n2, "golden_bible_repeats": k, "cards_repeats": a.cards_repeat, "share": share}
    with open(os.path.join(DATA, "tokens.json" if a.stage2_name == "stage2" else "tokens-%s.json" % a.stage2_name), "w") as f:
        json.dump(stats, f, indent=2)
        f.write("\n")
    json.dump(stats, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
