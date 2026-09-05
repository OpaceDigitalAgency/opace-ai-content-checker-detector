export interface EvidenceQuote { text: string; start_utf16: number; end_utf16: number }
export interface EvidencePair { first: EvidenceQuote; second: EvidenceQuote; sharedWords: string[]; value: number }
export interface EvidenceMeasurements {
  adjacentOverlap: number | null; overlapPercent: number | null; vocabularyVariety: number | null;
  sentenceLengthCv: number | null; sentences: EvidenceQuote[]; pairs: EvidencePair[];
  leastConnected: EvidencePair | null; wordCount: number;
}
export interface DraftObservation {
  id: string; kind: 'phrase' | 'rule' | 'structure'; title: string; explanation: string;
  quotes: EvidenceQuote[]; measurement: Record<string, unknown>; basis: string; caveat: string;
}
export interface DraftEvidence {
  version: string; boundary: string; observations: DraftObservation[]; measurements: EvidenceMeasurements;
  coverage: { textAvailable: boolean; selectedRulesProvided: boolean; noMatchedObservations: boolean; explanation: string };
}
export interface EvidenceOptions { offsetUtf16?: number; structureHtml?: string; selectedRuleFindings?: Array<{ rule_id?: string; message?: string; span?: {start_utf16?: number; end_utf16?: number} | null; evidence?: {matched?: string; document_level?: boolean} | null }> }
export const EVIDENCE_VERSION: string;
export const EVIDENCE_BOUNDARY: string;
export function measureEvidenceText(text: unknown): EvidenceMeasurements;
export function sourceMatchesSections(source: unknown, sections: unknown, characterCount: unknown): boolean;
export function buildDraftEvidence(text: unknown, options?: EvidenceOptions): DraftEvidence;
