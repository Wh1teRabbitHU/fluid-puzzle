import { describe, expect, it } from 'vitest';
import { COLORS } from '../test/boards';
import { generateBoard } from './generate';
import { gameStatus } from './logic';
import { VIAL_CAPACITY, VIAL_COUNT } from './types';

/** A small seeded PRNG (mulberry32), so failures are reproducible. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

describe('generateBoard', () => {
  it.each(SEEDS)('builds a valid starting board (seed %i)', (seed) => {
    const board = generateBoard(seeded(seed));

    expect(board).toHaveLength(VIAL_COUNT);
    expect(board.slice(0, COLORS.length).every((vial) => vial.length === VIAL_CAPACITY)).toBe(true);
    expect(board.slice(COLORS.length)).toEqual([[], []]);

    const counts = new Map<string, number>();
    for (const color of board.flat()) counts.set(color, (counts.get(color) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual(Object.fromEntries(COLORS.map((color) => [color, VIAL_CAPACITY])));

    expect(gameStatus(board)).toBe('playing');
  });

  it('is deterministic for a given random source', () => {
    expect(generateBoard(seeded(42))).toEqual(generateBoard(seeded(42)));
  });

  it('produces different boards from different random sources', () => {
    expect(generateBoard(seeded(1))).not.toEqual(generateBoard(seeded(2)));
  });

  it('uses Math.random by default', () => {
    expect(generateBoard()).toHaveLength(VIAL_COUNT);
  });
});
