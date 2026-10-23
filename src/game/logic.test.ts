import { describe, expect, it } from 'vitest';
import { COLORS, ONE_POUR_FROM_SOLVED, SOLVED, STUCK, TEST_SEED, full } from '../test/boards';
import {
  canPour,
  gameStatus,
  hasLegalPour,
  isComplete,
  isSelectable,
  isSolved,
  newGameState,
  pour,
  revertMove,
  score,
  topRunLength,
} from './logic';
import type { Board } from './types';

describe('topRunLength', () => {
  it('is 0 for an empty vial', () => {
    expect(topRunLength([])).toBe(0);
  });

  it('counts the same-colored units on top', () => {
    expect(topRunLength(['red'])).toBe(1);
    expect(topRunLength(['red', 'brown'])).toBe(1);
    expect(topRunLength(['red', 'brown', 'brown'])).toBe(2);
    expect(topRunLength(['brown', 'red', 'brown', 'brown'])).toBe(2);
    expect(topRunLength(full('red'))).toBe(4);
  });
});

describe('canPour', () => {
  const board: Board = [['red', 'brown'], ['brown'], ['red'], [], full('teal')];

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

  it('refuses pouring from a complete vial', () => {
    expect(canPour([full('teal'), []], 0, 1)).toBe(false);
  });
});

describe('pour', () => {
  it('moves a single top unit', () => {
    const next = pour([['red', 'brown'], ['brown']], 0, 1);
    expect(next).toEqual([['red'], ['brown', 'brown']]);
  });

  it('moves the whole same-colored run at once', () => {
    const next = pour([['red', 'brown', 'brown', 'brown'], []], 0, 1);
    expect(next).toEqual([['red'], ['brown', 'brown', 'brown']]);
  });

  it('moves only what fits, leaving the rest in the source', () => {
    const next = pour([['red', 'brown', 'brown', 'brown'], ['brown', 'brown', 'brown']], 0, 1);
    expect(next).toEqual([['red', 'brown', 'brown'], full('brown')]);
  });

  it('stops at the first different color', () => {
    const next = pour([['brown', 'red', 'brown'], []], 0, 1);
    expect(next).toEqual([['brown', 'red'], ['brown']]);
  });

  it('can empty the source', () => {
    expect(pour([['red', 'red'], ['red']], 0, 1)).toEqual([[], ['red', 'red', 'red']]);
  });

  it('leaves the other vials untouched', () => {
    const board: Board = [['red'], [], ['teal']];
    expect(pour(board, 0, 1)[2]).toBe(board[2]);
  });

  it('does not mutate the input board', () => {
    const board: Board = [['red', 'brown'], ['brown']];
    const copy = structuredClone(board);
    pour(board, 0, 1);
    expect(board).toEqual(copy);
  });

  it('returns the same board for an illegal pour', () => {
    const board: Board = [['red'], ['brown']];
    expect(pour(board, 0, 1)).toBe(board);
  });
});

describe('isComplete', () => {
  it('is true for a vial full of one color', () => {
    expect(isComplete(full('red'))).toBe(true);
  });

  it('is false for a full vial with mixed colors', () => {
    expect(isComplete(['red', 'red', 'red', 'brown'])).toBe(false);
  });

  it('is false for a single-colored vial that is not full', () => {
    expect(isComplete(['red', 'red', 'red'])).toBe(false);
  });

  it('is false for an empty vial', () => {
    expect(isComplete([])).toBe(false);
  });
});

describe('isSelectable', () => {
  it('is true for a vial with fluid that is not complete', () => {
    expect(isSelectable(['red'])).toBe(true);
    expect(isSelectable(['red', 'red', 'red', 'brown'])).toBe(true);
  });

  it('is false for empty and complete vials', () => {
    expect(isSelectable([])).toBe(false);
    expect(isSelectable(full('red'))).toBe(false);
  });
});

describe('isSolved', () => {
  it('is true when every vial is empty or full of one color', () => {
    expect(isSolved(SOLVED)).toBe(true);
  });

  it('is false while a vial is mixed', () => {
    expect(isSolved([['red', 'brown', 'brown', 'brown'], ...SOLVED.slice(1)])).toBe(false);
  });

  it('is false while a single-colored vial is not full', () => {
    expect(isSolved(ONE_POUR_FROM_SOLVED)).toBe(false);
  });
});

describe('hasLegalPour', () => {
  it('is true while there is an empty vial and an unfinished one', () => {
    expect(hasLegalPour([['red', 'brown'], full('teal'), []])).toBe(true);
  });

  it('ignores complete vials, which are locked', () => {
    expect(hasLegalPour([...COLORS.slice(0, 2).map(full), []])).toBe(false);
  });

  it('is false when no vial can pour anywhere', () => {
    expect(hasLegalPour(STUCK)).toBe(false);
  });
});

describe('gameStatus', () => {
  it('reports a solved board as solved, not stuck, although no pour is left', () => {
    expect(gameStatus(SOLVED)).toBe('solved');
  });

  it('reports a board without legal pours as stuck', () => {
    expect(gameStatus(STUCK)).toBe('stuck');
  });

  it('reports anything else as playing', () => {
    expect(gameStatus(ONE_POUR_FROM_SOLVED)).toBe('playing');
  });
});

describe('revertMove', () => {
  it('undoes a pour', () => {
    const board: Board = [['red', 'brown', 'brown', 'brown'], ['brown'], []];
    const next = pour(board, 0, 1);
    expect(revertMove(next, { from: 0, to: 1, amount: 3 })).toEqual(board);
  });

  it('moves the units back even onto a different color', () => {
    // Not a legal pour (brown onto red), but it is how the board was before.
    expect(revertMove([['red'], ['brown', 'brown']], { from: 0, to: 1, amount: 2 })).toEqual([['red', 'brown', 'brown'], []]);
  });

  it('moves the units back out of a complete vial', () => {
    expect(revertMove([['red'], full('brown')], { from: 0, to: 1, amount: 1 })).toEqual([['red', 'brown'], ['brown', 'brown', 'brown']]);
  });

  it('leaves the other vials untouched and does not mutate the input', () => {
    const board: Board = [[], ['red'], ['teal']];
    const copy = structuredClone(board);
    expect(revertMove(board, { from: 0, to: 1, amount: 1 })[2]).toBe(board[2]);
    expect(board).toEqual(copy);
  });
});

describe('newGameState', () => {
  it('starts on the given board with no pours or time', () => {
    expect(newGameState(TEST_SEED, SOLVED)).toEqual({
      seed: TEST_SEED,
      initial: SOLVED,
      board: SOLVED,
      moves: [],
      pours: 0,
      elapsedMs: 0,
    });
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
