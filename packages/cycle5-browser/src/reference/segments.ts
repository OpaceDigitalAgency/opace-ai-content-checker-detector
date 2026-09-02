/**
 * Whole-document segmentation for the Tier 3 classifier.
 *
 * THIS FILE IS THE REFERENCE IMPLEMENTATION FOR EVERY ROUTE. The browser
 * classifier uses it directly; the server route (Cloud Run) must mirror it
 * exactly, because the same document has to score the same however it was
 * checked. The contract the server has to match is written out in full under
 * "SERVER PARITY CONTRACT" below, and SEGMENTATION_CONTRACT is the version
 * both sides should assert on.
 *
 * The classifier reads at most 512 WordPiece tokens, so before this module a
 * 3,000-word draft was judged entirely on its opening. The document is cut
 * into consecutive segments that each fit inside that window, every segment is
 * scored, and the document verdict is the HIGHEST segment score.
 *
 * Measured through the shipped browser runtime (onnxruntime-web WASM, the
 * TypeScript WordPiece tokeniser, the shipped calibratedProbability) on 45 AI
 * and 45 human long-form documents over 700 words drawn from the 5,558-document
 * long-form corpus, at the RETIRED 0.984 flag point, which was the shipped rule
 * on the day this was measured and is not the shipped rule now — that is the
 * minimum-evidence pair 0.9855 / 0.9763. The corpus was described here as
 * never-seen; that was retracted on 30 August 2026, because 268 of its 922 AI
 * documents sit in a cycle-2 split, 168 of them in training:
 *
 *   opening only (the previous behaviour) ... 88.9% AI detected (40/45)
 *   every segment, take the highest ......... 93.3% AI detected (42/45)
 *   every segment, averaged ................. 57.8% AI detected (26/45)
 *
 * Human false positives were unchanged: the same 2 of 45 human documents
 * flagged under the opening-only method and under highest-segment scoring, and
 * 0 of 45 under averaging.
 *
 * Averaging dilutes: one AI section inside an otherwise human document is
 * washed out by the human sections. On 40 documents built from a human
 * 300-word opening followed by an AI body, opening-only scoring caught 35.0%
 * (14/40) and highest-segment scoring caught 97.5% (39/40). The maximum is
 * therefore the aggregation, and it costs nothing in false positives.
 *
 * ---------------------------------------------------------------------------
 * WHY v2 REPLACED THE WORD-COUNT RULE (measured 29 August 2026)
 *
 * v1 cut every 340 words, on the premise that 340 words always fits inside 512
 * WordPiece tokens. It does not. Tokenising every v1 segment of the whole
 * 5,558-document fresh long-form corpus without truncation:
 *
 *   segments at or over the 512-token window ... 1,348 of 23,318 (5.78%)
 *   documents with at least one such segment ...   684 of  5,558 (12.31%)
 *   worst single segment ....................... 3,406 tokens (2,894 dropped)
 *   tokens silently dropped, corpus-wide ....... 276,466 of 9,287,413 (2.98%)
 *
 * Word-to-token expansion ran from 1.04 to 3.89 tokens per word over that
 * corpus, because WordPiece splits unfamiliar and technical words into several
 * pieces. The proxy failed hardest exactly where the tool is weakest anyway:
 * AI academic literature reviews (26.2% of documents affected) and AI white
 * papers (25.2%). One long document in eight was still silently losing text —
 * the exact defect segmentation exists to remove.
 *
 * v2 therefore bounds a segment by MEASURED TOKENS, not by a word proxy. The
 * tail-rebalancing special case of v1 disappears into the general rule: the
 * document is cut into the fewest segments that all fit, as near equal in
 * tokens as word boundaries allow, so a short trailing fragment can no longer
 * arise and MIN_TAIL_WORDS is no longer needed.
 *
 * ---------------------------------------------------------------------------
 * SERVER PARITY CONTRACT (v2) — implement exactly this, in this order:
 *
 *  1. Words are the matches of the regex /\S+/ over the raw submitted text,
 *     Unicode-aware. Nothing is normalised, lower-cased or stripped first.
 *  2. Every word is tokenised on its own and its WordPiece token count
 *     measured, with no special tokens and no truncation. Whole-document
 *     tokenisation decomposes exactly across /\S+/ boundaries — verified
 *     token-for-token on all 5,558 documents of the fresh long-form corpus and
 *     on the eight golden texts — so a segment's token count is the sum of its
 *     words' counts. Each word is one ATOM, with one exception: a word whose
 *     own token count exceeds SEGMENT_TOKEN_BUDGET (basic tokenisation splits
 *     punctuation out before WordPiece runs, so a 987-character ":;:;:;..."
 *     run tokenises to 987 tokens) is cut into consecutive slices of at most
 *     SEGMENT_TOKEN_BUDGET UTF-16 code units, each slice is an atom, and each
 *     such atom is forced into a segment of its own. A WordPiece token never
 *     consumes fewer than one code unit, so such a slice can never exceed the
 *     budget. That fallback fired on 1 word in 6,916,005 measured; it exists
 *     so the bound is a proof rather than an observation.
 *  3. If the whole document fits — total measured tokens plus [CLS] and [SEP]
 *     at or under MODEL_MAX_TOKENS — there is exactly ONE segment: start 0,
 *     end text.length, text === the submitted text, byte for byte. Short
 *     drafts therefore score exactly as they did before segmentation existed,
 *     and v2 keeps whole 72 documents in that corpus which v1 split needlessly.
 *  4. Otherwise the document is cut into the FEWEST segments that all fit.
 *     Start with parts = ceil(totalTokens / SEGMENT_TOKEN_BUDGET). Cut j (for
 *     j = 1 .. parts-1) falls at the first atom whose running token total
 *     reaches j/parts of the document total — integer arithmetic only,
 *     cum[at] * parts >= j * total, so no rounding rule can drift between the
 *     two implementations — forced strictly increasing and clamped to
 *     atomCount - (parts - j) so a parts-way split always yields parts
 *     segments. Union that with the cuts an oversized word forces. Then MEASURE
 *     every resulting segment; if any exceeds MODEL_MAX_TOKENS, add one part
 *     and repeat. This terminates because at parts === atomCount the clamp
 *     pins every cut to one atom per segment, and every atom fits by rule 2.
 *  5. Segment boundaries in characters: the first segment starts at 0; a
 *     segment ends at the END OFFSET of the last atom in its chunk, except the
 *     final segment which ends at text.length; each segment starts where the
 *     previous one ended. Segments are therefore contiguous and cover every
 *     character exactly once, whitespace included, which is what lets the
 *     interface highlight the passage a score came from. Offsets are UTF-16
 *     code units, matching JavaScript string indices exactly.
 *  6. Each segment is tokenised and scored exactly as a whole short document
 *     is, and the document verdict is the MAXIMUM segment probability. Never
 *     the mean. Scoring order is free — see SCORING_ORDER — because the
 *     maximum does not depend on it.
 *
 * Golden cases for a server-side unit test. Word counts alone no longer
 * determine the split, so each case names the text it is built from; all were
 * produced by this implementation and are asserted by test_segments.py.
 *
 *   text (trailing space trimmed)          -> segment words / segment tokens
 *   "word " x 340    (  342 tokens)        -> [340]                / [342]
 *   "word " x 505    (  507 tokens)        -> [505]                / [507]
 *   "word " x 511    (  513 tokens)        -> [256, 255]           / [258, 257]
 *   "word " x 520    (  522 tokens)        -> [260, 260]           / [262, 262]
 *   "word " x 1020   ( 1022 tokens)        -> [510, 510]           / [512, 512]
 *   "word " x 1021   ( 1023 tokens)        -> [341, 340, 340]      / [343, 342, 342]
 *   "word " x 3000   ( 3002 tokens)        -> [500] x 6            / [502] x 6
 *   "hippopotomonstrosesquippedaliophobia " x 400, 12 tokens a word
 *                    ( 4802 tokens)        -> [40] x 10            / [482] x 10
 *   ":" x 900        (  902 tokens, ONE word) -> [1, 0]            / [512, 392]
 *
 * The last case is the oversized-word fallback: the single word is sliced at
 * 510 code units and each slice gets a segment to itself, so the second
 * segment contains no whole word and reports 0. The 511-word case is the one
 * that shows v1's premise failing in miniature: 511 words of the simplest
 * possible English already needs two passes, and 400 dense words needs ten.
 *
 * If the two implementations ever disagree, the same document scores
 * differently depending on the route, which is worse than either bug alone.
 * ---------------------------------------------------------------------------
 */
