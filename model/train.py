"""
docs/50 §2 and §7: pretrain the tiny model as a language model on the corpus.

  python model/train.py --name pd1 --data stage1 --select pd [--layers 6] [--minutes 18]
  python model/train.py --name mix1 --data stage2 --init model/checkpoints/pd1.pt --select goldens,bible,pd

Two stages (docs/50 §7): stage 1 is plain period prose (model/data/stage1.bin),
stage 2 the game mix (stage2.bin), both written by model/prepare.py. Every eval
scores each source's held-out lines on its own (model/data/<source>.val.bin,
the same windows every time) and logs them all; the run keeps the checkpoint
with the best mean over the --select sources, and stops when that mean hasn't
improved for --patience evals.

House rules for this Mac (M1 Pro, 16 GB, shared with other work):
  - four CPU threads (torch.set_num_threads(4)); MPS for the matmuls when it's there;
  - waits while the 1-minute load average (`uptime`) is above 6, before it starts;
  - stops by itself at --minutes (default 18, under the 20-minute cap), or when
    the held-out loss hasn't improved for --patience evals (it has flattened);
  - keeps one small checkpoint per run, the best held-out loss, in fp16
    (model/checkpoints/<name>.pt, gitignored), and logs every eval to
    model/runs/<name>.jsonl (committed: the training curve).
"""

import argparse
import json
import math
import os
import re
import subprocess
import time

import numpy as np
import torch

from gpt import GPT, Config
from tokenizer import SOURCES

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
CKPT = os.path.join(HERE, "checkpoints")
RUNS = os.path.join(HERE, "runs")


def load1():
    out = subprocess.run(["uptime"], capture_output=True, text=True).stdout
    m = re.search(r"load averages?:\s*([\d.]+)", out)
    return float(m.group(1)) if m else 0.0


