import { FLUID_COLORS } from './colors';
import { isGameSeed } from './seed';
import { VIAL_CAPACITY, VIAL_COUNT, type Board, type GameState, type Move } from './types';

const STORAGE_KEY = 'fluid-puzzle:game';

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
