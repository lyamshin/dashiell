"""
docs/50 §8: the gap format, for the fine-tune (phase 2b). The same thing as
src/game/board/model/gapformat.ts, id for id: test/model/gapformat.test.ts
holds the two together on model/data/gap-parity.jsonl (written by
`python model/gapformat.py parity`).

  <|eot|> BEFORE <|gap|> <|slot:S|> <|tier:T|> <|kind:K|> <|manner:M|> <|sep|> AFTER <|sep|> TARGET <|endgap|>

The prompt is everything up to and including the second <|sep|>; the fine-tune
learns TARGET and <|endgap|> only.
"""

import json
import os
import sys

from tokenizer import DATA, EOT, GAP, GAP_KINDS, GAP_MANNERS, GAP_SLOTS, GAP_TIERS, SEP, SPECIALS, Tokenizer, read_lines

ENDGAP = SPECIALS.index("<|endgap|>")
BEFORE_MIN, BEFORE_MAX, AFTER_MAX, TARGET_MIN, TARGET_MAX = 120, 160, 48, 8, 40


def header_ids(slot, tier, kind, manner):
    return [GAP, SPECIALS.index("<|slot:%s|>" % slot), SPECIALS.index("<|tier:%s|>" % GAP_TIERS[tier]), SPECIALS.index("<|kind:%s|>" % kind), SPECIALS.index("<|manner:%s|>" % manner), SEP]


def gap_example(tok, slot, tier, kind, manner, before, after, target, before_tokens=BEFORE_MAX):
    """(prompt ids, target ids): as gapExample in gapformat.ts."""
    b = tok.encode(before)[-before_tokens:] if before_tokens > 0 else []
    a = tok.encode(after if after.startswith(" ") else " " + after)[:AFTER_MAX] if after else []
    t = tok.encode(target if target.startswith(" ") else " " + target)
    return [EOT] + b + header_ids(slot, tier, kind, manner) + a + [SEP], t + [ENDGAP]


def main():
    if len(sys.argv) < 2 or sys.argv[1] != "parity":
        print(__doc__)
        return
    tok = Tokenizer.load()
    pages = read_lines(os.path.join(DATA, "nights.val.txt"))[:40]
    out = os.path.join(DATA, "gap-parity.jsonl")
    with open(out, "w", encoding="utf-8") as f:
        for i, page in enumerate(pages):
            paras = page.split(" ¶ ")
            if len(paras) < 3:
                continue
            k = 1 + i % (len(paras) - 2)
            before = " ¶ ".join(paras[:k]) + " ¶"
            target = paras[k]
            after = " ¶ " + paras[k + 1]
            ex = dict(
                slot=GAP_SLOTS[i % len(GAP_SLOTS)],
                tier=i % len(GAP_TIERS),
                kind=GAP_KINDS[i % len(GAP_KINDS)],
                manner=GAP_MANNERS[i % len(GAP_MANNERS)],
                before=before,
                after=after,
                target=target,
                before_tokens=BEFORE_MIN + (i * 7) % (BEFORE_MAX - BEFORE_MIN + 1),
            )
            p, t = gap_example(tok, **ex)
            f.write(json.dumps({**ex, "prompt": p, "target_ids": t}, ensure_ascii=False) + "\n")
    print("→ %s" % out)


if __name__ == "__main__":
    main()