def wait_for_quiet(limit=6.0):
    while True:
        l = load1()
        if l <= limit:
            print("load %.2f, starting" % l, flush=True)
            return
        print("load %.2f > %.1f, waiting 30 s" % (l, limit), flush=True)
        time.sleep(30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--data", default="stage2", help="the training stream: model/data/<data>.bin (stage1, stage2)")
    ap.add_argument("--select", default="goldens,bible,pd", help="the held-out sources whose mean loss picks the checkpoint and stops the run")
    ap.add_argument("--eval-windows", type=int, default=384, help="at most this many context windows of each source's held-out lines")
    ap.add_argument("--layers", type=int, default=6)
    ap.add_argument("--width", type=int, default=256)
    ap.add_argument("--heads", type=int, default=4)
    ap.add_argument("--ctx", type=int, default=256)
    ap.add_argument("--dropout", type=float, default=0.1)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--min-lr", type=float, default=1e-4)
    ap.add_argument("--warmup", type=int, default=200)
    ap.add_argument("--iters", type=int, default=4400, help="this run's cosine schedule, in steps (about 18 minutes on MPS)")
    ap.add_argument("--weight-decay", type=float, default=0.1)
    ap.add_argument("--eval-every", type=int, default=250)
    ap.add_argument("--eval-batches", type=int, default=40)
    ap.add_argument("--patience", type=int, default=6)
    ap.add_argument("--minutes", type=float, default=18.0)
    ap.add_argument("--init", default=None, help="a checkpoint to continue from (its config wins)")
    ap.add_argument("--device", default=None)
    ap.add_argument("--no-wait", action="store_true")
    a = ap.parse_args()

    torch.set_num_threads(4)
    torch.manual_seed(1337)
    np.random.seed(1337)
    if not a.no_wait:
        wait_for_quiet()
    device = a.device or ("mps" if torch.backends.mps.is_available() else "cpu")

    train = np.memmap(os.path.join(DATA, a.data + ".bin"), dtype=np.uint16, mode="r")
    vals = {}
    for s in SOURCES:
        p = os.path.join(DATA, s + ".val.bin")
        if os.path.exists(p) and os.path.getsize(p) > 0:
            vals[s] = np.fromfile(p, dtype=np.uint16)
    select = [s for s in a.select.split(",") if s]
    assert all(s in vals for s in select), "no held-out lines for %s" % select

    if a.init:
        ck = torch.load(a.init, map_location="cpu")
        cfg = Config(**ck["config"])
        cfg.dropout = a.dropout
        model = GPT(cfg)
        model.load_state_dict({k: v.float() for k, v in ck["model"].items()})
        step0 = ck.get("step", 0)
    else:
        cfg = Config(vocab=6000, ctx=a.ctx, layers=a.layers, heads=a.heads, width=a.width, dropout=a.dropout)
        model = GPT(cfg)
        step0 = 0
    with open(os.path.join(HERE, "tokenizer.json"), encoding="utf-8") as f:
        tj = json.load(f)
    if a.init and "tokenizer" in ck:
        same = ck["tokenizer"]["chars"] == tj["chars"] and ck["tokenizer"]["merges"] == tj["merges"]
        assert same, "the checkpoint was trained with another tokenizer"
    cfg.vocab = len(tj["specials"]) + len(tj["chars"]) + len(tj["merges"])
    assert model.tok.weight.shape[0] == cfg.vocab, "the tokenizer and the model disagree on the vocabulary"
    model.to(device)
    opt = model.optimizer(a.lr, a.weight_decay)
    n_params = model.params()
    print("%s: %d params (%.2fM), %s, device %s, %s: %d train tokens; held out %s" % (a.name, n_params, n_params / 1e6, cfg.dict(), device, a.data, len(train), {k: len(v) for k, v in vals.items()}), flush=True)

    def batch(data, rng=np.random):
        ix = rng.randint(0, len(data) - cfg.ctx - 1, size=a.batch)
        x = torch.from_numpy(np.stack([data[i : i + cfg.ctx].astype(np.int64) for i in ix]))
        y = torch.from_numpy(np.stack([data[i + 1 : i + 1 + cfg.ctx].astype(np.int64) for i in ix]))
        return x.to(device), y.to(device)

    # Each source's held-out stream cut into whole windows, the same every eval (spread evenly over the
    # stream when there are more than --eval-windows), so the curve is comparable step to step.
    vbatches = {}
    for s, v in vals.items():
        n = max(1, (len(v) - 1) // cfg.ctx)
        starts = [i * cfg.ctx for i in range(n)] if (len(v) - 1) >= cfg.ctx else [0]
        if len(starts) > a.eval_windows:
            starts = [starts[int(j * len(starts) / a.eval_windows)] for j in range(a.eval_windows)]
        T = min(cfg.ctx, len(v) - 1)
        xs = np.stack([v[i : i + T].astype(np.int64) for i in starts])
        ys = np.stack([v[i + 1 : i + 1 + T].astype(np.int64) for i in starts])
        vbatches[s] = [(torch.from_numpy(xs[j : j + a.batch]).to(device), torch.from_numpy(ys[j : j + a.batch]).to(device)) for j in range(0, len(starts), a.batch)]

    @torch.no_grad()
    def evaluate():
        model.eval()
        per = {}
        for s, bs in vbatches.items():
            tot, n = 0.0, 0
            for x, y in bs:
                tot += model(x, y)[1].item() * x.numel()
                n += x.numel()
            per[s] = tot / n
        tr = [model(*batch(train))[1].item() for _ in range(a.eval_batches // 2)]
        model.train()
        return float(np.mean(tr)), float(np.mean([per[s] for s in select])), per

    def lr_at(it):
        if it < a.warmup:
            return a.lr * (it + 1) / a.warmup
        r = min(1.0, (it - a.warmup) / max(1, a.iters - a.warmup))
        return a.min_lr + 0.5 * (1 + math.cos(math.pi * r)) * (a.lr - a.min_lr)

    os.makedirs(CKPT, exist_ok=True)
    os.makedirs(RUNS, exist_ok=True)
    log = open(os.path.join(RUNS, a.name + ".jsonl"), "w")
    log.write(json.dumps({"run": a.name, "params": n_params, "config": cfg.dict(), "device": device, "args": vars(a), "train_tokens": len(train), "val_tokens": {k: len(v) for k, v in vals.items()}}) + "\n")
    best = float("inf")
    best_state = None
    lr_scale = 1.0
    blowups = 0
    bad = 0
    t0 = time.time()
    model.train()
    it = 0
    while True:
        step = step0 + it
        if it % a.eval_every == 0:
            tr, vl, per = evaluate()
            mins = (time.time() - t0) / 60
            rec = {"step": step, "train": round(tr, 4), "val": round(vl, 4), "by_source": {k: round(v, 4) for k, v in per.items()}, "minutes": round(mins, 2), "lr": lr_at(it) * lr_scale, "load": load1()}
            log.write(json.dumps(rec) + "\n")
            log.flush()
            print("step %6d  train %.4f  held-out %.4f (%s)  %.1f min  load %.1f" % (step, tr, vl, " ".join("%s %.3f" % (k, v) for k, v in per.items()), mins, rec["load"]), flush=True)
            if not math.isfinite(vl) or (best_state is not None and vl > best + 1.0):
                # A blow-up (the first MPS run went from 0.46 to 4e5 between two evals): go back to
                # the best weights, a fresh optimizer, half the learning rate.
                blowups += 1
                print("held-out loss blew up (%.4g); back to the best weights at half the rate" % vl, flush=True)
                log.write(json.dumps({"step": step, "blowup": vl, "lr_scale": lr_scale / 2}) + "\n")
                if blowups > 3:
                    break
                model.load_state_dict({k: v.to(device) for k, v in best_state.items()})
                opt = model.optimizer(a.lr, a.weight_decay)
                lr_scale /= 2
                it += 1
                continue
            if vl < best - 1e-3:
                best = vl
                bad = 0
                best_state = {k: v.detach().to("cpu").clone() for k, v in model.state_dict().items()}
                sd = {k: v.to(dtype=torch.float16) for k, v in best_state.items()}
                torch.save({"config": cfg.dict(), "model": sd, "step": step, "val": vl, "val_by_source": per, "select": select, "data": a.data, "train": tr, "tokenizer": tj}, os.path.join(CKPT, a.name + ".pt"))
            else:
                bad += 1
            if bad >= a.patience:
                print("held-out loss flat for %d evals; stopping" % a.patience, flush=True)
                break
            if mins >= a.minutes:
                print("time's up (%.1f min)" % mins, flush=True)
                break
        for g in opt.param_groups:
            g["lr"] = lr_at(it) * lr_scale
        x, y = batch(train)
        _, loss = model(x, y)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        it += 1
    log.write(json.dumps({"done": True, "best_val": round(best, 4), "steps": step0 + it, "minutes": round((time.time() - t0) / 60, 2), "blowups": blowups}) + "\n")
    log.close()
    print("best held-out %.4f; checkpoint %s" % (best, os.path.join(CKPT, a.name + ".pt")))


if __name__ == "__main__":
    main()
