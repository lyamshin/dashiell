"""
docs/50 §2: the model. A nanoGPT-shaped decoder, small.

Pre-norm blocks (LayerNorm with weight and bias), causal self-attention, a GELU
(tanh form) MLP four times the width, learned positions, the output head tied
to the token embedding, no bias on any Linear. `src/game/board/model/gpt.ts`
runs exactly this forward pass on the int8 export; change one, change the other.
"""

import math
from dataclasses import asdict, dataclass

import torch
import torch.nn as nn
from torch.nn import functional as F


@dataclass
class Config:
    vocab: int = 6000
    ctx: int = 256
    layers: int = 6
    heads: int = 4
    width: int = 256
    dropout: float = 0.1

    def dict(self):
        return asdict(self)


class Attention(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.heads = c.heads
        self.qkv = nn.Linear(c.width, 3 * c.width, bias=False)
        self.proj = nn.Linear(c.width, c.width, bias=False)
        self.resid = nn.Dropout(c.dropout)

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        q = q.view(B, T, self.heads, C // self.heads).transpose(1, 2)
        k = k.view(B, T, self.heads, C // self.heads).transpose(1, 2)
        v = v.view(B, T, self.heads, C // self.heads).transpose(1, 2)
        # No dropout inside attention: the first long run on MPS blew up (loss 0.46 to 4e5 in 250
        # steps) with it on; the residual dropout stays.
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.resid(self.proj(y))


class MLP(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.up = nn.Linear(c.width, 4 * c.width, bias=False)
        self.down = nn.Linear(4 * c.width, c.width, bias=False)
        self.drop = nn.Dropout(c.dropout)

    def forward(self, x):
        return self.drop(self.down(F.gelu(self.up(x), approximate="tanh")))


class Block(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.ln1 = nn.LayerNorm(c.width)
        self.attn = Attention(c)
        self.ln2 = nn.LayerNorm(c.width)
        self.mlp = MLP(c)

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        return x + self.mlp(self.ln2(x))


class GPT(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.config = c
        self.tok = nn.Embedding(c.vocab, c.width)
        self.pos = nn.Embedding(c.ctx, c.width)
        self.drop = nn.Dropout(c.dropout)
        self.blocks = nn.ModuleList([Block(c) for _ in range(c.layers)])
        self.ln_f = nn.LayerNorm(c.width)
        self.apply(self._init)
        # GPT-2's scaled init on the residual projections.
        for name, p in self.named_parameters():
            if name.endswith("proj.weight") or name.endswith("down.weight"):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * c.layers))

    @staticmethod
    def _init(m):
        if isinstance(m, (nn.Linear, nn.Embedding)):
            nn.init.normal_(m.weight, mean=0.0, std=0.02)

    def params(self):
        return sum(p.numel() for p in self.parameters())

    def forward(self, idx, targets=None):
        B, T = idx.shape
        pos = torch.arange(T, device=idx.device)
        x = self.drop(self.tok(idx) + self.pos(pos))
        for b in self.blocks:
            x = b(x)
        x = self.ln_f(x)
        logits = x @ self.tok.weight.t()
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss

    def optimizer(self, lr, weight_decay, betas=(0.9, 0.95)):
        decay = [p for n, p in self.named_parameters() if p.dim() >= 2]
        keep = [p for n, p in self.named_parameters() if p.dim() < 2]
        return torch.optim.AdamW([{"params": decay, "weight_decay": weight_decay}, {"params": keep, "weight_decay": 0.0}], lr=lr, betas=betas)

    @torch.no_grad()
    def generate(self, idx, n, temperature=0.8, top_p=0.9, stop=None, generator=None):
        for _ in range(n):
            cond = idx[:, -self.config.ctx :]
            logits, _ = self(cond)
            logits = logits[:, -1, :] / max(temperature, 1e-6)
            probs = F.softmax(logits, dim=-1)
            sp, si = torch.sort(probs, descending=True)
            cum = torch.cumsum(sp, dim=-1)
            sp[(cum - sp) > top_p] = 0
            sp = sp / sp.sum(dim=-1, keepdim=True)
            nxt = si.gather(-1, torch.multinomial(sp, 1, generator=generator))
            idx = torch.cat([idx, nxt], dim=1)
            if stop is not None and int(nxt[0, 0]) == stop:
                break
        return idx
