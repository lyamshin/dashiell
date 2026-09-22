#!/usr/bin/env python3
"""The golden loop's measurement harness (docs/11-golden-loop.md).

    python3 scripts/golden-loop.py [--out DIR] [--seeds 40] [--pages 3]
                                   [--no-render] [--json FILE] [--label NAME]
    python3 scripts/golden-loop.py --night [--pages 8] ...

`--night` (M8 §10) measures the pages after the office instead: pages 2 to 8
of the same seeds, each held to the golden night page of its own shape
(`docs/golden/seed3-night.md`) — a first arrival to pages 2 and 4, a search to
page 3, a question to page 5 — and prints the office page on its own under
the day targets, so a change to the night can be seen not to have moved it.

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
# Hone 1 §B.5 recomputed them against golden v2 **per page**. The old set was
# measured over the two golden pages taken as one text, and the golden loop's
# report showed what that costs: the orphan-word target was 0.68 when the
# golden's own office page scores 0.77 and its suite page 0.89, so three
# quarters of the loop's outstanding distance was against a number that could
# not have been hit. A target the golden itself misses is not a target, it is
# a fault in the ruler.
#
# The other fault in the ruler was in `style-metrics.py`, and §B.5 fixed it:
# the sentence splitter did not break after a closing quotation mark, so on a
# page of dialogue most sentences were measured glued to the one after them.
# Every number below is post-fix, the golden's included, and the numbers in
# `docs/golden/REPORT.md` are pre-fix and are not comparable to them.
#
# Golden v2, one page at a time:
#
#   metric                office page   suite page
#   orphan_word_ratio            0.77         0.89
#   paragraph_cohesion           0.53         0.80
#   sentence_cohesion            0.58         0.61
#   short_share                  0.565        0.158
#   long_ratio                   0.00         0.053
#   dialogue_share               0.43         0.00
#   figures                      1            0
#   words_per_paragraph         22.1         34.7
#
# A `min` target is the mean of the two pages, because the engine's own number
# is a mean over a hundred and twenty pages and that is the comparable figure.
# The spec sets one by hand: orphan is the office page's value plus 0.05. A
# `band` spans the two pages — what the golden does on one page and on the
# other is the range the engine is asked to stay inside. `plain_ratio` is the
# engine's own count of plain sentences against image ones and has no golden
# value, so it keeps M5 §1's floor.
#
# kind is 'min' (at least), 'max' (at most) or 'band' (inside a range). `worst`
# says which end of the spread is the bad end, so the worst page is the page a
# stylist would actually open first.
# ---------------------------------------------------------------------------

TARGETS = [
    # the office page, plus the 0.05 the spec allows
    ("orphan_word_ratio", "max", 0.82, None, "high"),
    # (0.53 + 0.80) / 2
    ("paragraph_cohesion", "min", 0.66, None, "low"),
    # (0.58 + 0.61) / 2
    ("sentence_cohesion", "min", 0.59, None, "low"),
    # (0.565 + 0.158) / 2 — the golden's office page is more than half short
    ("short_share", "min", 0.36, None, "low"),
    # v2 carries one sentence over twenty-five words on its suite page and
    # none at all on its office page, so this is a ceiling and not a band.
    # The carrying sentence the golden loop built in round 3 stays; what the
    # golden will not support is more than one of them a page.
    ("long_ratio", "max", 0.06, None, "high"),
    # the office page's own 0.43, a tenth either way
    ("dialogue_share_p1", "band", 0.33, 0.53, "low"),
    # rule 6: one figure per two pages, which is what the golden does
    ("figures", "max", 0.5, None, "high"),
    # M5 §1's floor; the golden has no plain/image count to read
    ("plain_ratio", "min", 0.60, None, "low"),
    # 22.1 on the office page, 34.7 on the suite page
    ("words_per_paragraph", "band", 22.0, 35.0, "low"),
]


# ---------------------------------------------------------------------------
# M8 §10 — the night targets, per page shape.
#
# Measured off `docs/golden/seed3-night.md` with `style-metrics.py`, one page
# at a time, the italic errand line included as prose:
#
#   metric                p2 arrive  p4 arrive  p3 search  p5 ask
#   words                       207        197        162     138
#   orphan_word_ratio          0.84       0.84       0.80    0.80
#   paragraph_cohesion         0.80       0.75       0.20    0.50
#   sentence_cohesion          0.59       0.67       0.57    0.39
#   short_share               0.111      0.000      0.200   0.684
#   long_ratio                0.056      0.154      0.067   0.000
#   dialogue_share             0.00       0.00       0.00    0.42
#   figures                       0          1          1       0
#   words_per_paragraph        34.5       39.4       27.0    19.7
#
# Where the golden has two pages of a shape (the arrival) the rule is GAP.md's:
# a floor is their mean, a ceiling their larger value, a band spans them, and
# orphan is the ceiling plus 0.05. Where it has one page, a floor is that page
# less 0.10, a ceiling that page (never under the day's 0.06 for long
# sentences) and orphan that page plus 0.05; a band is the page plus or minus a
# tenth of dialogue, or five words a paragraph. Words are the spec's own band
# widened to hold the golden page (§8: 220-350 an arrival, 180-280 a search or
# a question; the golden runs 197-207 and 138-162), since a target the golden
# misses is not a target. Figures hold rule 6's half a page. Plain ratio keeps
# M5's floor. A return visit has no golden page and is reported, not scored.
# ---------------------------------------------------------------------------

NIGHT_TARGETS = {
    "arrive": [
        ("orphan_word_ratio", "max", 0.89, None, "high"),
        ("paragraph_cohesion", "min", 0.775, None, "low"),
        ("sentence_cohesion", "min", 0.63, None, "low"),
        ("short_share", "min", 0.056, None, "low"),
        ("long_ratio", "max", 0.154, None, "high"),
        ("dialogue_share", "max", 0.10, None, "high"),
        ("figures", "max", 0.5, None, "high"),
        ("plain_ratio", "min", 0.60, None, "low"),
        ("words_per_paragraph", "band", 29.5, 44.4, "low"),
        ("words", "band", 170.0, 350.0, "low"),
    ],
    "search": [
        ("orphan_word_ratio", "max", 0.85, None, "high"),
        ("paragraph_cohesion", "min", 0.10, None, "low"),
        ("sentence_cohesion", "min", 0.47, None, "low"),
        ("short_share", "min", 0.10, None, "low"),
        ("long_ratio", "max", 0.067, None, "high"),
        ("dialogue_share", "max", 0.10, None, "high"),
        ("figures", "max", 0.5, None, "high"),
        ("plain_ratio", "min", 0.60, None, "low"),
        ("words_per_paragraph", "band", 22.0, 32.0, "low"),
        ("words", "band", 130.0, 280.0, "low"),
    ],
    "ask": [
        ("orphan_word_ratio", "max", 0.85, None, "high"),
        ("paragraph_cohesion", "min", 0.40, None, "low"),
        ("sentence_cohesion", "min", 0.29, None, "low"),
        ("short_share", "min", 0.584, None, "low"),
        ("long_ratio", "max", 0.06, None, "high"),
        ("dialogue_share", "band", 0.32, 0.52, "low"),
        ("figures", "max", 0.5, None, "high"),
        ("plain_ratio", "min", 0.60, None, "low"),
        ("words_per_paragraph", "band", 14.7, 24.7, "low"),
        ("words", "band", 130.0, 280.0, "low"),
    ],
}

NIGHT_GOLDEN_PAGES = {"arrive": ["2", "4"], "search": ["3"], "ask": ["5"]}


def golden_night_pages() -> dict[str, dict]:
    """The night golden's four pages, measured one at a time, by page number."""
    import re as _re
    path = os.path.join(ROOT, "docs", "golden", "seed3-night.md")
    if not os.path.exists(path):
        return {}
    raw = open(path, encoding="utf-8").read()
    parts = _re.split(r"^## Page (\d) .*$", raw, flags=_re.M)
    out = {}
    for i in range(1, len(parts), 2):
        body = parts[i + 1].split("**Why it works.**")[0]
        lines = [l[1:].lstrip() for l in body.splitlines() if l.startswith(">")]
        text = "\n".join(lines).replace("*", "")
        m = SM.metrics(text)
        sents = max(1, m["sentences"])
        m["short_share"] = round(m["short_sentences_le6"] / sents, 3)
        m["long_ratio"] = round(m["long_sentences_gt25"] / sents, 3)
        m["figures"] = float(m["figures"])
        m["plain_ratio"] = None
        out[parts[i]] = m
    return out


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
        # Everything under the professor's notes is commentary about the pages
        # and not one of them. It used to be measured as part of page two,
        # which is why the suite page reported sixty-nine words a paragraph.
        p2 = raw.split("## Page two — the suite")[1].split("## Professor's notes")[0]
    except IndexError:
        return []

    def prose(text):
        """The page, without the headings and the italic briefs around it."""
        return "\n".join(
            line for line in text.splitlines()
            if not line.startswith("#") and not line.startswith("*") and line.strip() != "---"
        )

    out = []
    for name, text in [("golden p1", p1), ("golden p2", p2)]:
        m = SM.metrics(prose(text))
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


