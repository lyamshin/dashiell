#!/usr/bin/env python3
"""Micro-fiction stylist metrics for a page or two of prose.

Usage: style-metrics.py FILE [FILE...]
Prints one row per file. Used to measure engine output against docs/golden/.
"""
import re, sys, json

FIG = re.compile(r"\b(like a|like an|like the|as if|as though|the way a|the way the|as \w+ as)\b", re.I)
PRON = re.compile(r"^(I|She|He|It|They|We|You|That|This|Her|His|The)\b")

def sentences(text):
    text = re.sub(r"\s+", " ", text)
    parts = re.split(r"(?<=[.!?…])\s+(?=[\"“'A-Z])", text)
    return [p.strip() for p in parts if p.strip()]

def paragraphs(text):
    return [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]

def content_words(s):
    return [w.lower() for w in re.findall(r"[A-Za-z']+", s) if len(w) > 3]

def metrics(text):
    paras = paragraphs(text)
    sents = sentences(text)
    words = re.findall(r"[A-Za-z'’]+", text)
    n_words = len(words)
    n_sents = max(1, len(sents))
    lens = [len(re.findall(r"[A-Za-z'’]+", s)) for s in sents]
    lens_sorted = sorted(lens)
    median = lens_sorted[len(lens_sorted)//2] if lens_sorted else 0
    dialogue = sum(1 for s in sents if re.search(r"[\"“]", s))
    figures = len(FIG.findall(text))
    # cohesion: paragraph opens with a pronoun/definite reference, or shares a content word with previous paragraph
    cohesive = 0
    for i in range(1, len(paras)):
        prev = set(content_words(paras[i-1]))
        first_sentence = sentences(paras[i])[0] if sentences(paras[i]) else ""
        opens_ref = bool(PRON.match(first_sentence.lstrip("\"“'")))
        shares = bool(prev & set(content_words(first_sentence)))
        if opens_ref or shares:
            cohesive += 1
    # subjects per paragraph: distinct capitalized words (proper nouns) per paragraph
    subj = []
    for p in paras:
        caps = set(w for w in re.findall(r"\b[A-Z][a-z]{2,}\b", p))
        caps -= {"The", "She", "He", "It", "I", "They", "Two", "One", "Midnight", "Nobody", "Nothing", "There", "Somebody", "When", "That", "This", "You", "My", "Her", "His", "At", "On", "In", "Between", "For", "Four", "Half", "Start", "Sit", "Collecting", "Mr", "Twenty", "Someone"}
        subj.append(len(caps))
    # adjective-ish density: words ending in common adjective suffixes / preceding nouns is hard; proxy: commas per sentence
    commas = text.count(",") / n_sents
    # sentence-to-sentence cohesion: consecutive sentences share a content word or the second opens on a reference
    coh_s = 0
    for i in range(1, len(sents)):
        a = set(content_words(sents[i-1])); b_first = sents[i].lstrip("\"“'")
        if PRON.match(b_first) or (a & set(content_words(sents[i]))):
            coh_s += 1
    # orphan nouns: content words that occur exactly once on the page. High = many one-off images.
    from collections import Counter
    cw = Counter(content_words(text))
    orphan_ratio = sum(1 for w, c in cw.items() if c == 1) / max(1, len(cw))
    # fragments: sentences with no obvious finite verb (heuristic)
    VERBISH = re.compile(r"\b(\w+ed|was|were|is|are|am|had|has|have|said|came|went|put|took|let|sat|stood|knew|did|do|does|want|wants|know|knows|found|gave|got|kept|made|saw|told|comes|goes|sits|stands|keeps|holds|held|runs|ran|shut|left|hit|owed|owes|works|worked|broke|thought|watched|looked|met|paid|lay|lies|says|say|ask|asked|write|writes|wrote|count|counted|remembered|tell|told|wanted|matter|matters|wait|waited|fell|caught|crept|stayed|tick|ticks|ticking)\b", re.I)
    fragments = sum(1 for s in sents if not VERBISH.search(s))
    long_sents = sum(1 for l in lens if l > 25)
    short_sents = sum(1 for l in lens if l <= 6)
    return {
        "words": n_words,
        "sentences": len(sents),
        "paragraphs": len(paras),
        "words_per_sentence_median": median,
        "words_per_sentence_mean": round(n_words / n_sents, 1),
        "long_sentences_gt25": long_sents,
        "short_sentences_le6": short_sents,
        "dialogue_share": round(dialogue / n_sents, 2),
        "figures_per_100_words": round(100 * figures / max(1, n_words), 2),
        "figures": figures,
        "paragraph_cohesion": round(cohesive / max(1, len(paras) - 1), 2),
        "sentence_cohesion": round(coh_s / max(1, len(sents) - 1), 2),
        "orphan_word_ratio": round(orphan_ratio, 2),
        "fragment_share": round(fragments / n_sents, 2),
        "proper_nouns_per_paragraph": round(sum(subj) / max(1, len(paras)), 2),
        "commas_per_sentence": round(commas, 2),
        "words_per_paragraph": round(n_words / max(1, len(paras)), 1),
    }

if __name__ == "__main__":
    rows = {}
    for f in sys.argv[1:]:
        t = open(f, encoding="utf-8").read()
        # strip markdown headers/rules/italics blocks for the golden file
        t = "\n".join(l for l in t.splitlines() if not l.startswith("#") and not l.startswith("*") and l.strip() != "---")
        rows[f] = metrics(t)
    keys = list(next(iter(rows.values())).keys())
    print(f"{'metric':32s}" + "".join(f"{f.split('/')[-1][:22]:>24s}" for f in rows))
    for k in keys:
        print(f"{k:32s}" + "".join(f"{str(rows[f][k]):>24s}" for f in rows))
