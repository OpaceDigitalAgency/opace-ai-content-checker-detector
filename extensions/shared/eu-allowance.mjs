/**
 * Client-side usage management for the optional Opace EU route.
 *
 * The service enforces its own origin check, extension-ID allowlist, proof of
 * work and layered per-network, per-install and service-wide limits. This
 * module is the friendly half of that: it keeps one install inside a small,
 * visible pace so a reader meets a plain sentence in the panel rather than a
 * refusal from the server.
 *
 * It is deliberately pure over an explicit clock and an explicit state object,
 * so the same logic is testable in Node and survives a service-worker restart
 * when the state is read back from extension settings storage.
 *
 * On-device scoring is not throttled here and never should be: nothing leaves
 * the browser on that route.
 */

/** Requests one install may send to the EU route, per window. */
export const EU_ALLOWANCE = Object.freeze({
  perMinute: 3,
  perHour: 20,
  minuteWindowMs: 60_000,
  hourWindowMs: 3_600_000,
  /** The service's own daily ceiling across every caller, quoted for honesty. */
  serviceDailySegmentInferences: 12_000,
  maxCharacters: 50_000,
});

const HOUR_KEEP = EU_ALLOWANCE.hourWindowMs;

const timestamps = (state) => (Array.isArray(state?.requests) ? state.requests.filter((value) => Number.isFinite(value)) : []);

/** Drops anything older than the longest window, so stored state stays small. */
export function pruneEuAllowance(state, now) {
  return { requests: timestamps(state).filter((value) => now - value < HOUR_KEEP).sort((a, b) => a - b) };
}

/**
 * Whether one more EU request is within this install's pace.
 * Returns the window that is full and the exact wait, never a bare refusal.
 */
export function evaluateEuAllowance(state, now) {
  const pruned = pruneEuAllowance(state, now).requests;
  const inMinute = pruned.filter((value) => now - value < EU_ALLOWANCE.minuteWindowMs);
  const inHour = pruned;
  const waitFor = (oldest, window) => Math.max(1, Math.ceil((window - (now - oldest)) / 1000));
  if (inMinute.length >= EU_ALLOWANCE.perMinute) {
    return {
      allowed: false,
      scope: "minute",
      retryAfterSeconds: waitFor(inMinute[0], EU_ALLOWANCE.minuteWindowMs),
      remainingMinute: 0,
      remainingHour: Math.max(0, EU_ALLOWANCE.perHour - inHour.length),
    };
  }
  if (inHour.length >= EU_ALLOWANCE.perHour) {
    return {
      allowed: false,
      scope: "hour",
      retryAfterSeconds: waitFor(inHour[0], EU_ALLOWANCE.hourWindowMs),
      remainingMinute: Math.max(0, EU_ALLOWANCE.perMinute - inMinute.length),
      remainingHour: 0,
    };
  }
  return {
    allowed: true,
    scope: null,
    retryAfterSeconds: 0,
    remainingMinute: EU_ALLOWANCE.perMinute - inMinute.length,
    remainingHour: EU_ALLOWANCE.perHour - inHour.length,
  };
}

/** The state after one more request is sent. */
export function recordEuAllowance(state, now) {
  const pruned = pruneEuAllowance(state, now).requests;
  return { requests: [...pruned, now].slice(-EU_ALLOWANCE.perHour * 2) };
}

/** How long to wait, in words a reader can act on. */
export function describeWait(seconds) {
  if (seconds <= 1) return "in a moment";
  if (seconds < 60) return `in about ${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "in about a minute" : `in about ${minutes} minutes`;
}

/** The plain-English notice shown when a window is full. */
export function euAllowanceNotice(decision) {
  const when = describeWait(decision.retryAfterSeconds);
  const window = decision.scope === "minute"
    ? `${EU_ALLOWANCE.perMinute} checks a minute`
    : `${EU_ALLOWANCE.perHour} checks an hour`;
  return {
    title: "You have reached this install's pace for the EU route",
    body: `To keep the shared service fair, each installation sends at most ${window} to Opace's EU server. Nothing was sent. You can try the EU route again ${when} — or run the full check on this device now, which has no limit and never sends your text.`,
  };
}
