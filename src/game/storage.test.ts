import { afterEach, describe, expect, it, vi } from 'vitest';
import { MID_GAME, TEST_SEED, gameOf } from '../test/boards';
import { EMPTY_STATS, clearGame, loadGame, loadHistory, loadStats, recordGame, saveGame } from './storage';
import type { GameRecord } from './types';

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

describe('score history', () => {
  const record = (extra: Partial<GameRecord> = {}): GameRecord => ({
    seed: TEST_SEED,
    finishedAt: 1_700_000_000_000,
    elapsedMs: 60_000,
    pours: 30,
    score: 650,
    ...extra,
  });

  it('starts empty, with empty stats', () => {
    expect(loadHistory()).toEqual([]);
    expect(loadStats()).toEqual(EMPTY_STATS);
  });

  it('keeps every recorded game, oldest first', () => {
    const games = Array.from({ length: 50 }, (_, index) => record({ finishedAt: index }));
    games.forEach(recordGame);
    expect(loadHistory()).toEqual(games);
  });

  it('summarizes the games in the stats', () => {
    recordGame(record({ elapsedMs: 90_000, pours: 20, score: 500 }));
    recordGame(record({ elapsedMs: 40_000, pours: 35, score: 600 }));
    recordGame(record({ elapsedMs: 70_000, pours: 25, score: 700 }));
    expect(loadStats()).toEqual({ finishedGames: 3, fastestMs: 40_000, fewestPours: 20, totalScore: 1_800 });
  });

  it('stores the stats separately from the history', () => {
    recordGame(record());
    expect(JSON.parse(localStorage.getItem('fluid-puzzle:stats')!)).toEqual({
      finishedGames: 1,
      fastestMs: 60_000,
      fewestPours: 30,
      totalScore: 650,
    });
  });

  it('rebuilds missing or unreadable stats from the history', () => {
    recordGame(record({ elapsedMs: 50_000, score: 700 }));
    recordGame(record({ pours: 10, score: 800 }));
    localStorage.setItem('fluid-puzzle:stats', '{"finishedGames":-1}');
    expect(loadStats()).toEqual({ finishedGames: 2, fastestMs: 50_000, fewestPours: 10, totalScore: 1_500 });

    localStorage.removeItem('fluid-puzzle:stats');
    recordGame(record({ score: 100 }));
    expect(loadStats()).toMatchObject({ finishedGames: 3, totalScore: 1_600 });
  });

  it('skips unreadable entries and ignores a history that is not a list', () => {
    localStorage.setItem('fluid-puzzle:history', JSON.stringify([record(), { score: 'lots' }, record({ pours: -1 })]));
    expect(loadHistory()).toEqual([record()]);

    localStorage.setItem('fluid-puzzle:history', '{"oops":true}');
    expect(loadHistory()).toEqual([]);
    localStorage.setItem('fluid-puzzle:history', 'not json');
    expect(loadHistory()).toEqual([]);
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => recordGame(record())).not.toThrow();
    expect(loadHistory()).toEqual([]);
    expect(loadStats()).toEqual(EMPTY_STATS);
  });
});
