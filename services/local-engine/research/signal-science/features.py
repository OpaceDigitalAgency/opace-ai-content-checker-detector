"""The interpretable feature battery.

Every feature here is something a person can be told in one sentence. Nothing
is a learned embedding. Where a quantity depends on document length, the
length-robust form is used (MATTR rather than raw type-token ratio, rates per
1,000 words rather than counts) and the residual length dependence is measured
separately in analyse_features.py rather than assumed away.

No external NLP dependency: a tagger would add a large install for the sake of
two features, and every syntactic quantity here is a documented heuristic whose
error mode is stated rather than hidden. Where a heuristic is coarse (passive
voice, proper nouns) the name says `_approx`.
"""
from __future__ import annotations

import math
import re
import zlib
from collections import Counter

# --- tokenisation ----------------------------------------------------------

WORD_RE = re.compile(r"[A-Za-zÀ-ɏ']+")
TOKEN_RE = re.compile(r"\S+")
# Sentence split: terminal punctuation followed by space + capital/quote/digit,
# with the common abbreviations protected. Deliberately simple and identical on
# both sides of the corpus, so any bias it carries is a bias shared by AI and
# human text alike.
ABBREV = r"(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)"
SENT_SPLIT = re.compile(ABBREV + r"(?<=[.!?])[\"'”’)\]]*\s+(?=[\"'“‘(\[]*[A-Z0-9])")

STOPWORDS = set("""a about above after again against all am an and any are aren't as at be because been
before being below between both but by can cannot could couldn't did didn't do does doesn't doing don't
down during each few for from further had hadn't has hasn't have haven't having he her here hers herself
him himself his how i if in into is isn't it its itself let's me more most mustn't my myself no nor not
of off on once only or other ought our ours ourselves out over own same shan't she should shouldn't so
some such than that the their theirs them themselves then there these they this those through to too
under until up very was wasn't we were weren't what when where which while who whom why with won't would
wouldn't you your yours yourself yourselves""".split())

FIRST_SING = {"i", "me", "my", "mine", "myself"}
FIRST_PLUR = {"we", "us", "our", "ours", "ourselves"}
SECOND = {"you", "your", "yours", "yourself", "yourselves"}
THIRD = {"he", "she", "it", "they", "him", "her", "them", "his", "hers", "its", "their", "theirs"}

DISCOURSE = {"however", "moreover", "furthermore", "additionally", "therefore", "thus",
             "consequently", "nevertheless", "nonetheless", "meanwhile", "similarly",
             "conversely", "accordingly", "hence", "overall", "ultimately", "importantly",
             "notably", "specifically", "particularly", "essentially", "fundamentally"}
HEDGES = {"may", "might", "could", "perhaps", "possibly", "arguably", "generally",
          "typically", "often", "usually", "somewhat", "relatively", "largely",
          "tend", "tends", "tended", "suggest", "suggests", "appear", "appears",
          "seem", "seems", "likely", "potentially"}
BOOSTERS = {"very", "extremely", "incredibly", "truly", "deeply", "remarkably",
            "highly", "significantly", "substantially", "profoundly", "absolutely",
            "utterly", "vastly", "immensely", "critically"}
# The 2023-24 "AI vocabulary" list, as circulated in style guides and as used by
# the project's own rules tier. Measured here rather than assumed.
CLICHE = {"delve", "delves", "delving", "leverage", "leveraging", "leverages", "robust",
          "seamless", "seamlessly", "elevate", "elevates", "elevating", "unlock",
          "unlocks", "unlocking", "harness", "harnessing", "empower", "empowers",
          "empowering", "streamline", "streamlines", "streamlining", "tapestry",
          "realm", "realms", "testament", "myriad", "underscore", "underscores",
          "foster", "fosters", "fostering", "cultivate", "cultivates", "cultivating",
          "holistic", "multifaceted", "pivotal", "crucial", "vital", "comprehensive",
          "navigating", "landscape", "transformative", "innovative", "cutting-edge",
          "game-changer", "paradigm", "synergy", "bespoke", "meticulous",
          "meticulously", "intricate", "nuanced", "compelling", "unwavering"}
