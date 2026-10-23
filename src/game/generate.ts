import { FLUID_COLORS } from './colors';
import { isSolved } from './logic';
import { VIAL_CAPACITY, VIAL_COUNT, type Board, type FluidColor } from './types';

const SHUFFLE_STEPS = 50;

function randomItem<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Moves the single top unit of `from` onto `to`, in place. */
function moveUnit(board: Board, from: number, to: number) {
  board[to].push(board[from].pop()!);
}

/**
 * Generates a random starting board (see RULES.md → Setup):
 * 1. every color starts sorted in its own full vial, the remaining vials empty;
 * 2. {@link SHUFFLE_STEPS} random single-unit moves mix them up. Only capacity limits apply here, not the
 *    color-matching rule, which would keep every vial single-colored forever;
 * 3. the units left in the extra vials are moved randomly into the first ones, leaving the extras empty.
 */
export function generateBoard(random: () => number = Math.random): Board {
  const colors = Object.keys(FLUID_COLORS) as FluidColor[];
  const filled = colors.length;

  for (;;) {
    const board: Board = Array.from({ length: VIAL_COUNT }, (_, index) =>
      index < filled ? Array<FluidColor>(VIAL_CAPACITY).fill(colors[index]) : [],
    );

    for (let step = 0; step < SHUFFLE_STEPS; step++) {
      const moves: [number, number][] = [];
      board.forEach((source, from) => {
        if (source.length === 0) return;
        board.forEach((target, to) => {
          if (from !== to && target.length < VIAL_CAPACITY) moves.push([from, to]);
        });
      });
      const [from, to] = randomItem(moves, random);
      moveUnit(board, from, to);
    }

    for (let from = filled; from < VIAL_COUNT; from++) {
      while (board[from].length > 0) {
        const targets = board.slice(0, filled).flatMap((vial, to) => (vial.length < VIAL_CAPACITY ? [to] : []));
        moveUnit(board, from, randomItem(targets, random));
      }
    }

    // Practically impossible after 50 moves, but a board that starts solved isn't a puzzle.
    if (!isSolved(board)) return board;
  }
}
