export type CheckerLevelId =
  | 'signal-likely-human'
  | 'signal-unclear'
  | 'signal-potentially-ai'
  | 'signal-likely-ai'
  | 'signal-strongly-ai';

export type CheckerMethodStatus =
  | 'pass' | 'attention' | 'fail' | 'inconclusive'
  | 'unsupported' | 'not_configured' | 'not_run' | 'error';

/** A colour in both renderer forms: CSS hex and a PDF RGB triple in the 0-1 range. */
export interface ReportColour {
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
}

export interface ReportLevel {
  readonly id: CheckerLevelId | null;
  readonly label: string;
  /** Position on the five-band scale, or -1 when nothing was assessed. */
  readonly index: number;
  readonly colour: ReportColour;
  readonly meaning: string;
}

export interface ReportAxis {
  readonly id: 'ai' | 'integrity' | 'editorial';
  readonly label: string;
  readonly value: string;
  readonly status: CheckerMethodStatus;
  readonly statusLabel: string;
  readonly detail: string;
  readonly limitations: readonly string[];
  readonly colour: ReportColour;
}

export interface ReportSection {
  readonly index: number;
  /** One-based number shown to the reader; `index` stays the engine's zero-based index. */
  readonly number: number;
  readonly level: ReportLevel;
  readonly displayScore: string;
  readonly rawMargin: number | null;
  readonly words: number | null;
  /** "1 word" / "58 words", or null when the section records no word count. */
  readonly wordsPhrase: string | null;
  readonly locator: string;
  readonly passage: string;
  readonly evidence: readonly string[];
  readonly strongest: boolean;
  /** 0-1 bar fill: how far the raw score leans away from the middle of the scale. */
  readonly barFill: number;
}

export interface ReportMethod {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly status: CheckerMethodStatus;
  readonly statusLabel: string;
  readonly location: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly evidence: string;
  readonly limitations: readonly string[];
}

export interface ReportWatermark {
  readonly id: string;
  readonly name: string;
  readonly outcome: string;
  readonly status: CheckerMethodStatus;
  readonly statusLabel: string;
  readonly keyScope: string;
  readonly limitations: readonly string[];
}

export interface ReportRoute {
  readonly name: string;
  readonly kind: string;
  readonly privacy: string;
  readonly consent: string;
  readonly modelIdentity: string;
  readonly contracts: string;
  readonly flagRule: string;
  readonly artefactHash: string;
}

export interface ReportModel {
  readonly productName: string;
  readonly productUrl: string;
  readonly surfaceName: string;
  readonly title: string;
  readonly strapline: string;
  readonly honestyLine: string;
  readonly generatedAt: string;
  readonly dateLabel: string;
  readonly resultId: string;
  readonly profile: string;
  readonly assessed: boolean;
  readonly level: ReportLevel;
  readonly displayScore: string | null;
  readonly scoreScale: string;
  readonly meaning: string;
  readonly strongestSentence: string | null;
  readonly modelReason: string;
  readonly gauge: {
    readonly position: number;
    readonly bands: readonly { readonly id: CheckerLevelId; readonly label: string; readonly colour: ReportColour; readonly current: boolean }[];
  };
  readonly axes: readonly [ReportAxis, ReportAxis, ReportAxis];
  readonly draft: {
    readonly words: string;
    readonly characters: string;
    /** "1 word" / "120 words". Always agrees with the count. */
    readonly wordsPhrase: string;
    /** "1 character" / "120 characters". */
    readonly charactersPhrase: string;
    readonly sectionCount: number;
    /** "1 section" / "2 sections". */
    readonly sectionsPhrase: string;
    readonly language: string;
    readonly contentType: string;
    readonly contentHash: string;
    readonly normalisedHash: string;
  };
  readonly route: ReportRoute;
  readonly sections: readonly ReportSection[];
  readonly strongest: ReportSection | null;
  readonly characterFindings: readonly string[];
  readonly writingFindings: readonly string[];
  readonly protectedFacts: {
    readonly count: number;
    readonly categories: readonly string[];
    /** "1 protected item" / "3 protected items". */
    readonly phrase: string;
    /** The complete sentence, with the verb agreeing: "1 protected item was identified…". */
    readonly sentence: string;
    /** "Category: Organisation." / "Categories: …" / "No categories were recorded." */
    readonly categoriesSentence: string;
  };
  readonly c2paText: { readonly status: string; readonly wrapperProtected: boolean; readonly limitations: readonly string[] } | null;
  readonly c2paFiles: readonly {
    readonly label: string; readonly status: string; readonly trust: string;
    readonly mediaType: string; readonly fileHash: string; readonly limitations: readonly string[];
  }[];
  readonly watermarks: readonly ReportWatermark[];
  readonly methods: readonly ReportMethod[];
  /** "1 named check" / "6 named checks". */
  readonly methodsPhrase: string;
  readonly meansPanel: {
    readonly meansTitle: string; readonly means: readonly string[];
    readonly notTitle: string; readonly not: readonly string[];
  };
  readonly correctUse: readonly string[];
  readonly pdfCharacterNote: string;
  readonly limitations: readonly string[];
  readonly runRecord: readonly (readonly [string, string])[];
}

