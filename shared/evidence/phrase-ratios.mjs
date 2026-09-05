/** Mechanically ported from the website evidence implementation, 5 September 2026. Canonical portable source; measurement logic unchanged. */
/**
 * Phrase frequency ratios: how much more often a phrase from the reader's own
 * draft occurs in machine-written documents than in human ones.
 *
 * This is not the classifier explaining itself, and it is not offered as one.
 * It is a separate corpus lookup, which is exactly why it can be checked: the
 * phrase comes from the reader's text, the counts come from a named corpus, and
 * both are printed. Nothing here feeds the verdict, and nothing here is
 * evidence about the reader's draft in particular — a tendency measured across
 * thousands of documents is not a mark against one sentence.
 *
 * WHAT THE MEASUREMENT COST, AND WHY THE TABLE IS SMALL
 * -----------------------------------------------------
 * Full write-up: `docs/measurements/AI-PHRASE-RATIOS.md` in the engine
 * repository. Three things shaped what ships.
 *
 * 1. **The first ranking was an artefact and had to be thrown away.** Built on
 *    raw text, the strongest "AI phrases" in our corpus were "per cent of",
 *    "per cent in" and "cent of the", at 30x, 28x and 28x. They are not machine
 *    tells: our AI half was generated in British English and our human half is
 *    largely American. "per cent" appears in 29.9% of our AI documents against
 *    1.4% of the human ones. Spelling is now normalised to one convention on
 *    both sides before anything is counted.
 *
 * 2. **The corpus is small for this, and the minimum-count floor is what keeps
 *    it honest.** A phrase seen in three AI documents and no human ones has an
 *    undefined ratio; smoothing it produces a large number that looks like
 *    evidence. Requiring at least five documents on BOTH sides leaves 2,503
 *    three-word phrases, 251 four-word and 21 five-word across the whole
 *    corpus — which is why nothing longer than three words is published.
 *
 * 3. **Register is controlled, and the ratios are intervals.** A phrase must
 *    lean AI inside every register with enough documents to test, and its
 *    held-out interval must exclude 1. The intervals are still wide, commonly a
 *    factor of five end to end, and the display shows them rather than a point
 *    estimate.
 */
/*
 * The shipped table is NOT imported here. It is bound in `phrase-table.ts`, so
 * everything in this file is a pure function over a table passed in. That keeps
 * the matching logic testable without a JSON import — the unit runner cannot
 * load a `.json` module without an import attribute, which is why no existing
 * unit test covers `content-integrity-detection-tables.json` either — and it
 * makes the table swappable when a larger corpus produces a better one.
 */
/**
 * The same spelling normalisation the counting used, ported from
 * `research/phrase-ratios/normalise.py`. A draft normalised differently from
 * the corpus would simply fail to match, silently, which is the worst kind of
 * defect for a panel whose whole claim is that the phrase came from your text.
 */
const WORDS = {
    colour: "color", colours: "colors", coloured: "colored",
    behaviour: "behavior", behaviours: "behaviors", behavioural: "behavioral",
    favour: "favor", favours: "favors", favoured: "favored", favourable: "favorable",
    labour: "labor", honour: "honor", neighbour: "neighbor", neighbours: "neighbors",
    centre: "center", centres: "centers", theatre: "theater", metre: "meter",
    metres: "meters", fibre: "fiber", litre: "liter",
    defence: "defense", offence: "offense", licence: "license", practise: "practice",
    programme: "program", programmes: "programs",
    analyse: "analyze", analysed: "analyzed", analysing: "analyzing",
    catalogue: "catalog", dialogue: "dialog",
    travelled: "traveled", travelling: "traveling", modelled: "modeled",
    modelling: "modeling", labelled: "labeled", labelling: "labeling",
    whilst: "while", amongst: "among", towards: "toward",
    learnt: "learned", spelt: "spelled", burnt: "burned",
    sceptical: "skeptical", sceptic: "skeptic",
    grey: "gray", storey: "story", kerb: "curb"
};
const WORD_KEYS = Object.keys(WORDS).sort((a, b) => b.length - a.length);
const WORD_RE = new RegExp(`\\b(${WORD_KEYS.join("|")})\\b`, "g");
export const normaliseSpelling = (text) => {
    let out = text.replace(/\bper cent\b/gi, "percent");
    out = out.replace(WORD_RE, match => WORDS[match] ?? match);
    out = out.replace(/\b(\w+?)isation\b/g, "$1ization");
    out = out.replace(/\b(\w+?)ise\b/g, "$1ize");
    out = out.replace(/\b(\w+?)ised\b/g, "$1ized");
    out = out.replace(/\b(\w+?)ising\b/g, "$1izing");
    return out.replace(/\b(\w+?)iser\b/g, "$1izer");
};
/**
 * Find table phrases in a draft.
 *
 * Tokenises the draft the way the counting did — whitespace-split, lower-cased,
 * outer quotes and brackets stripped, inner punctuation kept — while carrying
 * each token's offset in the original string, so a hit can be pointed at
 * without re-searching the text and risking a different match.
 */
export const findPhrasesIn = (table, draft) => {
    if (!draft.trim())
        return [];
    const tokens = [];
    const re = /\S+/gu;
    for (let m = re.exec(draft); m !== null; m = re.exec(draft)) {
        const raw = m[0];
        const lead = raw.length - raw.replace(/^["“”‘’([{«]+/, "").length;
        const trail = raw.length - raw.replace(/["“”‘’)\]}»]+$/, "").length;
        const body = raw.slice(lead, raw.length - trail);
        if (!body)
            continue;
        tokens.push({
            text: normaliseSpelling(body.toLowerCase()),
            start: m.index + lead,
            end: m.index + raw.length - trail
        });
    }
    const wanted = new Map(table.phrases.map(row => [row.phrase, row]));
    const longest = Math.max(0, ...table.phrases.map(p => p.phrase.split(" ").length));
    const firstHit = new Map();
    for (let i = 0; i < tokens.length; i++) {
        for (let n = 1; n <= longest && i + n <= tokens.length; n++) {
            const key = tokens.slice(i, i + n).map(t => t.text).join(" ");
            const row = wanted.get(key);
            if (!row)
                continue;
            const existing = firstHit.get(key);
            if (existing) {
                existing.occurrences += 1;
                continue;
            }
            firstHit.set(key, {
                row, start: tokens[i].start, end: tokens[i + n - 1].end,
                matched: draft.slice(tokens[i].start, tokens[i + n - 1].end), occurrences: 1
            });
        }
    }
    // Strongest evidence first, then by where it appears, so the order is stable.
    return [...firstHit.values()].sort((a, b) => b.row.held_out_ratio_low - a.row.held_out_ratio_low || a.start - b.start);
};
/**
 * How the ratio is written for a reader. Always a range, never a point
 * estimate: the intervals are wide and a single number would imply a precision
 * this corpus size does not support.
 */
export const ratioLabel = (row) => `${row.held_out_ratio_low}–${row.held_out_ratio_high}× more often`;
