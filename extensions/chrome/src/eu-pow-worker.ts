import { sha256Hex } from "@opace/content-integrity-core";

const leadingZeroBits = (hex: string): number => {
  let bits = 0;
  for (const character of hex) {
    const value = Number.parseInt(character, 16);
    if (value === 0) { bits += 4; continue; }
    return bits + Math.clz32(value) - 28;
  }
  return bits;
};

self.addEventListener("message", (event: MessageEvent<{ challenge?: unknown; difficultyBits?: unknown }>) => {
  const { challenge, difficultyBits } = event.data ?? {};
  if (typeof challenge !== "string" || challenge.length < 1 || challenge.length > 2048 || !Number.isInteger(difficultyBits) || Number(difficultyBits) < 14 || Number(difficultyBits) > 20) {
    self.postMessage({ type: "error", code: "challenge_invalid" });
    return;
  }
  for (let candidate = 0; candidate < 0x1_0000_0000; candidate += 1) {
    const nonce = candidate.toString(36);
    if (leadingZeroBits(sha256Hex(`${challenge}:${nonce}`)) >= Number(difficultyBits)) {
      self.postMessage({ type: "solution", nonce });
      return;
    }
    if (candidate > 0 && candidate % 16_384 === 0) self.postMessage({ type: "progress", attempts: candidate });
  }
  self.postMessage({ type: "error", code: "challenge_unsolved" });
});
