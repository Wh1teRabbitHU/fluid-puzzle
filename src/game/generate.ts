import { FLUID_COLORS } from './colors';
import { isComplete } from './logic';
import { SHUFFLE_STEPS, seededRandom } from './seed';
import { VIAL_CAPACITY, VIAL_COUNT, type Board, type FluidColor, type GameSeed } from './types';

function randomItem<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Moves the single top unit of `from` onto `to`, in place. */
function moveUnit(board: Board, from: number, to: number) {
  board[to].push(board[from].pop()!);
}

/**
 * Generates the starting board for a seed (see RULES.md → Setup). Everything random comes from the seed,
 * so the same seed always gives the same board.
 * 1. every color starts sorted in its own full vial, the remaining vials empty;
 * 2. random single-unit moves mix them up, as many as the difficulty's {@link SHUFFLE_STEPS}. Only capacity limits apply here, not the
 *    color-matching rule, which would keep every vial single-colored forever;
 * 3. the units left in the extra vials are moved randomly into the first ones, leaving the extras empty;
 * 4. while a vial is complete, its top unit is swapped with the top of a random vial that has a different
 *    color on top, so the game never starts with a finished (locked) vial.
 */
export function generateBoard({ difficulty, seed }: GameSeed): Board {
  return shuffledBoard(SHUFFLE_STEPS[difficulty], seededRandom(seed));
}

/** The steps of {@link generateBoard}, with the shuffle length and random source given directly. */
export function shuffledBoard(steps: number, random: () => number): Board {
  const colors = Object.keys(FLUID_COLORS) as FluidColor[];
  const filled = colors.length;

  const board: Board = Array.from({ length: VIAL_COUNT }, (_, index) =>
    index < filled ? Array<FluidColor>(VIAL_CAPACITY).fill(colors[index]) : [],
  );

  for (let step = 0; step < steps; step++) {
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

  // Each swap breaks up one complete vial and can't create another: the other vial only gains one unit of
  // the complete vial's color, whose other three units stay behind. So this ends after at most 10 swaps.
  for (let complete = board.findIndex(isComplete); complete !== -1; complete = board.findIndex(isComplete)) {
    const color = board[complete][0];
    const others = board.flatMap((vial, index) => (vial.length > 0 && vial.at(-1) !== color ? [index] : []));
    const other = randomItem(others, random);
    const top = board[complete].pop()!;
    board[complete].push(board[other].pop()!);
    board[other].push(top);
  }

  return board;
}
