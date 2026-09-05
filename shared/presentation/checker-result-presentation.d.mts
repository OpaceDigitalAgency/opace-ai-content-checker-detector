import type { AnalysisResult, MethodResult } from '@opace/content-integrity-contracts';

export type CheckerLevelId = 'signal-strongly-ai' | 'signal-likely-ai' | 'signal-potentially-ai' | 'signal-unclear' | 'signal-likely-human';
export type CheckerSurface = 'Chrome extension' | 'Astro toolbar';

export interface CheckerSection {
  index: number;
  start_utf16: number;
  end_utf16: number;
  word_count: number;
  raw_score: number;
  raw_margin: number;
  display_score: string;
  level: CheckerLevelId;
  passage?: string;
  evidence: Array<{ id: string; kind: string; summary: string; detail?: string; basis?: string }>;
  [key: string]: unknown;
}

export interface CanonicalCheckerResult {
  schema_version: '1.0';
  contract_version: string;
  result_id: string;
  profile: 'full_checker' | 'primitive';
  generated_at: string;
  contains_content: boolean;
  source: { content_hash: string; normalised_hash: string; content_type: string; language: string; word_count: number; character_count: number; section_count: number };
  route: { kind: string; location: string; content_transfer: string; privacy_route: string; retention: Record<string, unknown>; consent: string; model: null | { identity: string; precision: string; [key: string]: unknown }; [key: string]: unknown };
  axes: {
    ai_pattern: { assessment_status: 'assessed' | 'not_assessed' | 'withheld' | 'error'; method_status: string; source: string | null; raw_score: number | null; raw_margin: number | null; display_score: string | null; score_scale: string; level: CheckerLevelId | null; primary_display_threshold: number | null; secondary_display_threshold: number | null; flagged: boolean | null; flag_reason: string | null; strongest_section_index: number | null; reason: string; limitations: string[] };
    text_integrity: { method_status: string; reading: string; reason: string; findings: Record<string, unknown>[]; limitations: string[] };
    editorial: { method_status: string; reading: string; reason: string; findings: Record<string, unknown>[]; limitations: string[] };
  };
  sections: CheckerSection[];
  methods: MethodResult[];
  provenance: { protected_facts: { count: number; categories: string[] }; [key: string]: unknown };
  exports: { report: { available: boolean; format: string; complete_evidence: boolean; [key: string]: unknown }; [key: string]: unknown };
  abuse_controls: Record<string, unknown>;
  limitations: string[];
  [key: string]: unknown;
}

export interface LegacyAdapterOptions {
  /** Any named surface, e.g. 'WordPress Lab', 'Chrome side panel', 'Node CLI'. */
  surface: string;
  characterCount: number;
  maxCharacters: number;
  refuseNotTruncate: boolean;
}

export interface ResultPresentation {
  result: CanonicalCheckerResult;
  surface: string;
  brandAssetUrl: string;
  axes: Array<{ id: 'ai' | 'integrity' | 'editorial'; label: string; value: string; state: string; detail: string }>;
  methods: Array<{ id: string; name: string; version: string; status: string; route: string; limitation: string }>;
  limitations: string[];
}

export const CHECKER_LEVEL_LABELS: Readonly<Record<CheckerLevelId, string>>;
export const INTEGRITY_READINGS: Readonly<Record<string, string>>;
export const EDITORIAL_READINGS: Readonly<Record<string, string>>;
export const PRODUCT_MARK_SVG: string;
export function adaptLegacyAnalysisResult(result: AnalysisResult, options: LegacyAdapterOptions): CanonicalCheckerResult;
export function buildResultPresentation(result: CanonicalCheckerResult, options: { surface: string; brandAssetUrl: string }): ResultPresentation;
export function escapeResultHtml(value: unknown): string;
export function renderResultShell(presentation: ResultPresentation): string;
export const RESULT_SHELL_CSS: string;

/* -- Website-grade result presentation (Lane D1) -------------------------- */

export type CheckerMethodStatus =
  | 'pass' | 'attention' | 'fail' | 'inconclusive'
  | 'unsupported' | 'not_configured' | 'not_run' | 'error';