CLICHE_PHRASES = ["in today's", "in the world of", "it's important to note",
                  "when it comes to", "at the end of the day", "the bottom line",
                  "dive into", "deep dive", "a testament to", "plays a crucial role",
                  "plays a vital role", "not just", "more than just", "in conclusion",
                  "in summary", "let's explore", "let's take a look", "stay tuned",
                  "the key is", "that being said", "on the other hand"]
IRREGULAR_PP = {"been", "done", "gone", "seen", "taken", "given", "made", "found",
                "held", "kept", "left", "led", "met", "paid", "put", "read", "said",
                "sent", "set", "shown", "sold", "told", "thought", "written", "known",
                "built", "brought", "bought", "caught", "chosen", "driven", "drawn",
                "eaten", "fallen", "felt", "grown", "heard", "lost", "meant", "run",
                "seen", "spent", "understood", "won", "worn"}
BE_FORMS = {"is", "are", "was", "were", "be", "been", "being", "am", "get", "gets", "got"}
SUBORDINATORS = {"which", "that", "because", "although", "though", "while", "whereas",
                 "since", "unless", "whether", "if", "when", "where", "who", "whom", "whose"}
COORD_OPENERS = {"and", "but", "so", "yet", "or", "nor", "for"}


def _safe(n, d):
    return float(n) / d if d else 0.0


def _entropy(counter, total):
    if total <= 0:
        return 0.0
    h = 0.0
    for c in counter.values():
        p = c / total
        h -= p * math.log2(p)
    return h


def _autocorr(xs, lag):
    n = len(xs)
    if n <= lag + 2:
        return 0.0
    m = sum(xs) / n
    var = sum((x - m) ** 2 for x in xs)
    if var <= 1e-12:
        return 0.0
    cov = sum((xs[i] - m) * (xs[i + lag] - m) for i in range(n - lag))
    return cov / var


