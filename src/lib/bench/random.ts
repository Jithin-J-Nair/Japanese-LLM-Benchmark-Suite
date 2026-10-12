/**
 * Deterministic utilities.
 *
 * Reproducibility is a hard requirement for a benchmark harness: the same
 * (model, task, sample, seed) tuple must always produce the same output,
 * latency and cost. We therefore never use Math.random anywhere in the
 * pipeline — a string-seeded mulberry32 PRNG is threaded through instead.
 */

export function hashString(input: string): number {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(...parts: (string | number)[]): Rng {
  return mulberry32(hashString(parts.join("::")));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Jitter in [0.9, 1.15) derived from the seeded PRNG — variation without nondeterminism. */
export function jitter(rng: Rng): number {
  return 0.9 + rng() * 0.25;
}

/**
 * Task-aware effective skill: base skill plus small seeded wobble so samples
 * are not identical, but never leaving [0.15, 0.99].
 */
export function effectiveSkill(base: number, rng: Rng): number {
  return clamp(base + (rng() - 0.5) * 0.14, 0.15, 0.99);
}

/**
 * Rough token estimator, good enough for cost/latency modeling.
 * Japanese text averages < 1 token per char for modern BPE tokenizers;
 * English averages ~1.3 tokens per whitespace-delimited word.
 */
export function estimateTokens(text: string): number {
  const jpChars = (text.match(/[぀-ヿ一-鿿㐀-䶿]/g) ?? []).length;
  const enWords = (text.match(/[A-Za-z0-9'’]+/g) ?? []).length;
  const symbols = (text.match(/[^\s぀-ヿ一-鿿㐀-䶿A-Za-z0-9]/g) ?? []).length;
  return Math.max(1, Math.ceil(jpChars * 0.85 + enWords * 1.3 + symbols * 0.5));
}

/** Character-bigram Dice coefficient — a cheap, transparent similarity metric. */
export function bigramSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.replace(/\s+/g, "");
  const s1 = norm(a);
  const s2 = norm(b);
  if (!s1.length || !s2.length) return 0;
  const grams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const g1 = grams(s1);
  const g2 = grams(s2);
  let overlap = 0;
  for (const [g, c] of g1) {
    overlap += Math.min(c, g2.get(g) ?? 0);
  }
  return (2 * overlap) / (s1.length - 1 + (s2.length - 1));
}

export function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=。)|(?<=！)|(?<=？)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function round(v: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