/**
 * An action the surface owns. The renderer draws the control and marks it
 * `data-oaci-noprint`; the surface supplies the behaviour.
 */
export interface CheckerAction {
  /** Stable id reported back through `onAction` and the `oaci:action` event. */
  id: string;
  label: string;
  /** Optional single glyph or emoji drawn before the label. */
  glyph?: string;
  /** Optional tooltip. */
  description?: string;
  disabled?: boolean;
}

export interface CheckerUiOptions {
  /** Where this result is being shown, e.g. "WordPress Lab", "Chrome side panel". */
  surface: string;
  /** Defaults to the embedded PRODUCT_LOGO_DATA_URI. Any packaged URL is accepted. */
  logoDataUri?: string;
  /** Complete markup for the logo slot, used instead of an <img>. */
  logoHtml?: string;
  /** Heading level for the masthead. 1-3, default 2. Everything below nests from it. */
  headingLevel?: number;
  /** Prefix for generated element ids, so two results can share a page. Default "oaci". */
  idPrefix?: string;
  actions?: CheckerAction[];
  /** Render the polite status line in the action bar. Default true. */
  actionStatusSlot?: boolean;
  /** Measure the passage signal here when the contract did not supply one. Default true. */
  measurePassages?: boolean;
  /** Exact source text; verified against recorded section offsets before measuring whole-draft evidence. */
  sourceText?: string;
  /** Original HTML used only for structure, after its text matches the verified source. Never rendered. */
  structureHtml?: string;
  selectedRuleFindings?: import('../evidence/index.mjs').EvidenceOptions['selectedRuleFindings'];
  /**
   * Per-section editing advice, for a surface whose writing-rule findings live
   * outside the section evidence. A callback, an array indexed by section index,
   * or an object keyed by section index. Never written back to the result.
   */
  advice?: CheckerAdviceSource | null;
  /** Force a theme instead of following the reader's system setting. */
  theme?: 'light' | 'dark';
  /** The surface's own level names, so two copies of the five names cannot drift. */
  levels?: CheckerLevelVocabulary | null;
  onAction?: (actionId: string, control: Element) => void;
  onToggleSection?: (sectionIndex: number, expanded: boolean) => void;
}

/**
 * One editing-advice card. Every field is optional: an entry with no `quote`
 * is titled "In this passage", and an entry that is not an object is dropped.
 */
export interface CheckerAdviceEntry {
  /** Rendered as `data-oaci-rule` on the card, for the surface's own hooks. */
  rule_id?: string;
  ruleId?: string;
  /** The matched phrase from the reader's own draft. */
  quote?: string;
  matched?: string;
  /** The action, drawn as "Try: …". */
  suggestion?: string;
  /** The rule's reasoning, drawn as the quiet "why" line. */
  message?: string;
}

export type CheckerAdviceSource =
  | ((section: CheckerSection, index: number) => CheckerAdviceEntry[] | undefined)
  | CheckerAdviceEntry[][]
  | Record<number | string, CheckerAdviceEntry[]>;

/** The one descriptive statistic drawn beside a passage. Never a score. */
export interface PassageMeasure {
  label: string;
  unit: string;
  value: number;
  scaleMax: number;
  machineMedian: number | null;
  humanMedian: number | null;
  evenRun: number | null;
  leastConnected: { first: string; second: string; sharedWords: string[] } | null;
  computed: boolean;
}

export interface MountedCheckerResult {
  readonly element: Element | null;
  update(result: CanonicalCheckerResult): void;
  setActionStatus(text: string | null): void;
  destroy(): void;
}

export const PRODUCT_LOGO_DATA_URI: string;
export const PRODUCT_NAME: string;
export const PRODUCT_TAGLINE: string;
export const CHECKER_GAUGE_ORDER: readonly CheckerLevelId[];
export const CHECKER_LEVEL_MEANINGS: Readonly<Record<CheckerLevelId, string>>;
export const CHECKER_METHOD_STATUS_LABELS: Readonly<Record<CheckerMethodStatus, string>>;
export const CHECKER_MEANING_PANEL: Readonly<{
  meansTitle: string;
  means: readonly string[];
  notTitle: string;
  not: readonly string[];
}>;
export const OVERLAP_NORMS: Readonly<{ machineMedian: number; humanMedian: number; corpus: string }>;

