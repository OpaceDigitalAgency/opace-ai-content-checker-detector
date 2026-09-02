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
