"""
docs/50 §2 and §7: what the held-out loss means, source by source.

  python model/evaluate.py model/checkpoints/<run>.pt [--json model/runs/<run>-eval.json]
      [--tokenizer path] [--train-text file ...] [--exclude-train file ...]

Scores the held-out lines of every source (model/data/<source>.val.txt: the
held-out nights, cards, bible lines, golden sections and public-domain chunks),
each line whole, from <|eot|>, through a sliding window when it is longer than
the context (each token scored once, with at least half a context behind it).
Two numbers a source:

  - **loss a token** (nats), the number train.py logs;
  - **bits a character**, the same thing per character of text, which is the
    number to compare between two models with different tokenizers (phase 1's
    and phase 2a's).

And **novel sentences**: held-out sentences that appear nowhere in the
training text (`--train-text`, default every model/data/<source>.train.txt;
give phase 1's and phase 2a's both, and both models are scored on the same
sentences), each scored after the text before it on its page (up to 150
tokens). This is the number that says whether the model writes, rather than
recalls.

`--exclude-train` drops held-out lines that are lines of the given training
text (phase 1 trained on most of today's held-out goldens, so its number on
them is only fair on the ones it never saw). The checkpoint's own tokenizer is
used when it carries one (phase 2a's do); else `--tokenizer`, else
model/tokenizer.json.
"""

import argparse
import json
import math
import os

import numpy as np
import torch
from torch.nn import functional as F

from gpt import GPT, Config
from tokenizer import DATA, EOT, SOURCES, TOKENIZER_PATH, Tokenizer, read_lines

ABBR = ("Mr.", "Mrs.", "Ms.", "Dr.", "St.", "Jr.", "Sr.", "Mt.", "Messrs.")


def sentences(par):
    """The sentences of a paragraph, as src/game/board/model/verifier.ts `sentencesOf` splits them."""
    out, cur = [], []
    for w in par.split(" "):
        cur.append(w)
        end = w.endswith((".", "!", "?", ".”", "!”", "?”", ".’", "!’", "?’", '."'))
        bare = w.lstrip("“‘(")
        if end and not (bare in ABBR or (len(bare) == 2 and bare[0].isupper() and bare[1] == ".")):
            out.append(" ".join(cur))
            cur = []
    if cur:
        out.append(" ".join(cur))
    return [s for s in out if s.strip()]


def load_tokenizer(ck, override):
    if override:
        return Tokenizer.load(override)
    if "tokenizer" in ck:
        t = ck["tokenizer"]
        return Tokenizer(t["chars"], t["merges"])
    return Tokenizer.load(TOKENIZER_PATH)


@torch.no_grad()
def score_windows(model, windows, batch=32):
    """windows: [(ids, n_scored)] — the summed NLL of the last n_scored tokens of each, after the rest."""
    out = [0.0] * len(windows)
    order = sorted(range(len(windows)), key=lambda i: len(windows[i][0]))
    for b in range(0, len(order), batch):
        idx = order[b : b + batch]
        L = max(len(windows[i][0]) for i in idx) - 1
        x = torch.zeros((len(idx), L), dtype=torch.long)
        y = torch.full((len(idx), L), -1, dtype=torch.long)
        for r, i in enumerate(idx):
            ids, n = windows[i]
            T = len(ids) - 1
            x[r, :T] = torch.tensor(ids[:-1])
            tgt = torch.tensor(ids[1:])
            mask = torch.full((T,), -1, dtype=torch.long)
            mask[T - n :] = tgt[T - n :]
            y[r, :T] = mask
        logits, _ = model(x)
        nll = F.cross_entropy(logits.reshape(-1, logits.size(-1)), y.reshape(-1), ignore_index=-1, reduction="none").view(len(idx), L)
        for r, i in enumerate(idx):
            out[i] = float(nll[r].sum())
    return out


