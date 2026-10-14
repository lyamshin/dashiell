"""
docs/50 §2: export a checkpoint to int8, one binary and a JSON header.

  python model/export.py model/checkpoints/<run>.pt [--out public/model]

Every matrix (the token and position embeddings, qkv, proj, up, down) is stored
as int8 with one float32 scale per row (symmetric: the row's largest |w| maps
to 127); the LayerNorm weights and biases stay float32. The header,
`dashiell.json`, carries the config, the tokenizer, and each tensor's name,
shape and byte offsets; the binary, `dashiell.bin`, is the tensors back to
back, each start aligned to 4 bytes. `src/game/board/model/gpt.ts` reads both.

It also writes `model/data/fwd-parity.json` (or, exporting anywhere but
public/model/, `fwd-parity.json` beside the export): a held-out line's ids and the
int8 model's logits after them, computed here in float32, for the TypeScript
forward pass to match (`test/model-gpt.test.ts`). And it reports the held-out
loss of the float weights and of the int8 ones, on the same batches.
"""

import argparse
import hashlib
import json
import os

import numpy as np
import torch

from gpt import GPT, Config
from tokenizer import DATA, HERE, Tokenizer, read_lines

ROOT = os.path.dirname(HERE)


def quant_rows(w):
    w = w.astype(np.float32)
    m = np.abs(w).max(axis=1)
    scale = np.where(m > 0, m / 127.0, 1.0).astype(np.float32)
    q = np.clip(np.round(w / scale[:, None]), -127, 127).astype(np.int8)
    return q, scale


def tensors_of(model):
    sd = {k: v.detach().float().cpu().numpy() for k, v in model.state_dict().items()}
    c = model.config
    out = [("tok", sd["tok.weight"], True), ("pos", sd["pos.weight"], True)]
    for i in range(c.layers):
        p = "blocks.%d." % i
        out += [
            ("b%d.ln1.w" % i, sd[p + "ln1.weight"], False),
            ("b%d.ln1.b" % i, sd[p + "ln1.bias"], False),
            ("b%d.qkv" % i, sd[p + "attn.qkv.weight"], True),
            ("b%d.proj" % i, sd[p + "attn.proj.weight"], True),
            ("b%d.ln2.w" % i, sd[p + "ln2.weight"], False),
            ("b%d.ln2.b" % i, sd[p + "ln2.bias"], False),
            ("b%d.up" % i, sd[p + "mlp.up.weight"], True),
            ("b%d.down" % i, sd[p + "mlp.down.weight"], True),
        ]
    out += [("ln_f.w", sd["ln_f.weight"], False), ("ln_f.b", sd["ln_f.bias"], False)]
    return out


def dequantized_state(model, packed):
    """The model's state dict with every int8 matrix replaced by its dequantized self."""
    names = {"tok": "tok.weight", "pos": "pos.weight"}
    for i in range(model.config.layers):
        p = "blocks.%d." % i
        names.update({"b%d.qkv" % i: p + "attn.qkv.weight", "b%d.proj" % i: p + "attn.proj.weight", "b%d.up" % i: p + "mlp.up.weight", "b%d.down" % i: p + "mlp.down.weight"})
    sd = {k: v.clone() for k, v in model.state_dict().items()}
    for name, (q, s) in packed.items():
        sd[names[name]] = torch.from_numpy(q.astype(np.float32) * s[:, None])
    return sd