/** Bump when any rule in the SERVER PARITY CONTRACT changes. Both routes should record it beside the score. */
/**
 * v3 (2026-08-29) does NOT change where text is cut. Boundaries, token budget
 * and character offsets are byte-identical to v2. What changed is how section
 * scores combine into a verdict: minimum evidence, the highest section OR the
 * second-highest at a lower flag point. The contract covers verdict derivation
 * as well as segmentation, because this page re-derives the verdict from the
 * sections and would otherwise silently accept a server applying a different
 * rule. Bumping it makes a partial deploy refuse loudly instead. Server first,
 * then the site.
 */
export const SEGMENTATION_CONTRACT="segments-v3";
/** The classifier's context window, and the two positions every pass spends on [CLS] and [SEP]. */
export const MODEL_MAX_TOKENS=512;
export const SPECIAL_TOKENS=2;
/** What is left of the window for text. A segment may never exceed this. */
export const SEGMENT_TOKEN_BUDGET=MODEL_MAX_TOKENS-SPECIAL_TOKENS;
/** Median segment length in words over the 5,558-document corpus. Interface copy only; nothing branches on it. */
export const TYPICAL_SEGMENT_WORDS=340;

/** A consecutive slice of the draft. Offsets are UTF-16 indices into the original text, so the interface can highlight exactly the passage that was scored. */
export type TextSegment={index:number;start:number;end:number;words:number;text:string;tokens:number};
/** Measures WordPiece tokens for each string, with no special tokens and no truncation. */
export type TokenCounter=(strings:string[])=>number[];

