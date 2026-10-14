"""
docs/50 §2: encode the corpus for training.

  python model/prepare.py

Reads model/data/train.txt and val.txt (one page per line, from
`npx tsx scripts/model-corpus.ts`), encodes each line with model/tokenizer.json,
ends each with <|eot|>, and writes model/data/train.bin and val.bin (uint16)
and model/data/tokens.json (the counts).
"""

import json
import os
import sys

import numpy as np

from tokenizer import DATA, EOT, Tokenizer, read_lines


def encode_file(tok, name):
    lines = read_lines(os.path.join(DATA, name + ".txt"))
    ids = []
    for l in lines:
        ids.extend(tok.encode(l))
        ids.append(EOT)
    arr = np.array(ids, dtype=np.uint16)
    arr.tofile(os.path.join(DATA, name + ".bin"))
    chars = sum(len(l) + 1 for l in lines)
    return {
        "lines": len(lines),
        "tokens": int(arr.size),
        "chars": chars,
        "chars_per_token": round(chars / max(1, arr.size), 2),
        "unk": int((arr == 1).sum()),
    }


def main():
    tok = Tokenizer.load()
    assert tok.size < 65536
    stats = {"vocab": tok.size, "train": encode_file(tok, "train"), "val": encode_file(tok, "val")}
    with open(os.path.join(DATA, "tokens.json"), "w") as f:
        json.dump(stats, f, indent=2)
        f.write("\n")
    json.dump(stats, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