export interface ReportOptions {
  /** ISO timestamp for the printed date. Defaults to `result.generated_at`. */
  generatedAt?: string;
  /** Canonical product and support destination. */
  productUrl?: string;
  /** The surface that produced the report, for example "WordPress" or "Chrome extension". */
  surfaceName?: string;
  /** Report title. Defaults to "AI content integrity report". */
  title?: string;
  /** Surface-specific route and privacy sentence, used instead of the contract's own. */
  privacyStatement?: string;
  /** Level label overrides, so a surface can adopt Lane D1's vocabulary verbatim. */
  levelLabels?: Readonly<Partial<Record<CheckerLevelId, string>>>;
  /**
   * The local draft. When supplied, each section's passage is sliced from it using the recorded
   * UTF-16 offsets, so a surface that still holds the text prints the exact scored characters.
   * Throws `report_source_text_bounds_invalid` when the draft and the result have drifted apart.
   */
  sourceText?: string;
}

export const LEVEL_ORDER: readonly CheckerLevelId[];
export const LEVEL_LABELS: Readonly<Record<CheckerLevelId, string>>;
export const LEVEL_COLOURS: Readonly<Record<CheckerLevelId, ReportColour>>;

/** Tone names the fill palette resolves to. `data-tone` in the HTML, an ink key in the PDF. */
export type ReportTone = 'human' | 'unclear' | 'potential' | 'likely' | 'strong' | 'neutral' | 'orange' | 'blue';

/** Fill colour (lower-case hex) to tone name. */
export const TONE_BY_HEX: Readonly<Record<string, ReportTone>>;

/** Tone for a model colour or a raw hex string; `neutral` when the colour is unrecognised. */
export function toneOf(colour: ReportColour | string | null | undefined): ReportTone;

/** The readable text ink for each tone on light output, in both renderer forms. */
export const REPORT_INKS: Readonly<Record<ReportTone, ReportColour>>;

/** The ink for a fill-palette colour, or null when the colour is already a text ink. */
export function inkFor(colour: ReportColour | string | null | undefined): ReportColour | null;
export const HONESTY_LINE: string;
export const PRODUCT_NAME: string;
export const DEFAULT_PRODUCT_URL: string;

export function humanise(value: unknown): string;

/** The singular form only for exactly one; 0 and 1.5 both take the plural. */
export function pluralise(count: number, singular: string, plural?: string): string;

/** "1 word", "120 words", or `fallback` when the count is not a finite number. */
export function countPhrase(count: number, singular: string, plural?: string, fallback?: string): string;
export function describeValue(value: unknown): string;

/** Turn a canonical checker-result into the model both renderers draw from. Fails closed. */
export function buildReportModel(result: unknown, options?: ReportOptions): ReportModel;