const WORD=/\S+/gu;

/**
 * The indivisible units segmentation packs, one per word except for a word too
 * big for the window on its own (rule 2 of the contract).
 */
const atomsOf=(text:string,countTokens:TokenCounter)=>{
  const words:Array<{start:number;end:number}>=[];
  WORD.lastIndex=0;
  for(let match=WORD.exec(text);match;match=WORD.exec(text))words.push({start:match.index,end:match.index+match[0].length});
  const counts=countTokens(words.map(word=>text.slice(word.start,word.end)));
  const spans:Array<{start:number;end:number}>=[];
  const tokens:number[]=[];
  const isWordStart:boolean[]=[];
  const forced:boolean[]=[];
  const oversized:number[]=[];
  for(let index=0;index<words.length;index++){
    const word=words[index];
    if(counts[index]<=SEGMENT_TOKEN_BUDGET){
      spans.push(word);tokens.push(counts[index]);isWordStart.push(true);forced.push(false);
      continue;
    }
    let at=word.start,first=true;
    while(at<word.end){
      const stop=Math.min(at+SEGMENT_TOKEN_BUDGET,word.end);
      spans.push({start:at,end:stop});
      oversized.push(spans.length-1);
      tokens.push(0);            // measured below, in one batch
      isWordStart.push(first);
      forced.push(true);
      first=false;
      at=stop;
    }
  }
  if(oversized.length){
    const measured=countTokens(oversized.map(index=>text.slice(spans[index].start,spans[index].end)));
    oversized.forEach((index,position)=>{tokens[index]=measured[position];});
  }
  return {spans,tokens,isWordStart,forced};
};

/** Atom indices to cut after, for a `parts`-way near-equal split by tokens (rule 4). */
const cutsFor=(cum:number[],total:number,parts:number,forcedCuts:number[],atomCount:number)=>{
  const cuts:number[]=[];
  let previous=0;
  for(let j=1;j<parts;j++){
    const target=j*total;
    let at=previous+1;
    while(at<atomCount&&cum[at]*parts<target)at++;
    // Leave room for the cuts still to come, so a parts-way split always
    // yields parts segments. At parts === atomCount this pins cut j to atom j,
    // one atom per segment, which is what makes the widening loop terminate.
    const ceiling=atomCount-(parts-j);
    if(at>ceiling)at=ceiling;
    cuts.push(at);
    previous=at;
  }
  const merged=[...new Set([...cuts,...forcedCuts])].sort((a,b)=>a-b);
  return merged.filter(cut=>cut>0&&cut<atomCount);
};

