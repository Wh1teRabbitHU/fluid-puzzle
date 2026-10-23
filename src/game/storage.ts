import { FLUID_COLORS } from './colors';
import { isGameSeed } from './seed';
import { VIAL_CAPACITY, VIAL_COUNT, type Board, type GameRecord, type GameState, type Move, type Stats } from './types';

const STORAGE_KEY = 'fluid-puzzle:game';
const HISTORY_KEY = 'fluid-puzzle:history';
const STATS_KEY = 'fluid-puzzle:stats';

function isBoard(value: unknown): value is Board {
  return (
    Array.isArray(value) &&
    value.length === VIAL_COUNT &&
    value.every(
      (vial) =>
        Array.isArray(vial) &&
        vial.length <= VIAL_CAPACITY &&
        vial.every((color) => typeof color === 'string' && Object.hasOwn(FLUID_COLORS, color)),
    )
  );
}

const isVialIndex = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) < VIAL_COUNT;

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false;
  const { from, to, amount } = value as Record<string, unknown>;
  return (
    isVialIndex(from) &&
    isVialIndex(to) &&
    from !== to &&
    Number.isInteger(amount) &&
    (amount as number) >= 1 &&
    (amount as number) <= VIAL_CAPACITY
  );
}

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const { seed, initial, board, moves, pours, elapsedMs } = value as Record<string, unknown>;
  return (
    isGameSeed(seed) &&
    isBoard(initial) &&
    isBoard(board) &&
    Array.isArray(moves) &&
    moves.every(isMove) &&
    Number.isInteger(pours) &&
    (pours as number) >= 0 &&
    typeof elapsedMs === 'number' &&
    elapsedMs >= 0
  );
}

/** The stored game, or null if there is none (or it is unreadable). */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    // Games saved before reverting existed have no move history: they resume with nothing to revert.
    if (typeof parsed === 'object' && parsed !== null && !('moves' in parsed)) Object.assign(parsed, { moves: [] });
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Storage can be full or disabled (private mode); the game still works, it just won't resume.
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See saveGame.
  }
}

const isCount = (value: unknown) => Number.isInteger(value) && (value as number) >= 0;
const isDuration = (value: unknown) => typeof value === 'number' && value >= 0;

function isGameRecord(value: unknown): value is GameRecord {
  if (typeof value !== 'object' || value === null) return false;
  const { seed, finishedAt, elapsedMs, pours, score } = value as Record<string, unknown>;
  return isGameSeed(seed) && isDuration(finishedAt) && isDuration(elapsedMs) && isCount(pours) && isCount(score);
}

function isStats(value: unknown): value is Stats {
  if (typeof value !== 'object' || value === null) return false;
  const { finishedGames, fastestMs, fewestPours, totalScore } = value as Record<string, unknown>;
  return (
    isCount(finishedGames) &&
    (fastestMs === null || isDuration(fastestMs)) &&
    (fewestPours === null || isCount(fewestPours)) &&
    isCount(totalScore)
  );
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // See saveGame.
  }
}

/** Every solved game, oldest first. Unreadable entries are skipped. */
export function loadHistory(): GameRecord[] {
  const history = readJson(HISTORY_KEY);
  return Array.isArray(history) ? history.filter(isGameRecord) : [];
}

export const EMPTY_STATS: Stats = { finishedGames: 0, fastestMs: null, fewestPours: null, totalScore: 0 };

/** `stats` with `record` counted in. */
export function addToStats(stats: Stats, record: GameRecord): Stats {
  return {
    finishedGames: stats.finishedGames + 1,
    fastestMs: Math.min(stats.fastestMs ?? Infinity, record.elapsedMs),
    fewestPours: Math.min(stats.fewestPours ?? Infinity, record.pours),
    totalScore: stats.totalScore + record.score,
  };
}

/** The stored summary; rebuilt from the history if it is missing or unreadable. */
export function loadStats(): Stats {
  const stats = readJson(STATS_KEY);
  return isStats(stats) ? stats : loadHistory().reduce(addToStats, EMPTY_STATS);
}

/** Adds a solved game to the history and the stats. */
export function recordGame(record: GameRecord): void {
  const stats = loadStats();
  writeJson(HISTORY_KEY, [...loadHistory(), record]);
  writeJson(STATS_KEY, addToStats(stats, record));
}