/** Where the needle sits: the centre of the level's own band. Throws for a level that is not on the gauge. */
export function gaugePosition(level: CheckerLevelId): number;

/** The measured word re-use signal for one passage, or null below the measurement floor. */
export function measurePassageOverlap(passage: string): PassageMeasure | null;

/** The complete result as an HTML string. Validates the contract and fails closed. */
export function renderCheckerResult(result: CanonicalCheckerResult, options: CheckerUiOptions): string;

/** Render into a DOM node and wire section disclosures and action controls. */
export function mount(root: Element, result: CanonicalCheckerResult, options: CheckerUiOptions): MountedCheckerResult;

/** A standalone HTML document carrying the result and the supplied stylesheet. */
export function renderCheckerDocument(result: CanonicalCheckerResult, options: CheckerUiOptions, stylesheet?: string): string;

/** A surface's own level vocabulary: a name per level, optionally with its own meaning. */
export type CheckerLevelVocabulary = Partial<Record<CheckerLevelId | 'signal-withheld', string | { name?: string; label?: string; support?: string; meaning?: string }>>;

/**
 * Resolve a surface's level vocabulary into the labels and meanings the renderer
 * prints. Pass the result's source object as `options.levels`. Fails closed:
 * every one of the five scale ids must be present and named.
 */
export function resolveCheckerLevels(levels?: CheckerLevelVocabulary | null): {
  labels: Readonly<Record<CheckerLevelId, string>>;
  meanings: Readonly<Record<CheckerLevelId, string>>;
};

/* ------------------------------------------------------- Lane D3 additions */

/** One named check as the row draws it. */
export interface CheckerCheckRow {
  id: string;
  group: 'ai' | 'integrity' | 'editorial' | 'other';
  groupLabel: string;
  name: string;
  status: CheckerMethodStatus | string;
  statusLabel: string;
  /** True where the status means the check actually looked at the draft. */
  ran: boolean;
  /** One plain sentence: what it looks for, and what happened on this draft. */
  means: string;
  version: string;
  route: string;
  limitations: string[];
}

export interface CheckerCheckGroup {
  id: CheckerCheckRow['group'];
  label: string;
  checks: CheckerCheckRow[];
}

/** Every named check, grouped by the reading it feeds, in contract order. */
export function buildCheckerChecks(result: CanonicalCheckerResult): CheckerCheckGroup[];
export function applicableCheckerLimitations(result: CanonicalCheckerResult, values: string[]): string[];

export interface CheckerLimitations {
  /** What the "Good to know" panel prints, deduplicated and capped. */
  items: string[];
  /** How many of the run's own sentences did not fit the cap. */
  overflow: number;
  /** What was removed, and why. `rule` names the contradiction or theme. */
  dropped: Array<{ text: string; reason: 'contradicts the run' | 'already said'; rule: string }>;
}

/** The limitations a run actually earned: no repeats, nothing that contradicts it. */
export function buildCheckerLimitations(result: CanonicalCheckerResult): CheckerLimitations;

/** One structural signal measured on a passage, with the corpus reference beside it. */
export interface PassageSignalMeter {
  id: 'vocabulary_variety' | 'sentence_length_cv' | string;
  label: string;
  unit: string;
  value: number;
  scaleMin: number;
  scaleMax: number;
  /** Null where the project measured the signal and found no separation to mark. */
  aiMedian: number | null;
  humanMedian: number | null;
  auroc: number;
  basis: string;
  note: string;
  /** False for a signal measured at chance. It is drawn, and it is never a reason. */
  informative?: boolean;
  computed: boolean;
}

export const PASSAGE_SIGNAL_REFERENCES: Readonly<Record<string, Readonly<{
  label: string;
  aiMedian: number | null;
  humanMedian: number | null;
  auroc: number;
  basis: string;
}>>>;

