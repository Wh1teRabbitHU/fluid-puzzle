import type { Difficulty, GameSeed } from './types';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** Random single-unit moves used to mix a sorted board; more moves mix it further. */
export const SHUFFLE_STEPS: Record<Difficulty, number> = { easy: 100, medium: 300, hard: 600 };

const MAX_SEED = 2 ** 32 - 1;

/** A seeded PRNG (mulberry32): the same seed always produces the same sequence in [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** The shareable code shown in the game: base64 of `{"difficulty":…,"seed":…}`. */
export function encodeSeed({ difficulty, seed }: GameSeed): string {
  return btoa(JSON.stringify({ difficulty, seed }));
}

export function isGameSeed(value: unknown): value is GameSeed {
  if (typeof value !== 'object' || value === null) return false;
  const { difficulty, seed } = value as Record<string, unknown>;
  return (
    DIFFICULTIES.includes(difficulty as Difficulty) &&
    Number.isInteger(seed) &&
    (seed as number) >= 0 &&
    (seed as number) <= MAX_SEED
  );
}

/** Reads a code made by {@link encodeSeed}; null if it isn't one. */
export function decodeSeed(code: string): GameSeed | null {
  try {
    const value: unknown = JSON.parse(atob(code.trim()));
    return isGameSeed(value) ? { difficulty: value.difficulty, seed: value.seed } : null;
  } catch {
    return null;
  }
}
