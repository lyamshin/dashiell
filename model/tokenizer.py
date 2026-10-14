"""
docs/50 §2: the tokenizer. Character-level BPE, about 6,000 tokens.

The same rules are written again in TypeScript in
`src/game/board/model/tokenizer.ts`; `test/model-tokenizer.test.ts` checks the two
give the same ids on 500 held-out lines (`model/data/tok-parity.jsonl`, written
by `python model/tokenizer.py parity`). Change one, change the other.

Ids:
  0 .. 63            special tokens (0 <|eot|>, 1 <|unk|>, 2 <|gap|>, 3 <|sep|>,
                     the rest reserved for phase 2's slot, tier, kind and manner)
  64 .. 64+C-1       the base characters, in `chars` order
  64+C ..            one per merge, in rank order

Chunks (the pre-tokenizer), scanning a string by code point:
  - a space joins the chunk after it, unless the next character is a space or
    the end, when it is a chunk of its own;
  - a letter starts a word: letters, then any number of (apostrophe, letters),
    where an apostrophe is ' or ’; so "he’d" and "Rafferty’s" are one chunk;
  - a digit is a chunk of one digit;
  - anything else starts a run of characters that are neither letters, digits
    nor spaces (“ ”. , — ¶ and so on).
  A letter is A–Z, a–z, or U+00C0–U+024F except × and ÷.

Inside a chunk: characters (a character not in `chars` is <|unk|>, which never
merges), then the lowest-ranked adjacent pair is merged, every occurrence from
left to right, until no adjacent pair has a rank.

Usage:
  python model/tokenizer.py train  [--vocab 6000]   train on model/data/train.txt → model/tokenizer.json
  python model/tokenizer.py parity [--n 500]        write model/data/tok-parity.jsonl from val.txt
"""

import argparse
import heapq
import json
import os
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
TOKENIZER_PATH = os.path.join(HERE, "tokenizer.json")

N_SPECIAL = 64
SPECIALS = ["<|eot|>", "<|unk|>", "<|gap|>", "<|sep|>"] + ["<|r%d|>" % i for i in range(4, N_SPECIAL)]
EOT, UNK, GAP, SEP = 0, 1, 2, 3
APOSTROPHES = ("'", "’")


def is_letter(c):
    o = ord(c)
    return (65 <= o <= 90) or (97 <= o <= 122) or (0xC0 <= o <= 0x24F and o != 0xD7 and o != 0xF7)


def is_digit(c):
    return "0" <= c <= "9"


def chunks(text):
    """The pre-tokenizer. Mirrors `chunks` in tokenizer.ts exactly."""
    out = []
    n = len(text)
    i = 0
    while i < n:
        start = i
        if text[i] == " ":
            if i + 1 >= n or text[i + 1] == " ":
                out.append(" ")
                i += 1
                continue
            i += 1
        c = text[i]
        if is_letter(c):
            i += 1
            while i < n:
                if is_letter(text[i]):
                    i += 1
                elif text[i] in APOSTROPHES and i + 1 < n and is_letter(text[i + 1]):
                    i += 2
                else:
                    break
        elif is_digit(c):
            i += 1
        else:
            i += 1
            while i < n and not is_letter(text[i]) and not is_digit(text[i]) and text[i] != " ":
                i += 1
        out.append(text[start:i])
    return out


class Tokenizer:
    def __init__(self, chars, merges):
        self.chars = list(chars)
        self.merges = [tuple(m) for m in merges]
        base = N_SPECIAL
        self.char_id = {c: base + i for i, c in enumerate(self.chars)}
        self.rank = {m: r for r, m in enumerate(self.merges)}
        self.vocab = list(SPECIALS) + list(self.chars) + [a + b for a, b in self.merges]
        self.token_id = {}
        for i, s in enumerate(self.vocab):
            if i >= N_SPECIAL and s not in self.token_id:
                self.token_id[s] = i
        # A merged string's id is its merge's, so two merges that make the same string
        # can't happen: training never adds a pair whose string is already a token.
        self.merge_id = {m: N_SPECIAL + len(self.chars) + r for r, m in enumerate(self.merges)}
        self.cache = {}

    @property
    def size(self):
        return len(self.vocab)

    @staticmethod
    def load(path=TOKENIZER_PATH):
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return Tokenizer(d["chars"], d["merges"])

    def save(self, path=TOKENIZER_PATH):
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"version": 1, "specials": SPECIALS, "chars": self.chars, "merges": [list(m) for m in self.merges]}, f, ensure_ascii=False)
            f.write("\n")

    def encode_chunk(self, chunk):
        hit = self.cache.get(chunk)
        if hit is not None:
            return hit
        syms = [c if c in self.char_id else None for c in chunk]
        while len(syms) > 1:
            best = None
            best_rank = None
            for k in range(len(syms) - 1):
                a, b = syms[k], syms[k + 1]
                if a is None or b is None:
                    continue
                r = self.rank.get((a, b))
                if r is not None and (best_rank is None or r < best_rank):
                    best_rank = r
                    best = (a, b)
            if best is None:
                break
            merged = []
            k = 0
            while k < len(syms):
                if k + 1 < len(syms) and syms[k] == best[0] and syms[k + 1] == best[1]:
                    merged.append(best[0] + best[1])
                    k += 2
                else:
                    merged.append(syms[k])
                    k += 1
            syms = merged
        ids = [UNK if s is None else self.token_id[s] for s in syms]
        if len(self.cache) < 200000:
            self.cache[chunk] = ids
        return ids

    def encode(self, text):
        out = []
        for ch in chunks(text):
            out.extend(self.encode_chunk(ch))
        return out

    def decode(self, ids):
        return "".join(self.vocab[i] for i in ids if i >= N_SPECIAL)