/** The structural signals measurable on this passage. A signal too short to read is omitted. */
export function measurePassageSignals(passage: string): PassageSignalMeter[];

/** The "Why it reads this way" paragraph, from the meters and the level shown. */
export function explainSectionSignals(
  meters: Array<Partial<PassageSignalMeter> & { id: string; label: string; value: number; aiMedian: number | null; humanMedian: number | null }>,
  level: CheckerLevelId,
  levelLabel: string,
): string;

/* ------------------------------------------------------------ share sheet */

export type ShareableLevelId = Exclude<CheckerLevelId, never>;

export interface ShareSummary {
  levelId: ShareableLevelId;
  /** The exact string the reading printed. Never re-derived. */
  display: string;
  sections: Array<{ index: number; score: number; display: string; levelId: ShareableLevelId }>;
  words: number;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  version: string;
}

export interface ShareOutcome {
  status: 'shared' | 'copied' | 'cancelled' | 'failed';
  message: string;
  url: string;
}

export interface ShareSheetOptions {
  /** One of these two. `summary` wins. */
  result?: CanonicalCheckerResult;
  summary?: ShareSummary;
  /** Where the dialog is appended. `document.body` by default; a shadow root for a shadow surface. */
  root?: ParentNode;
  document?: Document;
  navigator?: Navigator;
  /** Supply a Web Share implementation, or leave it to `navigator.share`. */
  nativeShare?: ((data: ShareData) => Promise<void>) | boolean;
  /** The canonical checker page, if not the product one. */
  base?: string;
  idPrefix?: string;
  theme?: 'light' | 'dark';
  levels?: Readonly<Record<CheckerLevelId, string>>;
  returnFocusTo?: HTMLElement | null;
  onOutcome?(outcome: ShareOutcome): void;
  onDestination?(destination: 'email' | 'linkedin' | 'facebook' | 'x' | 'whatsapp'): void;
  onClose?(): void;
}

export interface OpenShareSheet {
  element: Element;
  summary: ShareSummary;
  url: string;
  text: string;
  setStatus(message: string | null): void;
  close(): void;
}

export const CHECKER_SHARE_URL: string;
export const SHARE_HONESTY_LINE: string;
export const SHARE_SHEET_COPY: Readonly<Record<string, string>>;

/** The content-free summary a share carries, or null for a run that produced no reading. */
export function buildShareSummary(result: CanonicalCheckerResult | null | undefined): ShareSummary | null;

/** The base64url `#shared=` payload. Same wire shape as packages/astro/src/share.ts. */
export function encodeSharePayload(summary: ShareSummary): string;

/** The canonical checker page plus the content-free fragment. */
export function shareResultUrl(summary: ShareSummary, base?: string): string;

/** The mail subject: the level name, no numbers. */
export function shareSubject(summary: ShareSummary, labels?: Readonly<Record<CheckerLevelId, string>>): string;

/** The plain-text reading summary. Counts and levels only; never the draft. */
export function shareSummaryText(summary: ShareSummary, options?: { url?: string; base?: string; levels?: Readonly<Record<CheckerLevelId, string>> }): string;

/** The intent URLs, plus the result link they all carry. */
export function shareDestinationLinks(summary: ShareSummary, options?: { url?: string; base?: string; levels?: Readonly<Record<CheckerLevelId, string>> }): {
  url: string;
  email: string;
  linkedin: string;
  facebook: string;
  x: string;
  whatsapp: string;
};

/** The dialog as an inert HTML string. Returns '' for nothing shareable. */
export function renderShareSheet(summary: ShareSummary | null, options?: ShareSheetOptions & { nativeShare?: boolean }): string;

/**
 * Open the dialog and wire it: copy, email, the device sheet where one exists,
 * the four direct destinations, a focus trap, Escape and a scrim click.
 * Returns null when the run produced nothing shareable.
 */
export function openShareSheet(options: ShareSheetOptions): OpenShareSheet | null;
