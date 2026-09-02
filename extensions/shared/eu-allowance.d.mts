export interface EuAllowanceState {
  requests: number[];
}

export interface EuAllowanceDecision {
  allowed: boolean;
  scope: "minute" | "hour" | null;
  retryAfterSeconds: number;
  remainingMinute: number;
  remainingHour: number;
}

export const EU_ALLOWANCE: Readonly<{
  perMinute: number;
  perHour: number;
  minuteWindowMs: number;
  hourWindowMs: number;
  serviceDailySegmentInferences: number;
  maxCharacters: number;
}>;

export function pruneEuAllowance(state: unknown, now: number): EuAllowanceState;
export function evaluateEuAllowance(state: unknown, now: number): EuAllowanceDecision;
export function recordEuAllowance(state: unknown, now: number): EuAllowanceState;
export function describeWait(seconds: number): string;
export function euAllowanceNotice(decision: EuAllowanceDecision): { title: string; body: string };