def table(per_page, targets, gold_cols):
    """Print one table of metric rows; return (summary, summed distance)."""
    head = (f"{'metric':22s}{'mean':>9s}{'target':>14s}{'dist':>8s}{'worst':>10s}"
            + "".join(f"{name:>9s}" for name, _ in gold_cols) + "  page")
    print(head)
    print("-" * len(head))
    summary: dict[str, float] = {}
    total = 0.0
    for name, kind, lo, hi, worst_end in targets:
        vals = [(f, m[name]) for f, m in per_page if m.get(name) is not None]
        if not vals:
            continue
        mean = statistics.fmean(v for _, v in vals)
        d = distance(kind, mean, lo, hi)
        total += d
        wf, wv = (max(vals, key=lambda p: p[1]) if worst_end == "high"
                  else min(vals, key=lambda p: p[1]))
        label = (f"<= {lo:g}" if kind == "max" else
                 f">= {lo:g}" if kind == "min" else f"{lo:g}-{hi:g}")
        gtxt = "".join(f"{g.get(name):9.2f}" if isinstance(g.get(name), (int, float)) else f"{'—':>9s}"
                       for _, g in gold_cols)
        print(f"{name:22s}{mean:9.3f}{label:>14s}{d:8.3f}{wv:10.3f}{gtxt}  {wf}")
        summary[name] = round(mean, 4)
    print("-" * len(head))
    return summary, total