/**
 * Consecutive, non-overlapping segments covering the whole text, every one of
 * them measured to fit inside the 512-token window.
 *
 * A document that fits whole returns exactly one segment whose text is the
 * input, character for character, so short drafts score precisely as they did
 * before segmentation existed. Segments are contiguous: each one begins where
 * the previous ended, so the whitespace between them belongs to the following
 * segment and every character of the draft is covered exactly once.
 */
export const segmentText=(text:string,countTokens:TokenCounter):TextSegment[]=>{
  const {spans,tokens,isWordStart,forced}=atomsOf(text,countTokens);
  const atomCount=spans.length;
  const cum=[0];
  for(const count of tokens)cum.push(cum[cum.length-1]+count);
  const total=cum[atomCount];
  const anyForced=forced.some(Boolean);
  if(total+SPECIAL_TOKENS<=MODEL_MAX_TOKENS&&!anyForced){
    const words=isWordStart.filter(Boolean).length;
    return [{index:0,start:0,end:text.length,words,text,tokens:total+SPECIAL_TOKENS}];
  }
  const forcedCuts:number[]=[];
  for(let index=0;index<atomCount;index++)if(forced[index]){forcedCuts.push(index);forcedCuts.push(index+1);}
  let parts=Math.max(1,Math.ceil(total/SEGMENT_TOKEN_BUDGET));
  let cuts:number[]=[],starts:number[]=[],ends:number[]=[],pieces:string[]=[],measured:number[]=[];
  for(;;){
    cuts=cutsFor(cum,total,parts,forcedCuts,atomCount);
    starts=[0,...cuts.map(cut=>spans[cut-1].end)];
    ends=[...cuts.map(cut=>spans[cut-1].end),text.length];
    pieces=starts.map((start,index)=>text.slice(start,ends[index]));
    measured=countTokens(pieces).map(count=>count+SPECIAL_TOKENS);
    if(measured.every(count=>count<=MODEL_MAX_TOKENS)||parts>=atomCount)break;
    parts++;
  }
  const edges=[...cuts,atomCount];
  const segments:TextSegment[]=[];
  let firstAtom=0;
  for(let index=0;index<edges.length;index++){
    let words=0;
    for(let atom=firstAtom;atom<edges[index];atom++)if(isWordStart[atom])words++;
    segments.push({index,start:starts[index],end:ends[index],words,text:pieces[index],tokens:measured[index]});
    firstAtom=edges[index];
  }
  return segments;
};

/**
 * The order the segments are SCORED in, which is not the order they are shown
 * in. The verdict is the maximum, so the order cannot change the answer; it
 * only changes how soon the user sees the strongest evidence.
 *
 * A long document is many forward passes and takes tens of seconds in a
 * browser, so the sections most likely to carry the signal are scored first:
 * the middle, then the end, then the opening, then the rest in document order.
 * The opening is the part a writer polishes by hand, and the case this whole
 * change exists for is a human opening in front of an AI body — so scoring
 * strictly left to right is the worst possible order for surfacing a verdict
 * early. With this order the running best is usually settled within three
 * passes and the remaining sections only refine where the evidence sits.
 *
 * The server may score in any order, including plain document order; parity is
 * about the segments and the maximum, never the sequence.
 */
export const scoringOrder=(count:number):number[]=>{
  if(count<=1)return count===1?[0]:[];
  const first=[Math.floor((count-1)/2),count-1,0];
  const order:number[]=[];
  const seen=new Set<number>();
  for(const index of first)if(index>=0&&index<count&&!seen.has(index)){seen.add(index);order.push(index);}
  for(let index=0;index<count;index++)if(!seen.has(index)){seen.add(index);order.push(index);}
  return order;
};
