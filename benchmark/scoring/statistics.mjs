export function wilson(successes, total, z = 1.959963984540054) {
  if (!Number.isInteger(successes) || !Number.isInteger(total) || successes < 0 || total < successes) throw new Error("binomial_counts_invalid");
  if (total === 0) return { method: "wilson", level: 0.95, lower: null, upper: null };
  const p = successes / total;
  const denominator = 1 + z * z / total;
  const centre = (p + z * z / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator;
  return { method: "wilson", level: 0.95, lower: round(centre - margin), upper: round(centre + margin) };
}

export function mcnemar(a, b) {
  if (a.length !== b.length || !a.length) throw new Error("paired_binary_invalid");
  let b01 = 0, b10 = 0;
  for (let i = 0; i < a.length; i++) { if (!a[i] && b[i]) b01++; else if (a[i] && !b[i]) b10++; }
  const discordant = b01 + b10;
  const tail = discordant === 0 ? 1 : Math.min(1, 2 * binomialCdf(Math.min(b01, b10), discordant, 0.5));
  return { method: "exact_mcnemar", b01, b10, discordant, p_value: round(tail) };
}
function binomialCdf(k, n, p) { let value = 0; for (let i = 0; i <= k; i++) value += choose(n, i) * p ** i * (1 - p) ** (n - i); return value; }
function choose(n, k) { let value = 1; for (let i = 1; i <= k; i++) value = value * (n - k + i) / i; return value; }

export function pairedBootstrap(a, b, { seed = 20260826, iterations = 4000 } = {}) {
  if (a.length !== b.length || !a.length || !Number.isInteger(iterations) || iterations < 100) throw new Error("paired_continuous_invalid");
  const random = mulberry32(seed >>> 0), values = [];
  for (let iteration = 0; iteration < iterations; iteration++) { let sum = 0; for (let i = 0; i < a.length; i++) { const index = Math.floor(random() * a.length); sum += a[index] - b[index]; } values.push(sum / a.length); }
  values.sort((x, y) => x - y);
  return { method: "paired_bootstrap", seed: seed >>> 0, iterations, estimate: round(mean(a) - mean(b)), lower: round(quantile(values, 0.025)), upper: round(quantile(values, 0.975)) };
}
function mulberry32(seed) { return () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function quantile(sorted, q) { const index = (sorted.length - 1) * q, low = Math.floor(index), high = Math.ceil(index); return sorted[low] + (sorted[high] - sorted[low]) * (index - low); }

export function holm(pValues) {
  if (!pValues.every((value) => typeof value === "number" && value >= 0 && value <= 1)) throw new Error("p_values_invalid");
  const sorted = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p || a.index - b.index);
  let previous = 0;
  const adjusted = Array(pValues.length);
  sorted.forEach((item, rank) => { const value = Math.min(1, Math.max(previous, item.p * (pValues.length - rank))); previous = value; adjusted[item.index] = { index: item.index, raw: item.p, adjusted: round(value) }; });
  return adjusted;
}
const round = (value) => Number(value.toFixed(12));
