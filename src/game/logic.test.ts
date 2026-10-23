import { describe, expect, it } from 'vitest';
import { COLORS, ONE_POUR_FROM_SOLVED, SOLVED, STUCK, full } from '../test/boards';
import { canPour, gameStatus, hasLegalPour, isSolved, newGameState, pour, score, topRunLength } from './logic';
import type { Board } from './types';

describe('topRunLength', () => {
  it('is 0 for an empty vial', () => {
    expect(topRunLength([])).toBe(0);
  });

  it('counts the same-colored units on top', () => {
    expect(topRunLength(['red'])).toBe(1);
    expect(topRunLength(['red', 'blue'])).toBe(1);
    expect(topRunLength(['red', 'blue', 'blue'])).toBe(2);
    expect(topRunLength(['blue', 'red', 'blue', 'blue'])).toBe(2);
    expect(topRunLength(full('red'))).toBe(4);
  });
});

describe('canPour', () => {
  const board: Board = [['red', 'blue'], ['blue'], ['red'], [], full('teal')];

  it('allows pouring onto the same color', () => {
    expect(canPour(board, 0, 1)).toBe(true);
  });

  it('allows pouring into an empty vial', () => {
    expect(canPour(board, 0, 3)).toBe(true);
  });

  it('refuses pouring onto a different color', () => {
    expect(canPour(board, 0, 2)).toBe(false);
  });

  it('refuses pouring into a full vial', () => {
    expect(canPour(board, 1, 4)).toBe(false);
  });

  it('refuses pouring from an empty vial', () => {
    expect(canPour(board, 3, 0)).toBe(false);
  });

  it('refuses pouring a vial into itself', () => {
    expect(canPour(board, 0, 0)).toBe(false);
  });
});

describe('pour', () => {
  it('moves a single top unit', () => {
    const next = pour([['red', 'blue'], ['blue']], 0, 1);
    expect(next).toEqual([['red'], ['blue', 'blue']]);
  });

  it('moves the whole same-colored run at once', () => {
    const next = pour([['red', 'blue', 'blue', 'blue'], []], 0, 1);
    expect(next).toEqual([['red'], ['blue', 'blue', 'blue']]);
  });

  it('moves only what fits, leaving the rest in the source', () => {
    const next = pour([['red', 'blue', 'blue', 'blue'], ['blue', 'blue', 'blue']], 0, 1);
    expect(next).toEqual([['red', 'blue', 'blue'], full('blue')]);
  });

  it('stops at the first different color', () => {
    const next = pour([['blue', 'red', 'blue'], []], 0, 1);
    expect(next).toEqual([['blue', 'red'], ['blue']]);
  });

  it('can empty the source', () => {
    expect(pour([['red', 'red'], ['red']], 0, 1)).toEqual([[], ['red', 'red', 'red']]);
  });

  it('leaves the other vials untouched', () => {
    const board: Board = [['red'], [], ['teal']];
    expect(pour(board, 0, 1)[2]).toBe(board[2]);
  });

  it('does not mutate the input board', () => {
    const board: Board = [['red', 'blue'], ['blue']];
    const copy = structuredClone(board);
    pour(board, 0, 1);
    expect(board).toEqual(copy);
  });

  it('returns the same board for an illegal pour', () => {
    const board: Board = [['red'], ['blue']];
    expect(pour(board, 0, 1)).toBe(board);
  });
});

describe('isSolved', () => {
  it('is true when every vial is empty or full of one color', () => {
    expect(isSolved(SOLVED)).toBe(true);
  });

  it('is false while a vial is mixed', () => {
    expect(isSolved([['red', 'blue', 'blue', 'blue'], ...SOLVED.slice(1)])).toBe(false);
  });

  it('is false while a single-colored vial is not full', () => {
    expect(isSolved(ONE_POUR_FROM_SOLVED)).toBe(false);
  });
});

describe('hasLegalPour', () => {
  it('is true while there is an empty vial and some fluid', () => {
    expect(hasLegalPour([...COLORS.slice(0, 2).map(full), []])).toBe(true);
  });

  it('is false when no vial can pour anywhere', () => {
    expect(hasLegalPour(STUCK)).toBe(false);
  });
});

describe('gameStatus', () => {
  it('reports a solved board as solved, even though pours are still possible', () => {
    expect(gameStatus(SOLVED)).toBe('solved');
  });

  it('reports a board without legal pours as stuck', () => {
    expect(gameStatus(STUCK)).toBe('stuck');
  });

  it('reports anything else as playing', () => {
    expect(gameStatus(ONE_POUR_FROM_SOLVED)).toBe('playing');
  });
});

describe('newGameState', () => {
  it('starts on the given board with no pours or time', () => {
    expect(newGameState(SOLVED)).toEqual({ initial: SOLVED, board: SOLVED, pours: 0, elapsedMs: 0 });
  });
});

describe('score', () => {
  it('starts at 10 000 and costs 5 per second and 20 per pour', () => {
    expect(score(0, 0)).toBe(10_000);
    expect(score(60_000, 10)).toBe(10_000 - 5 * 60 - 20 * 10);
  });

  it('only counts whole seconds', () => {
    expect(score(1_999, 0)).toBe(10_000 - 5);
  });

  it('never goes below 100', () => {
    expect(score(3_600_000, 500)).toBe(100);
  });
});