def train(lines, vocab_size, min_count=2, log=sys.stderr):
    """Byte-pair merges over the chunk counts, with a lazy max-heap of pair counts."""
    words = Counter()
    for line in lines:
        for ch in chunks(line):
            words[ch] += 1
    char_counts = Counter()
    for w, n in words.items():
        for c in w:
            char_counts[c] += n
    chars = sorted(set(char_counts) | {chr(c) for c in range(32, 127)})
    n_merges = vocab_size - N_SPECIAL - len(chars)
    print("chunks: %d distinct, %d total; chars: %d; merges to learn: %d" % (len(words), sum(words.values()), len(chars), n_merges), file=log)

    seqs = [list(w) for w in words]
    counts = list(words.values())
    pair_count = defaultdict(int)
    where = defaultdict(set)
    for wi, s in enumerate(seqs):
        for k in range(len(s) - 1):
            p = (s[k], s[k + 1])
            pair_count[p] += counts[wi]
            where[p].add(wi)
    heap = [(-c, p) for p, c in pair_count.items()]
    heapq.heapify(heap)
    tokens = set(chars)
    merges = []
    while len(merges) < n_merges and heap:
        negc, p = heapq.heappop(heap)
        c = pair_count.get(p, 0)
        if c != -negc:
            if c > 0:
                heapq.heappush(heap, (-c, p))
            continue
        if c < min_count:
            break
        new = p[0] + p[1]
        if new in tokens:
            # Two different splits of one string: rank the first only, drop this pair for good.
            pair_count[p] = 0
            continue
        tokens.add(new)
        merges.append(p)
        touched = set()
        for wi in list(where[p]):
            s = seqs[wi]
            n = counts[wi]
            for k in range(len(s) - 1):
                q = (s[k], s[k + 1])
                pair_count[q] -= n
                touched.add(q)
            merged = []
            k = 0
            while k < len(s):
                if k + 1 < len(s) and s[k] == p[0] and s[k + 1] == p[1]:
                    merged.append(new)
                    k += 2
                else:
                    merged.append(s[k])
                    k += 1
            seqs[wi] = merged
            for k in range(len(merged) - 1):
                q = (merged[k], merged[k + 1])
                pair_count[q] += n
                where[q].add(wi)
                touched.add(q)
        for q in touched:
            if pair_count[q] > 0:
                heapq.heappush(heap, (-pair_count[q], q))
        if len(merges) % 1000 == 0:
            print("  %d merges, last %r (%d)" % (len(merges), new, c), file=log)
    return Tokenizer(chars, merges)


def read_lines(path):
    with open(path, encoding="utf-8") as f:
        return [l.rstrip("\n") for l in f if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["train", "parity"])
    ap.add_argument("--vocab", type=int, default=6000)
    ap.add_argument("--n", type=int, default=500)
    a = ap.parse_args()
    if a.cmd == "train":
        tok = train(read_lines(os.path.join(DATA, "train.txt")), a.vocab)
        tok.save()
        print("vocab %d → %s" % (tok.size, TOKENIZER_PATH))
    else:
        tok = Tokenizer.load()
        lines = read_lines(os.path.join(DATA, "val.txt"))
        # Every held-out source, spread evenly, plus lines that test the edges.
        step = max(1, len(lines) // a.n)
        pick = lines[::step][: a.n - 8]
        pick += [
            "",
            " ",
            "  two  spaces ",
            "Plain ASCII 1923, and 7 o'clock; don't.",
            "A word ’quoted’ and “doubled,” ¶ then café, naïve, Œuvre.",
            "Unknown chars: 中文 and \U0001F600 stay unk.",
            "tab\there\nnewline",
            "He’d’ve, Rafferty’s, lodgers’ — rock’n’roll.",
        ]
        out = os.path.join(DATA, "tok-parity.jsonl")
        with open(out, "w", encoding="utf-8") as f:
            for l in pick:
                f.write(json.dumps({"text": l, "ids": tok.encode(l)}, ensure_ascii=False) + "\n")
        print("%d lines → %s" % (len(pick), out))


if __name__ == "__main__":
    main()
