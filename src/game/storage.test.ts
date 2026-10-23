import { afterEach, describe, expect, it, vi } from 'vitest';
import { MID_GAME, gameOf } from '../test/boards';
import { clearGame, loadGame, saveGame } from './storage';

const KEY = 'fluid-puzzle:game';
const stored = (value: unknown) => localStorage.setItem(KEY, JSON.stringify(value));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('returns null when nothing is stored', () => {
    expect(loadGame()).toBeNull();
  });

  it('round-trips a saved game', () => {
    const game = gameOf(MID_GAME, { pours: 3, elapsedMs: 12_345 });
    saveGame(game);
    expect(loadGame()).toEqual(game);
  });

  it('round-trips the move history', () => {
    const game = gameOf(MID_GAME, { moves: [{ from: 0, to: 1, amount: 3 }], pours: 2 });
    saveGame(game);
    expect(loadGame()).toEqual(game);
  });

  it('resumes a game saved without a move history, with nothing to revert', () => {
    const { moves: _, ...game } = gameOf(MID_GAME, { pours: 3 });
    stored(game);
    expect(loadGame()).toEqual(gameOf(MID_GAME, { pours: 3 }));
  });

  it('clears the saved game', () => {
    saveGame(gameOf(MID_GAME));
    clearGame();
    expect(loadGame()).toBeNull();
  });

  it('ignores data that is not JSON', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadGame()).toBeNull();
  });

  it.each([
    ['not an object', 42],
    ['null', null],
    ['missing initial board', { board: MID_GAME, pours: 0, elapsedMs: 0 }],
    ['wrong number of vials', gameOf(MID_GAME.slice(1))],
    ['an overfull vial', gameOf(MID_GAME.map((vial, index) => (index === 10 ? ['red', 'red', 'red', 'red', 'red'] : vial)))],
    ['an unknown color', gameOf(MID_GAME.map((vial, index) => (index === 10 ? ['purple'] : vial)) as never)],
    ['negative pours', gameOf(MID_GAME, { pours: -1 })],
    ['fractional pours', gameOf(MID_GAME, { pours: 1.5 })],
    ['negative time', gameOf(MID_GAME, { elapsedMs: -1 })],
    ['missing time', { initial: MID_GAME, board: MID_GAME, pours: 0 }],
    ['missing seed', { initial: MID_GAME, board: MID_GAME, pours: 0, elapsedMs: 0 }],
    ['moves that are not a list', gameOf(MID_GAME, { moves: {} as never })],
    ['a move from a vial that does not exist', gameOf(MID_GAME, { moves: [{ from: 12, to: 0, amount: 1 }] })],
    ['a move into the same vial', gameOf(MID_GAME, { moves: [{ from: 1, to: 1, amount: 1 }] })],
    ['a move of no units', gameOf(MID_GAME, { moves: [{ from: 0, to: 1, amount: 0 }] })],
    ['a move of more units than a vial holds', gameOf(MID_GAME, { moves: [{ from: 0, to: 1, amount: 5 }] })],
    ['an invalid seed', gameOf(MID_GAME, { seed: { difficulty: 'expert', seed: 1 } as never })],
  ])('ignores a stored game with %s', (_, value) => {
    stored(value);
    expect(loadGame()).toBeNull();
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => saveGame(gameOf(MID_GAME))).not.toThrow();
    expect(loadGame()).toBeNull();
    expect(() => clearGame()).not.toThrow();
  });
});
