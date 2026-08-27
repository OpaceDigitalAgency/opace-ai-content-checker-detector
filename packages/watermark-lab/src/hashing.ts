/**
 * SynthID-Text hashing primitives, ported faithfully to TypeScript from the
 * Apache-2.0 reference implementation by Google DeepMind:
 * google-deepmind/synthid-text, commit addb4a158143c7c6851a1308f78b89fceed59683
 * (src/synthid_text/hashing_function.py and logits_processing.py).
 *
 * The port reproduces torch int64 semantics exactly: two's-complement
 * wrap-around arithmetic modulo 2^64 and arithmetic (sign-extending) right
 * shifts. All values are held as unsigned BigInt in [0, 2^64) and converted
 * to signed form only where torch's signed shift behaviour matters.
 *
 * As the upstream README notes, this LCG-style hash provides no cryptographic
 * security guarantees. This module exists for the Opace known-key demo
 * experiments only and says nothing about any production watermark.
 */

const MASK64 = (1n << 64n) - 1n;
const SIGN_BIT = 1n << 63n;
const TWO64 = 1n << 64n;

/** newlib/musl LCG multiplier used by the reference implementation. */
export const LCG_MULTIPLIER = 6364136223846793005n;
export const LCG_INCREMENT = 1n;

/** torch.iinfo(torch.int64).max — the modulus applied to the SHA-256 IV. */
export const INT64_MAX = (1n << 63n) - 1n;

/** Interpret an unsigned 64-bit BigInt as a signed int64 value. */
export function toSigned64(value: bigint): bigint {
  return value >= SIGN_BIT ? value - TWO64 : value;
}

/** Convert a signed int64 BigInt back to its unsigned 64-bit representation. */
export function toUnsigned64(value: bigint): bigint {
  return value & MASK64;
}

/**
 * Arithmetic right shift with torch int64 semantics (sign-extending).
 * Returns the unsigned 64-bit representation of the shifted signed value.
 */
export function arithmeticShiftRight64(value: bigint, shift: bigint): bigint {
  return toUnsigned64(toSigned64(value) >> shift);
}

/**
 * Port of `hashing_function.accumulate_hash`: fold each data element into the
 * running hash with an adapted linear congruential generator.
 *
 * f(x, data[..T]) = f(f(x, data[..T-1]), data[T])
 */
export function accumulateHash(
  currentHash: bigint,
  data: readonly bigint[],
  multiplier: bigint = LCG_MULTIPLIER,
  increment: bigint = LCG_INCREMENT,
): bigint {
  let hash = currentHash & MASK64;
  for (const value of data) {
    hash = (hash + (value & MASK64)) & MASK64;
    hash = (hash * multiplier) & MASK64;
    hash = (hash + increment) & MASK64;
  }
  return hash;
}

/** Single-step accumulate (hot path used by g-value extraction). */
export function accumulateHashStep(currentHash: bigint, value: bigint): bigint {
  let hash = (currentHash + (value & MASK64)) & MASK64;
  hash = (hash * LCG_MULTIPLIER) & MASK64;
  return (hash + LCG_INCREMENT) & MASK64;
}

// ---------------------------------------------------------------------------
// SHA-256 (needed to derive the hash IV from the watermarking keys exactly as
// the reference does). Pure TypeScript so the bundle stays browser-safe with
// no Node crypto dependency. Standard FIPS 180-4 implementation.
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/** SHA-256 of a byte array, returned as a 32-byte Uint8Array. */
export function sha256(message: Uint8Array): Uint8Array {
  const length = message.length;
  const bitLength = length * 8;
  const paddedLength = (((length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);

  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const w15 = w[i - 15]!;
      const w2 = w[i - 2]!;
      const s0 = (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) >>> 0;
      const s1 = (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10)) >>> 0;
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = state[0]!;
    let b = state[1]!;
    let c = state[2]!;
    let d = state[3]!;
    let e = state[4]!;
    let f = state[5]!;
    let g = state[6]!;
    let h = state[7]!;
    for (let i = 0; i < 64; i += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + s1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0]! + a) >>> 0;
    state[1] = (state[1]! + b) >>> 0;
    state[2] = (state[2]! + c) >>> 0;
    state[3] = (state[3]! + d) >>> 0;
    state[4] = (state[4]! + e) >>> 0;
    state[5] = (state[5]! + f) >>> 0;
    state[6] = (state[6]! + g) >>> 0;
    state[7] = (state[7]! + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let i = 0; i < 8; i += 1) {
    digestView.setUint32(i * 4, state[i]!, false);
  }
  return digest;
}

/**
 * Derive the hash initialisation vector exactly as the reference logits
 * processor does: SHA-256 over the watermarking keys serialised as
 * little-endian int64 bytes, interpreted as a big-endian integer, reduced
 * modulo torch.iinfo(torch.int64).max.
 */
export function computeHashIv(keys: readonly number[]): bigint {
  const bytes = new Uint8Array(keys.length * 8);
  const view = new DataView(bytes.buffer);
  keys.forEach((key, index) => {
    view.setBigInt64(index * 8, BigInt(key), true);
  });
  const digest = sha256(bytes);
  let value = 0n;
  for (const byte of digest) {
    value = (value << 8n) | BigInt(byte);
  }
  return value % INT64_MAX;
}
