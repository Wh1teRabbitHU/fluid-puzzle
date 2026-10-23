import { FLUID_COLORS } from './colors';
import { VIAL_CAPACITY, VIAL_COUNT, type Board, type GameState } from './types';

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

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const { initial, board, pours, elapsedMs } = value as Record<string, unknown>;
  return (
    isBoard(initial) &&
    isBoard(board) &&
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