def line_windows(ids, ctx):
    """A whole line after <|eot|>, cut into windows of the context: each token scored once."""
    full = [EOT] + ids
    if len(full) <= ctx + 1:
        return [(full, len(ids))]
    wins = [(full[: ctx + 1], ctx)]
    pos = ctx + 1  # the next token to score
    half = ctx // 2
    while pos < len(full):
        n = min(half, len(full) - pos)
        start = pos + n - (ctx + 1)
        wins.append((full[start : pos + n], n))
        pos += n
    return wins


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("checkpoint")
    ap.add_argument("--json", default=None)
    ap.add_argument("--tokenizer", default=None)
    ap.add_argument("--train-text", nargs="*", default=None, help="the training text novel sentences are novel to (default: model/data/*.train.txt)")
    ap.add_argument("--exclude-train", nargs="*", default=[], help="drop held-out lines that are lines of these files")
    ap.add_argument("--max-novel", type=int, default=2000)
    a = ap.parse_args()
    torch.set_num_threads(4)
    ck = torch.load(a.checkpoint, map_location="cpu")
    cfg = Config(**ck["config"])
    cfg.dropout = 0.0
    model = GPT(cfg)
    model.load_state_dict({k: v.float() for k, v in ck["model"].items()})
    model.eval()
    tok = load_tokenizer(ck, a.tokenizer)
    assert tok.size == cfg.vocab

    excluded = set()
    for f in a.exclude_train:
        excluded.update(read_lines(f))

    val = {}
    dropped = {}
    for s in SOURCES:
        p = os.path.join(DATA, s + ".val.txt")
        if not os.path.exists(p):
            continue
        ls = read_lines(p)
        keep = [l for l in ls if l not in excluded]
        dropped[s] = len(ls) - len(keep)
        val[s] = keep

    by = {}
    for s, lines in val.items():
        wins, owner = [], []
        for li, l in enumerate(lines):
            for w in line_windows(tok.encode(l), cfg.ctx):
                wins.append(w)
                owner.append(li)
        nll = score_windows(model, wins)
        toks = sum(n for _, n in wins)
        chars = sum(len(l) for l in lines)
        tot = sum(nll)
        by[s] = {
            "lines": len(lines),
            "excluded": dropped[s],
            "tokens": toks,
            "chars": chars,
            "loss": round(tot / max(1, toks), 4),
            "bits_per_char": round(tot / max(1, chars) / math.log(2), 4),
        }

    train_files = a.train_text if a.train_text is not None else [os.path.join(DATA, s + ".train.txt") for s in SOURCES]
    train_sents = set()
    for f in train_files:
        for line in read_lines(f):
            for par in line.split(" ¶ "):
                train_sents.update(sentences(par))
    novel = {}
    seen_sents = 0
    for s, lines in val.items():
        wins, chars = [], 0
        for line in lines:
            done = []
            for par in line.split(" ¶ "):
                ss = sentences(par)
                for i, sent in enumerate(ss):
                    seen_sents += 1
                    if sent in train_sents or len(sent.split()) < 4 or len(wins) >= a.max_novel:
                        continue
                    prefix = " ¶ ".join(done + [" ".join(ss[:i])]) if i else " ¶ ".join(done)
                    ctx = [EOT] + (tok.encode(prefix)[-150:] if prefix else [])
                    text = (" " if prefix and i else (" ¶ " if prefix else "")) + sent
                    target = tok.encode(text)
                    w = (ctx + target)[-(cfg.ctx + 1) :]
                    n = min(len(target), len(w) - 1)
                    # A sentence longer than the context is scored on its last ctx tokens; its characters likewise.
                    wins.append((w, n))
                    chars += len(tok.decode(target[len(target) - n :])) if n < len(target) else len(text)
                done.append(par)
        wins = wins[: a.max_novel]
        if not wins:
            continue
        nll = score_windows(model, wins)
        toks = sum(n for _, n in wins)
        novel[s] = {"sentences": len(wins), "tokens": toks, "loss": round(sum(nll) / toks, 4), "bits_per_char": round(sum(nll) / max(1, chars) / math.log(2), 4)}
    nt = sum(v["tokens"] for v in novel.values())
    res = {
        "checkpoint": os.path.basename(a.checkpoint),
        "step": ck.get("step"),
        "tokenizer": a.tokenizer or ("checkpoint" if "tokenizer" in ck else "model/tokenizer.json"),
        "by_source": by,
        "novel_sentences": {
            "train_text": [os.path.relpath(f) for f in train_files],
            "by_source": novel,
            "all": {
                "sentences": sum(v["sentences"] for v in novel.values()),
                "loss": round(sum(v["loss"] * v["tokens"] for v in novel.values()) / max(1, nt), 4),
            },
        },
    }
    print(json.dumps(res, indent=2))
    if a.json:
        with open(a.json, "w") as f:
            json.dump(res, f, indent=2)
            f.write("\n")


if __name__ == "__main__":
    main()
