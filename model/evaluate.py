"""
docs/50 §2: what the held-out loss means, source by source.

  python model/evaluate.py model/checkpoints/<run>.pt [--json model/runs/<run>-eval.json]

The corpus is repetitive: the engine deals the same cards night after night,
so a held-out night is mostly sentences the model has seen in other nights.
This splits the held-out loss three ways:

  - by source (nights, cards, bible, goldens), each line scored after <|eot|>
    (lines cut to the context);
  - **novel sentences**: held-out sentences that appear nowhere in training,
    each scored after the text before it on its page (up to 150 tokens). This
    is the number that says whether the model writes, rather than recalls.
"""

import argparse
import json
import math
import os
import re

import numpy as np
import torch
from torch.nn import functional as F

from gpt import GPT, Config
from tokenizer import DATA, EOT, Tokenizer, read_lines



def sentences(par):
    return [s for s in re.split(r"(?<=[.!?][”’]) +|(?<=[.!?]) +(?=[“A-Z])", par) if s.strip()]


@torch.no_grad()
def score(model, ctx_ids, target_ids):
    """Summed NLL of target_ids after ctx_ids (ctx_ids non-empty)."""
    ids = (ctx_ids + target_ids)[-model.config.ctx - 1 :]
    n_t = min(len(target_ids), len(ids) - 1)
    x = torch.tensor([ids[:-1]])
    logits, _ = model(x)
    lp = F.log_softmax(logits[0], dim=-1)
    tgt = torch.tensor(ids[1:])
    nll = -lp[torch.arange(len(tgt)), tgt]
    return float(nll[-n_t:].sum()), n_t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("checkpoint")
    ap.add_argument("--json", default=None)
    ap.add_argument("--max-novel", type=int, default=1500)
    a = ap.parse_args()
    torch.set_num_threads(4)
    ck = torch.load(a.checkpoint, map_location="cpu")
    cfg = Config(**ck["config"])
    cfg.dropout = 0.0
    model = GPT(cfg)
    model.load_state_dict({k: v.float() for k, v in ck["model"].items()})
    model.eval()
    tok = Tokenizer.load()

    val = read_lines(os.path.join(DATA, "val.txt"))
    src = read_lines(os.path.join(DATA, "val.src"))
    assert len(val) == len(src)
    by = {}
    for line, s in zip(val, src):
        ids = tok.encode(line)[: cfg.ctx - 1]
        nll, n = score(model, [EOT], ids)
        t = by.setdefault(s, [0.0, 0, 0])
        t[0] += nll
        t[1] += n
        t[2] += 1

    train_sents = set()
    for line in read_lines(os.path.join(DATA, "train.txt")):
        for par in line.split(" ¶ "):
            train_sents.update(sentences(par))
    novel_nll, novel_n, novel_count, novel_by = 0.0, 0, 0, {}
    seen_sents = 0
    for line, s in zip(val, src):
        pars = line.split(" ¶ ")
        done = []
        for par in pars:
            ss = sentences(par)
            for i, sent in enumerate(ss):
                seen_sents += 1
                prefix = " ¶ ".join(done + [" ".join(ss[:i])]) if i else " ¶ ".join(done)
                if sent not in train_sents and novel_count < a.max_novel and len(sent.split()) >= 4:
                    ctx = [EOT] + (tok.encode(prefix)[-150:] if prefix else [])
                    target = tok.encode((" " if prefix and i else (" ¶ " if prefix else "")) + sent)
                    nll, n = score(model, ctx, target)
                    novel_nll += nll
                    novel_n += n
                    novel_count += 1
                    t = novel_by.setdefault(s, [0.0, 0, 0])
                    t[0] += nll
                    t[1] += n
                    t[2] += 1
            done.append(par)

    res = {
        "checkpoint": os.path.basename(a.checkpoint),
        "step": ck.get("step"),
        "by_source": {k: {"lines": v[2], "tokens": v[1], "loss": round(v[0] / max(1, v[1]), 4)} for k, v in sorted(by.items())},
        "all": round(sum(v[0] for v in by.values()) / max(1, sum(v[1] for v in by.values())), 4),
        "novel_sentences": {
            "sentences": novel_count,
            "of": seen_sents,
            "tokens": novel_n,
            "loss": round(novel_nll / max(1, novel_n), 4),
            "perplexity": round(math.exp(novel_nll / max(1, novel_n)), 2),
            "by_source": {k: {"sentences": v[2], "loss": round(v[0] / max(1, v[1]), 4)} for k, v in sorted(novel_by.items())},
        },
    }
    print(json.dumps(res, indent=2))
    if a.json:
        with open(a.json, "w") as f:
            json.dump(res, f, indent=2)
            f.write("\n")


if __name__ == "__main__":
    main()