@torch.no_grad()
def held_out_loss(model, ctx, n=40, batch=16):
    val = np.memmap(os.path.join(DATA, "val.bin"), dtype=np.uint16, mode="r")
    rng = np.random.RandomState(11)
    ix = rng.randint(0, len(val) - ctx - 1, size=n * batch)
    losses = []
    for b in range(n):
        idx = ix[b * batch : (b + 1) * batch]
        x = torch.from_numpy(np.stack([val[i : i + ctx].astype(np.int64) for i in idx]))
        y = torch.from_numpy(np.stack([val[i + 1 : i + 1 + ctx].astype(np.int64) for i in idx]))
        losses.append(model(x, y)[1].item())
    return float(np.mean(losses))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("checkpoint")
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "model"))
    ap.add_argument("--name", default="dashiell")
    a = ap.parse_args()
    torch.set_num_threads(4)

    ck = torch.load(a.checkpoint, map_location="cpu")
    cfg = Config(**ck["config"])
    cfg.dropout = 0.0
    model = GPT(cfg)
    model.load_state_dict({k: v.float() for k, v in ck["model"].items()})
    model.eval()
    tok = Tokenizer.load()
    assert tok.size == cfg.vocab

    blob = bytearray()
    entries = []
    packed = {}

    def align():
        while len(blob) % 4:
            blob.append(0)

    for name, w, quant in tensors_of(model):
        align()
        if quant:
            q, s = quant_rows(w)
            packed[name] = (q, s)
            off = len(blob)
            blob.extend(q.tobytes())
            align()
            soff = len(blob)
            blob.extend(s.astype("<f4").tobytes())
            entries.append({"name": name, "dtype": "int8", "shape": list(w.shape), "offset": off, "scales": soff})
        else:
            off = len(blob)
            blob.extend(w.astype("<f4").tobytes())
            entries.append({"name": name, "dtype": "f32", "shape": list(w.shape), "offset": off})
    align()

    with open(os.path.join(HERE, "tokenizer.json"), encoding="utf-8") as f:
        tj = json.load(f)
    run = os.path.splitext(os.path.basename(a.checkpoint))[0]
    float_loss = held_out_loss(model, cfg.ctx)
    qmodel = GPT(cfg)
    qmodel.load_state_dict(dequantized_state(model, packed))
    qmodel.eval()
    int8_loss = held_out_loss(qmodel, cfg.ctx)
    header = {
        "format": "dashiell-tiny-lm",
        "version": 1,
        "config": {k: getattr(cfg, k) for k in ("vocab", "ctx", "layers", "heads", "width")},
        "tokenizer": tj,
        "tensors": entries,
        "bytes": len(blob),
        "sha256": hashlib.sha256(bytes(blob)).hexdigest(),
        "trained": {"run": run, "step": ck.get("step"), "params": model.params(), "val_loss_float": round(float_loss, 4), "val_loss_int8": round(int8_loss, 4)},
    }
    os.makedirs(a.out, exist_ok=True)
    bin_path = os.path.join(a.out, a.name + ".bin")
    json_path = os.path.join(a.out, a.name + ".json")
    with open(bin_path, "wb") as f:
        f.write(bytes(blob))
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(header, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    # The forward-pass fixture: a held-out line, the int8 model's logits after it (float32 here).
    line = next(l for l in read_lines(os.path.join(DATA, "val.txt")) if len(tok.encode(l)) >= 100)
    ids = [0] + tok.encode(line)[:100]
    with torch.no_grad():
        logits = qmodel(torch.tensor([ids]))[0][0, -1].numpy()
        logits_mid = qmodel(torch.tensor([ids[:40]]))[0][0, -1].numpy()
    top = np.argsort(-logits)[:10]
    fixture = {
        "sha256": header["sha256"],
        "ids": ids,
        "top": [int(i) for i in top],
        "logits": [round(float(logits[i]), 5) for i in range(0, cfg.vocab, 37)],
        "stride": 37,
        "mid": 40,
        "logits_mid": [round(float(logits_mid[i]), 5) for i in range(0, cfg.vocab, 37)],
    }
    # The fixture goes with the export the tests read (public/model/); an export elsewhere keeps its own.
    default_out = os.path.abspath(a.out) == os.path.abspath(os.path.join(ROOT, "public", "model"))
    fixture_path = os.path.join(DATA if default_out else a.out, "fwd-parity.json")
    with open(fixture_path, "w", encoding="utf-8") as f:
        json.dump(fixture, f)
        f.write("\n")
    size = os.path.getsize(bin_path) + os.path.getsize(json_path)
    print(json.dumps({"bin": bin_path, "bin_bytes": os.path.getsize(bin_path), "json_bytes": os.path.getsize(json_path), "total_mb": round(size / 1e6, 2), **header["trained"]}, indent=2))


if __name__ == "__main__":
    main()