def _spectral_flatness(xs):
    """Geometric over arithmetic mean of the power spectrum of the mean-removed
    sentence-length series. 1.0 = white noise (no rhythmic structure at any
    scale); low values = energy concentrated at a few periods."""
    n = len(xs)
    if n < 8:
        return float("nan")
    m = sum(xs) / n
    y = [x - m for x in xs]
    power = []
    for k in range(1, n // 2 + 1):
        re_ = sum(y[t] * math.cos(-2 * math.pi * k * t / n) for t in range(n))
        im_ = sum(y[t] * math.sin(-2 * math.pi * k * t / n) for t in range(n))
        power.append(re_ * re_ + im_ * im_ + 1e-12)
    am = sum(power) / len(power)
    gm = math.exp(sum(math.log(p) for p in power) / len(power))
    return gm / am if am > 0 else float("nan")


def _mattr(words, window=100):
    """Moving-average type-token ratio: the length-robust vocabulary-richness
    measure. Raw TTR falls with length and would otherwise measure length."""
    n = len(words)
    if n < window:
        return _safe(len(set(words)), n)
    total, count = 0.0, 0
    for i in range(0, n - window + 1, 10):
        total += len(set(words[i:i + window])) / window
        count += 1
    return total / count if count else 0.0


def _sentences(text):
    out = []
    for para in text.split("\n"):
        para = para.strip()
        if not para:
            continue
        for s in SENT_SPLIT.split(para):
            s = s.strip()
            if s:
                out.append(s)
    return out


def extract(text: str, background=None) -> dict:
    """background: optional (unigram_logprob dict, default_logprob, bigram dict)
    built by build_background(); enables the surprisal / uniform-information-
    density features. Without it those keys are absent."""
    f = {}
    chars = len(text) or 1
    words_cased = WORD_RE.findall(text)
    words = [w.lower() for w in words_cased]
    nw = len(words) or 1
    f["n_words"] = len(words)
    tokens = TOKEN_RE.findall(text)

    sents = _sentences(text)
    slens = [len(WORD_RE.findall(s)) for s in sents]
    slens = [x for x in slens if x > 0]
    ns = len(slens) or 1
    paras = [p for p in text.split("\n\n") if p.strip()]
    if len(paras) < 2:
        paras = [p for p in text.split("\n") if p.strip()]

    per1k = 1000.0 / nw
    perkc = 1000.0 / chars

    # --- lexical -----------------------------------------------------------
    counts = Counter(words)
    f["lex_mattr_100"] = _mattr(words)
    f["lex_ttr_first400"] = _safe(len(set(words[:400])), min(nw, 400))
    f["lex_hapax_rate"] = _safe(sum(1 for c in counts.values() if c == 1), len(counts) or 1)
    f["lex_dis_rate"] = _safe(sum(1 for c in counts.values() if c == 2), len(counts) or 1)
    m1 = nw
    m2 = sum(c * c for c in counts.values())
    f["lex_yule_k"] = 1e4 * (m2 - m1) / (m1 * m1) if m1 else 0.0
    f["lex_mean_word_len"] = _safe(sum(len(w) for w in words), nw)
    f["lex_long_word_rate"] = _safe(sum(1 for w in words if len(w) >= 8), nw)
    f["lex_short_word_rate"] = _safe(sum(1 for w in words if len(w) <= 3), nw)
    f["lex_function_word_rate"] = _safe(sum(1 for w in words if w in STOPWORDS), nw)
    f["lex_the_rate"] = counts["the"] * per1k
    f["lex_of_rate"] = counts["of"] * per1k
    f["lex_and_rate"] = counts["and"] * per1k
    f["lex_to_rate"] = counts["to"] * per1k
    f["lex_a_rate"] = counts["a"] * per1k
    f["lex_that_rate"] = counts["that"] * per1k
    f["lex_is_rate"] = counts["is"] * per1k
    f["lex_it_rate"] = counts["it"] * per1k
    f["lex_1sg_rate"] = sum(counts[w] for w in FIRST_SING) * per1k
    f["lex_1pl_rate"] = sum(counts[w] for w in FIRST_PLUR) * per1k
    f["lex_2p_rate"] = sum(counts[w] for w in SECOND) * per1k
    f["lex_3p_rate"] = sum(counts[w] for w in THIRD) * per1k
    f["lex_contraction_rate"] = len(re.findall(r"\b\w+['’](?:t|s|re|ve|ll|d|m)\b", text, re.I)) * per1k
    f["lex_digit_token_rate"] = _safe(sum(1 for t in tokens if any(ch.isdigit() for ch in t)), len(tokens) or 1)
    f["lex_propernoun_approx_rate"] = _safe(
        sum(1 for w in words_cased[1:] if w[0].isupper() and w.lower() not in STOPWORDS), nw)
    f["lex_discourse_marker_rate"] = sum(counts[w] for w in DISCOURSE) * per1k
    f["lex_hedge_rate"] = sum(counts[w] for w in HEDGES) * per1k
    f["lex_booster_rate"] = sum(counts[w] for w in BOOSTERS) * per1k
    f["lex_cliche_word_rate"] = sum(counts[w] for w in CLICHE) * per1k
    low = text.lower()
    f["lex_cliche_phrase_rate"] = sum(low.count(p) for p in CLICHE_PHRASES) * per1k
    f["lex_cliche_any"] = 1.0 if (f["lex_cliche_word_rate"] + f["lex_cliche_phrase_rate"]) > 0 else 0.0

    # n-gram repetition
    bi = Counter(zip(words, words[1:]))
    tri = Counter(zip(words, words[1:], words[2:]))
    f["lex_distinct2"] = _safe(len(bi), max(nw - 1, 1))
    f["lex_distinct3"] = _safe(len(tri), max(nw - 2, 1))
    f["lex_repeat_trigram_rate"] = _safe(sum(c - 1 for c in tri.values() if c > 1), max(nw - 2, 1))
    f["lex_top_content_share"] = _safe(
        sum(c for w, c in counts.most_common(50) if w not in STOPWORDS), nw)

    # --- syntactic ---------------------------------------------------------
    mean_s = sum(slens) / ns
    var_s = sum((x - mean_s) ** 2 for x in slens) / ns
    sd_s = math.sqrt(var_s)
    f["syn_mean_sent_len"] = mean_s
    f["syn_sd_sent_len"] = sd_s
    f["syn_cv_sent_len"] = _safe(sd_s, mean_s)
    srt = sorted(slens)
    f["syn_iqr_sent_len"] = srt[int(0.75 * (ns - 1))] - srt[int(0.25 * (ns - 1))]
    f["syn_pct_short_sent"] = _safe(sum(1 for x in slens if x < 10), ns)
    f["syn_pct_long_sent"] = _safe(sum(1 for x in slens if x > 30), ns)
    f["syn_max_sent_len"] = max(slens)
    f["syn_min_sent_len"] = min(slens)
    f["syn_range_sent_len"] = max(slens) - min(slens)
    f["syn_n_sentences"] = ns
    f["syn_comma_per_sent"] = _safe(text.count(","), ns)
    f["syn_subordinator_rate"] = sum(counts[w] for w in SUBORDINATORS) * per1k
    openers = [WORD_RE.findall(s)[:1] for s in sents]
    openers = [o[0].lower() for o in openers if o]
    no = len(openers) or 1
    f["syn_coord_opener_rate"] = _safe(sum(1 for o in openers if o in COORD_OPENERS), no)
    f["syn_the_opener_rate"] = _safe(sum(1 for o in openers if o == "the"), no)
    f["syn_distinct_opener_ratio"] = _safe(len(set(openers)), no)
    ocount = Counter(openers)
    f["syn_max_opener_repeat"] = _safe(ocount.most_common(1)[0][1] if ocount else 0, no)
    ob = Counter(tuple(WORD_RE.findall(s)[:2]) for s in sents if WORD_RE.findall(s))
    f["syn_distinct_opener2_ratio"] = _safe(len(ob), no)
    passives = 0
    for i, w in enumerate(words[:-1]):
        if w in BE_FORMS:
            nxt = words[i + 1]
            if nxt.endswith("ed") or nxt in IRREGULAR_PP:
                passives += 1
            elif i + 2 < nw and (words[i + 2].endswith("ed") or words[i + 2] in IRREGULAR_PP):
                passives += 1
    f["syn_passive_approx_rate"] = _safe(passives, ns)
    f["syn_question_rate"] = _safe(sum(1 for s in sents if s.rstrip().endswith("?")), ns)
    f["syn_exclaim_rate"] = _safe(sum(1 for s in sents if s.rstrip().endswith("!")), ns)

    # --- rhythm ------------------------------------------------------------
    f["rhy_burstiness"] = _safe(sd_s - mean_s, sd_s + mean_s)
    f["rhy_autocorr_lag1"] = _autocorr(slens, 1)
    f["rhy_autocorr_lag2"] = _autocorr(slens, 2)
    f["rhy_spectral_flatness"] = _spectral_flatness(slens)
    f["rhy_masd_norm"] = _safe(
        sum(abs(slens[i + 1] - slens[i]) for i in range(ns - 1)) / max(ns - 1, 1), mean_s)
    slc = Counter(min(x // 5, 12) for x in slens)
    f["rhy_sentlen_entropy"] = _entropy(slc, ns) / math.log2(13)
    plens = [len(_sentences(p)) for p in paras] or [1]
    npar = len(plens)
    mp = sum(plens) / npar
    f["rhy_n_paragraphs"] = npar
    f["rhy_mean_para_sents"] = mp
    f["rhy_cv_para_sents"] = _safe(
        math.sqrt(sum((x - mp) ** 2 for x in plens) / npar), mp)
    pwords = [len(WORD_RE.findall(p)) for p in paras] or [nw]
    mpw = sum(pwords) / len(pwords)
    f["rhy_mean_para_words"] = mpw
    f["rhy_cv_para_words"] = _safe(
        math.sqrt(sum((x - mpw) ** 2 for x in pwords) / len(pwords)), mpw)

    # --- informational -----------------------------------------------------
    f["inf_word_entropy"] = _entropy(counts, nw)
    f["inf_word_entropy_norm"] = _safe(f["inf_word_entropy"], math.log2(len(counts) or 2))
    f["inf_char_entropy"] = _entropy(Counter(text), chars)
    raw = text.encode("utf-8")
    f["inf_compress_ratio"] = _safe(len(zlib.compress(raw, 9)), len(raw))
    alpha = re.sub(r"[^a-z ]", "", text.lower()).encode("utf-8")
    f["inf_compress_ratio_alpha"] = _safe(len(zlib.compress(alpha, 9)), len(alpha) or 1)
    f["inf_compress_ratio_words"] = _safe(
        len(zlib.compress(" ".join(words).encode("utf-8"), 9)), len(" ".join(words)) or 1)

    if background is not None:
        uni, default_lp, bi_lp, bi_default = background
        sur = [uni.get(w, default_lp) for w in words]
        m = sum(sur) / nw
        f["inf_surprisal_mean"] = m
        f["inf_surprisal_sd"] = math.sqrt(sum((x - m) ** 2 for x in sur) / nw)
        f["inf_surprisal_p95"] = sorted(sur)[int(0.95 * (nw - 1))]
        f["inf_rare_word_rate"] = _safe(sum(1 for x in sur if x > 14.0), nw)
        # uniform information density: how evenly surprisal is spread across
        # the text. Human writing is documented as *approximately* uniform;
        # the question is whether machine writing is more uniform still.
        f["inf_uid_masd"] = _safe(
            sum(abs(sur[i + 1] - sur[i]) for i in range(nw - 1)), max(nw - 1, 1))
        # per-sentence mean surprisal: variance across sentences
        idx, ss = 0, []
        for s in sents:
            k = len(WORD_RE.findall(s))
            if k:
                ss.append(sum(sur[idx:idx + k]) / k)
                idx += k
        if len(ss) > 1:
            msx = sum(ss) / len(ss)
            f["inf_uid_sent_var"] = sum((x - msx) ** 2 for x in ss) / len(ss)
        else:
            f["inf_uid_sent_var"] = 0.0
        bsur = []
        for i in range(nw - 1):
            bsur.append(bi_lp.get((words[i], words[i + 1]), bi_default))
        if bsur:
            mb = sum(bsur) / len(bsur)
            f["inf_bigram_surprisal_mean"] = mb
            f["inf_bigram_surprisal_sd"] = math.sqrt(
                sum((x - mb) ** 2 for x in bsur) / len(bsur))
            f["inf_bigram_known_rate"] = _safe(
                sum(1 for i in range(nw - 1) if (words[i], words[i + 1]) in bi_lp),
                max(nw - 1, 1))

    # --- punctuation and formatting ---------------------------------------
    for name, ch in (("comma", ","), ("semicolon", ";"), ("colon", ":"),
                     ("emdash", "—"), ("endash", "–"), ("hyphen", "-"),
                     ("exclaim", "!"), ("question", "?"), ("lparen", "("),
                     ("straight_quote", '"'), ("straight_apos", "'"),
                     ("curly_dq_open", "“"), ("curly_apos", "’"),
                     ("ellipsis_char", "…"), ("ampersand", "&"),
                     ("slash", "/"), ("asterisk", "*"), ("hash", "#")):
        f["pun_%s_per1kc" % name] = text.count(ch) * perkc
    f["pun_emdash_per1kw"] = text.count("—") * per1k
    f["pun_ellipsis_any"] = (text.count("…") + text.count("...")) * per1k
    f["pun_curly_share"] = _safe(
        text.count("’") + text.count("“") + text.count("”"),
        text.count("’") + text.count("“") + text.count("”")
        + text.count("'") + text.count('"') or 1)
    f["pun_double_space_rate"] = len(re.findall(r"\.  +", text)) * perkc
    f["pun_serial_comma_rate"] = len(re.findall(r",\s+(?:and|or)\s", text, re.I)) * per1k
    f["pun_rule_of_three_rate"] = len(re.findall(
        r"\b\w+,\s+\w+,?\s+and\s+\w+\b", text)) * per1k

    lines = text.split("\n")
    nl = len(lines) or 1
    f["fmt_md_heading_rate"] = _safe(sum(1 for l in lines if l.lstrip().startswith("#")), nl)
    f["fmt_md_bullet_rate"] = _safe(
        sum(1 for l in lines if re.match(r"\s*[-*•]\s+", l)), nl)
    f["fmt_md_numlist_rate"] = _safe(sum(1 for l in lines if re.match(r"\s*\d+[.)]\s+", l)), nl)
    f["fmt_md_bold_rate"] = len(re.findall(r"\*\*[^*]+\*\*", text)) * per1k
    f["fmt_any_markdown"] = 1.0 if (f["fmt_md_heading_rate"] + f["fmt_md_bullet_rate"]
                                    + f["fmt_md_bold_rate"]) > 0 else 0.0
    f["fmt_blankline_rate"] = _safe(sum(1 for l in lines if not l.strip()), nl)
    f["fmt_allcaps_rate"] = _safe(
        sum(1 for w in words_cased if len(w) > 2 and w.isupper()), nw)
    f["fmt_titlecase_line_rate"] = _safe(sum(
        1 for l in lines if l.strip() and len(l.split()) <= 12
        and sum(1 for w in l.split() if w[:1].isupper()) >= max(2, len(l.split()) * 0.6)), nl)
    f["fmt_emoji_rate"] = len(re.findall(
        r"[\U0001F300-\U0001FAFF☀-➿]", text)) * per1k
    f["fmt_nbsp_rate"] = text.count(" ") * perkc
    f["fmt_zerowidth_any"] = 1.0 if re.search(r"[​-‏⁠﻿]", text) else 0.0
    f["fmt_url_rate"] = len(re.findall(r"https?://", text)) * per1k
    f["fmt_mean_line_len"] = _safe(chars, nl)

    # --- discourse ---------------------------------------------------------
    f["dis_first_para_rel_len"] = _safe(pwords[0], mpw)
    f["dis_last_para_rel_len"] = _safe(pwords[-1], mpw)
    tail = " ".join(paras[-1:]).lower()
    f["dis_conclusion_marker"] = 1.0 if re.search(
        r"\b(in conclusion|in summary|to summarise|to summarize|ultimately|"
        r"in short|all in all|to conclude|the bottom line)\b", tail) else 0.0
    contentsets = []
    for p in paras:
        cs = {w.lower() for w in WORD_RE.findall(p) if w.lower() not in STOPWORDS}
        if cs:
            contentsets.append(cs)
    if len(contentsets) > 1:
        js, k = 0.0, 0
        for i in range(len(contentsets)):
            for j in range(i + 1, len(contentsets)):
                a, b = contentsets[i], contentsets[j]
                js += len(a & b) / len(a | b)
                k += 1
        f["dis_para_jaccard_mean"] = js / k
    else:
        f["dis_para_jaccard_mean"] = 0.0
    sentsets = []
    for s in sents:
        cs = {w.lower() for w in WORD_RE.findall(s) if w.lower() not in STOPWORDS}
        sentsets.append(cs)
    ov, k = 0.0, 0
    for i in range(len(sentsets) - 1):
        a, b = sentsets[i], sentsets[i + 1]
        if a and b:
            ov += len(a & b) / len(a | b)
            k += 1
    f["dis_adjacent_sent_cohesion"] = _safe(ov, k)
    return f


def build_background(texts):
    """Unigram and bigram log-probability tables for the surprisal features.

    Built from a slice of the corpus held out of every statistic reported, and
    balanced 50/50 AI/human so that neither side's vocabulary defines
    'expected'. Add-one smoothed; unseen types take the floor value."""
    uni, big = Counter(), Counter()
    for t in texts:
        w = [x.lower() for x in WORD_RE.findall(t)]
        uni.update(w)
        big.update(zip(w, w[1:]))
    tot = sum(uni.values()) or 1
    V = len(uni) + 1
    uni_lp = {w: -math.log2((c + 1) / (tot + V)) for w, c in uni.items()}
    default_lp = -math.log2(1 / (tot + V))
    big = {k: c for k, c in big.items() if c >= 2}
    btot = sum(big.values()) or 1
    bV = len(big) + 1
    big_lp = {k: -math.log2((c + 1) / (btot + bV)) for k, c in big.items()}
    b_default = -math.log2(1 / (btot + bV))
    return uni_lp, default_lp, big_lp, b_default
