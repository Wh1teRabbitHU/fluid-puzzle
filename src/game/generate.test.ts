import { describe, expect, it } from 'vitest';
import { COLORS } from '../test/boards';
import { generateBoard, shuffledBoard } from './generate';
import { gameStatus, isComplete } from './logic';
import { DIFFICULTIES, SHUFFLE_STEPS, seededRandom } from './seed';
import { VIAL_CAPACITY, VIAL_COUNT, type Board, type Difficulty } from './types';

const SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

function expectValidStart(board: Board) {
  expect(board).toHaveLength(VIAL_COUNT);
  expect(board.slice(0, COLORS.length).every((vial) => vial.length === VIAL_CAPACITY)).toBe(true);
  expect(board.slice(COLORS.length)).toEqual([[], []]);

  const counts = new Map<string, number>();
  for (const color of board.flat()) counts.set(color, (counts.get(color) ?? 0) + 1);
  expect(Object.fromEntries(counts)).toEqual(Object.fromEntries(COLORS.map((color) => [color, VIAL_CAPACITY])));

  expect(board.some(isComplete)).toBe(false);
  expect(gameStatus(board)).toBe('playing');
}

/** How many units differ from the sorted board every shuffle starts from. */
function unitsMoved(board: Board): number {
  return board.slice(0, COLORS.length).reduce((moved, vial, index) => moved + vial.filter((c) => c !== COLORS[index]).length, 0);
}

describe('generateBoard', () => {
  describe.each(DIFFICULTIES)('%s', (difficulty) => {
    it.each(SEEDS)('builds a valid starting board (seed %i)', (seed) => {
      expectValidStart(generateBoard({ difficulty, seed }));
    });
  });

  it('gives the same board for the same seed', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generateBoard({ difficulty, seed: 42 })).toEqual(generateBoard({ difficulty, seed: 42 }));
    }
  });

  it('gives different boards for different seeds', () => {
    expect(generateBoard({ difficulty: 'easy', seed: 1 })).not.toEqual(generateBoard({ difficulty: 'easy', seed: 2 }));
  });

  it('gives different boards for different difficulties with the same seed', () => {
    const boards = DIFFICULTIES.map((difficulty) => JSON.stringify(generateBoard({ difficulty, seed: 7 })));
    expect(new Set(boards).size).toBe(DIFFICULTIES.length);
  });

  it('mixes harder difficulties further', () => {
    const average = (difficulty: Difficulty) =>
      SEEDS.reduce((sum, seed) => sum + unitsMoved(generateBoard({ difficulty, seed })), 0) / SEEDS.length;
    expect(average('medium')).toBeGreaterThan(average('easy'));
    expect(average('hard')).toBeGreaterThan(average('medium'));
  });

  it('handles the largest seed', () => {
    expectValidStart(generateBoard({ difficulty: 'hard', seed: 2 ** 32 - 1 }));
  });
});

describe('shuffledBoard', () => {
  it('matches generateBoard for the same steps and random source', () => {
    expect(shuffledBoard(SHUFFLE_STEPS.medium, seededRandom(9))).toEqual(generateBoard({ difficulty: 'medium', seed: 9 }));
  });

  // Constant sources make the shuffle as unrandom as it gets, which tends to leave vials complete.
  it.each([0, 0.5, 0.999999])('breaks up every complete vial, even with a constant random source (%f)', (value) => {
    expectValidStart(shuffledBoard(50, () => value));
  });
});
