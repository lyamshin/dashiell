#!/usr/bin/env python3
"""The golden loop's measurement harness (docs/11-golden-loop.md).

    python3 scripts/golden-loop.py [--out DIR] [--seeds 40] [--pages 3]
                                   [--no-render] [--json FILE] [--label NAME]

Renders the fixed set — pages one to three of seeds 1..40 at difficulty 2,
through the same code path as `npm run read` (src/cli/golden.ts) — then runs
`scripts/style-metrics.py` over every page and prints, per metric, the mean,
the worst page, the target from docs/golden/GAP.md and the normalized distance
to it. The aggregate at the bottom is the sum of those distances, and it is the
number the loop's stopping rule is read off.

Nothing here estimates anything. Every number is computed from the pages on
disk, and `--json` writes them out so a round can be diffed against the last.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import statistics
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_metrics():
    path = os.path.join(ROOT, "scripts", "style-metrics.py")
    spec = importlib.util.spec_from_file_location("style_metrics", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SM = load_metrics()

# ---------------------------------------------------------------------------
# The targets, as docs/golden/GAP.md states them.
#
# kind is 'min' (at least), 'max' (at most) or 'band' (inside a range). `worst`
# says which end of the spread is the bad end, so the worst page is the page a
# stylist would actually open first.
# ---------------------------------------------------------------------------

TARGETS = [
    ("orphan_word_ratio", "max", 0.68, None, "high"),
    ("paragraph_cohesion", "min", 0.65, None, "low"),
    ("sentence_cohesion", "min", 0.55, None, "low"),
    ("short_share", "min", 0.28, None, "low"),
    ("long_ratio", "band", 0.0625, 0.1875, "low"),
    ("dialogue_share_p1", "band", 0.30, 0.45, "low"),
    ("figures", "max", 1.0, None, "high"),
    ("plain_ratio", "min", 0.60, None, "low"),
    ("words_per_paragraph", "band", 30.0, 45.0, "low"),
]


def distance(kind: str, value: float, lo: float, hi: float | None) -> float:
    """How far off target, as a share of the target. Zero when it is met."""
    if kind == "min":
        return max(0.0, (lo - value) / lo)
    if kind == "max":
        return max(0.0, (value - lo) / max(lo, 1e-9))
    return max(0.0, (lo - value) / lo, (value - (hi or lo)) / max(hi or lo, 1e-9))


def page_metrics(path: str) -> dict:
    text = open(path, encoding="utf-8").read()
    m = SM.metrics(text)
    sents = max(1, m["sentences"])
    m["short_share"] = round(m["short_sentences_le6"] / sents, 3)
    m["long_ratio"] = round(m["long_sentences_gt25"] / sents, 3)
    return m


def golden_pages() -> list[tuple[str, dict]]:
    """The golden example's own two pages, measured the same way.

    The loop is judged against targets, but a target is only worth chasing if
    the golden itself could hit it. Measured page by page rather than as one
    two-page run, the golden scores 0.73 orphan and 22 words a paragraph on its
    office page — outside two of GAP.md's targets — because both of those
    numbers are functions of length before they are functions of style. These
    rows print under every round so the reading is done against the writing and
    not only against the table.
    """
    path = os.path.join(ROOT, "docs", "golden", "seed3-opening.md")
    if not os.path.exists(path):
        return []
    raw = open(path, encoding="utf-8").read()
    try:
        p1 = raw.split("## Page one — the office")[1].split("## Page two")[0]
        p2 = raw.split("## Page two — the suite")[1].split("## What the golden does")[0]
    except IndexError:
        return []
    out = []
    for name, text in [("golden p1", p1), ("golden p2", p2.replace("---", ""))]:
        m = SM.metrics(text)
        sents = max(1, m["sentences"])
        m["short_share"] = round(m["short_sentences_le6"] / sents, 3)
        m["long_ratio"] = round(m["long_sentences_gt25"] / sents, 3)
        m["dialogue_share_p1"] = m["dialogue_share"]
        m["figures"] = float(m["figures"])
        m["plain_ratio"] = None
        out.append((name, m))
    return out


def render(out: str, seeds: int, pages: int) -> None:
    env = dict(os.environ)
    env["PATH"] = os.path.expanduser("~/.local/bin") + os.pathsep + env.get("PATH", "")
    subprocess.run(
        ["npx", "tsx", "src/cli/golden.ts", "--out", out,
         "--seeds", str(seeds), "--pages", str(pages)],
        cwd=ROOT, env=env, check=True, stdout=subprocess.DEVNULL,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, ".golden-pages"))
    ap.add_argument("--seeds", type=int, default=40)
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--json", default=None)
    ap.add_argument("--label", default="")
    args = ap.parse_args()

    if not args.no_render:
        render(args.out, args.seeds, args.pages)

    rows = json.load(open(os.path.join(args.out, "pages.json"), encoding="utf-8"))
    per_page: list[tuple[str, dict]] = []
    for row in rows:
        m = page_metrics(os.path.join(args.out, row["file"]))
        total = row["plain"] + row["image"]
        m["plain_ratio"] = round(row["plain"] / total, 3) if total else 1.0
        m["dialogue_share_p1"] = m["dialogue_share"] if row["page"] == 1 else None
        m["figures"] = float(m["figures"])
        per_page.append((row["file"], m))

    print(f"{len(per_page)} pages · {args.seeds} seeds · pages 1–{args.pages}"
          + (f" · {args.label}" if args.label else ""))
    print()
    gold = dict(golden_pages())
    head = (f"{'metric':22s}{'mean':>8s}{'target':>14s}{'dist':>8s}{'worst':>10s}"
            f"{'gold p1':>9s}{'gold p2':>9s}  page")
    print(head)
    print("-" * len(head))

    summary: dict[str, float] = {}
    aggregate = 0.0
    for name, kind, lo, hi, worst_end in TARGETS:
        vals = [(f, m[name]) for f, m in per_page if m.get(name) is not None]
        if not vals:
            continue
        mean = statistics.fmean(v for _, v in vals)
        d = distance(kind, mean, lo, hi)
        aggregate += d
        wf, wv = (max(vals, key=lambda p: p[1]) if worst_end == "high"
                  else min(vals, key=lambda p: p[1]))
        label = (f"<= {lo:g}" if kind == "max" else
                 f">= {lo:g}" if kind == "min" else f"{lo:g}-{hi:g}")
        g = [gold.get(k, {}).get(name) for k in ("golden p1", "golden p2")]
        gtxt = "".join(f"{v:9.2f}" if isinstance(v, (int, float)) else f"{'—':>9s}" for v in g)
        print(f"{name:22s}{mean:8.3f}{label:>14s}{d:8.3f}{wv:10.3f}{gtxt}  {wf}")
        summary[name] = round(mean, 4)

    print("-" * len(head))
    print(f"{'AGGREGATE DISTANCE':22s}{aggregate:8.3f}")
    summary["aggregate"] = round(aggregate, 4)

    gaps: dict[str, int] = {}
    for row in rows:
        for g in row["gaps"]:
            key = g.split(":")[0]
            gaps[key] = gaps.get(key, 0) + 1
    if gaps:
        print("\ngaps: " + ", ".join(f"{k} ×{v}" for k, v in sorted(gaps.items())))

    if args.json:
        json.dump(summary, open(args.json, "w", encoding="utf-8"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