def night(args) -> int:
    """M8 §10: pages 2 to N, per shape, against the night golden; and the office."""
    rows = json.load(open(os.path.join(args.out, "pages.json"), encoding="utf-8"))
    measured = []
    for row in rows:
        m = page_metrics(os.path.join(args.out, row["file"]))
        total = row["plain"] + row["image"]
        m["plain_ratio"] = round(row["plain"] / total, 3) if total else 1.0
        m["figures"] = float(m["figures"])
        m["dialogue_share_p1"] = m["dialogue_share"] if row["page"] == 1 else None
        m["words"] = float(m["words"])
        measured.append((row, m))
    gold = golden_night_pages()
    out: dict[str, dict] = {}
    print(f"night · {args.seeds} seeds · pages 2–{args.pages}" + (f" · {args.label}" if args.label else ""))
    shapes: dict[str, int] = {}
    for row, _ in measured:
        if row["page"] >= 2:
            shapes[row["shape"]] = shapes.get(row["shape"], 0) + 1
    print("shapes: " + ", ".join(f"{k} ×{v}" for k, v in sorted(shapes.items())))
    aggregate = []
    for shape, targets in NIGHT_TARGETS.items():
        per = [(row["file"], m) for row, m in measured if row["page"] >= 2 and row["shape"] == shape]
        print()
        print(f"{shape} ({len(per)} pages)")
        cols = [(f"gold p{n}", gold.get(n, {})) for n in NIGHT_GOLDEN_PAGES[shape]]
        summary, total = table(per, targets, cols)
        print(f"{'DISTANCE':22s}{total:9.3f}")
        summary["distance"] = round(total, 4)
        summary["pages"] = len(per)
        out[shape] = summary
        aggregate.append(total)
    for shape in ("return", "look"):
        per = [(row["file"], m) for row, m in measured if row["page"] >= 2 and row["shape"] == shape]
        if not per:
            continue
        print()
        print(f"{shape} ({len(per)} pages, no golden page: reported, not scored)")
        summary, _ = table(per, [(n, k, lo, hi, w) for n, k, lo, hi, w in NIGHT_TARGETS["arrive"]], [])
        out[shape] = summary
    night_agg = statistics.fmean(aggregate) if aggregate else 0.0
    print()
    print(f"{'NIGHT AGGREGATE':22s}{night_agg:9.3f}   (mean of the three shapes' distances)")
    out["night_aggregate"] = round(night_agg, 4)

    # The office page alone, under the day's targets: the regression guard.
    office = [(row["file"], m) for row, m in measured if row["page"] == 1]
    print()
    print(f"office page ({len(office)} pages) — day targets")
    g = dict(golden_pages())
    summary, total = table(office, TARGETS, [("gold p1", g.get("golden p1", {}))])
    print(f"{'DISTANCE':22s}{total:9.3f}")
    summary["distance"] = round(total, 4)
    out["office"] = summary
    if args.json:
        json.dump(out, open(args.json, "w", encoding="utf-8"), indent=1)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, ".golden-pages"))
    ap.add_argument("--seeds", type=int, default=40)
    ap.add_argument("--pages", type=int, default=None)
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--json", default=None)
    ap.add_argument("--label", default="")
    ap.add_argument("--night", action="store_true")
    args = ap.parse_args()
    if args.pages is None:
        args.pages = 8 if args.night else 3

    if not args.no_render:
        render(args.out, args.seeds, args.pages)
    if args.night:
        return night(args)

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
