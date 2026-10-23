import { VIAL_CAPACITY, type Board, type GameSeed, type GameState, type GameStatus, type Move, type Vial } from './types';

/** Number of same-colored units stacked on top of the vial. */
export function topRunLength(vial: Vial): number {
  const top = vial.at(-1);
  let count = 0;
  for (let i = vial.length - 1; i >= 0 && vial[i] === top; i--) count++;
  return count;
}

/** Full of a single color: the vial is done, capped, and can't be poured from anymore. */
export function isComplete(vial: Vial): boolean {
  return vial.length === VIAL_CAPACITY && vial.every((color) => color === vial[0]);
}

/** Whether the vial can be picked up: it has fluid and isn't complete. */
export function isSelectable(vial: Vial): boolean {
  return vial.length > 0 && !isComplete(vial);
}

export function canPour(board: Board, from: number, to: number): boolean {
  const source = board[from];
  const target = board[to];
  if (from === to || !isSelectable(source) || target.length >= VIAL_CAPACITY) return false;
  return target.length === 0 || target.at(-1) === source.at(-1);
}

/** Pours the top run of `from` into `to`, as much as fits. Returns a new board; the input is untouched. */
export function pour(board: Board, from: number, to: number): Board {
  if (!canPour(board, from, to)) return board;
  const amount = Math.min(topRunLength(board[from]), VIAL_CAPACITY - board[to].length);
  const moved = board[from].slice(-amount);
  return board.map((vial, index) => {
    if (index === from) return vial.slice(0, -amount);
    if (index === to) return [...vial, ...moved];
    return vial;
  });
}

/**
 * Takes back `move`: its units go from `to` back onto `from`. This is the undo of a pour, so it doesn't
 * need to be a legal pour itself (e.g. the units can land on a different color).
 */
export function revertMove(board: Board, { from, to, amount }: Move): Board {
  const moved = board[to].slice(-amount);
  return board.map((vial, index) => {
    if (index === to) return vial.slice(0, -amount);
    if (index === from) return [...vial, ...moved];
    return vial;
  });
}

export function isSolved(board: Board): boolean {
  return board.every((vial) => vial.length === 0 || isComplete(vial));
}

export function hasLegalPour(board: Board): boolean {
  return board.some((_, from) => board.some((_, to) => canPour(board, from, to)));
}

export function gameStatus(board: Board): GameStatus {
  if (isSolved(board)) return 'solved';
  return hasLegalPour(board) ? 'playing' : 'stuck';
}

/** A fresh game on `board`, which was generated from `seed`. */
export function newGameState(seed: GameSeed, board: Board): GameState {
  return { seed, initial: board, board, moves: [], pours: 0, elapsedMs: 0 };
}

/** See RULES.md → Scoring. */
export function score(elapsedMs: number, pours: number): number {
  return Math.max(100, 10_000 - 5 * Math.floor(elapsedMs / 1000) - 20 * pours);
}
