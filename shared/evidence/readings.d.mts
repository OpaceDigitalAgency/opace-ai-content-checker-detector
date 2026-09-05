export interface SecondaryReading {
  value: string;
  status: 'pass' | 'attention' | 'inconclusive' | 'not_run' | 'error';
  statusLabel: string;
  detail: string;
  count: number | null;
}
export const EDITORIAL_SCOPE: string;
export const CHARACTER_NEGATIVE: string;
export function formatEditorialReading(result: unknown): Readonly<SecondaryReading>;
export function formatCharacterReading(result: unknown): Readonly<SecondaryReading>;
export function sanitiseEditorialSignals(value: unknown): unknown;
