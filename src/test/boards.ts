import { FLUID_COLORS } from '../game/colors';
import type { Board, FluidColor, GameSeed, GameState } from '../game/types';

export const COLORS = Object.keys(FLUID_COLORS) as FluidColor[];

export const full = (color: FluidColor): FluidColor[] => [color, color, color, color];

/** Every color sorted into its own vial, the last two empty. */
export const SOLVED: Board = [...COLORS.map(full), [], []];

/** One pour (vial 1 → vial 0) away from solved. */
export const ONE_POUR_FROM_SOLVED: Board = [['red', 'red', 'red'], ['red'], ...COLORS.slice(1).map(full), []];

/** Mid-game: vial 0 has three browns on top of a red, vial 1 a single brown. */
export const MID_GAME: Board = [['red', 'brown', 'brown', 'brown'], ['brown'], ...COLORS.slice(2).map(full), [], []];

/** Not solved, and no vial can pour anywhere. */
export const STUCK: Board = [
  ...COLORS.slice(2).map((color): FluidColor[] => ['red', 'brown', color, color]),
  ['red', 'brown', 'orange', 'yellow'],
  ['red', 'brown', 'orange', 'lime'],
  ['red'],
  ['orange'],
];

/** One pour (vial 11 → vial 10) away from stuck: the red lands on the red, leaving only an orange on top. */
export const ONE_POUR_FROM_STUCK: Board = STUCK.map((vial, index) => {
  if (index === 11) return ['orange', 'red'];
  return vial;
});

export const TEST_SEED: GameSeed = { difficulty: 'easy', seed: 1 };

export function gameOf(board: Board, extra: Partial<GameState> = {}): GameState {
  return { seed: TEST_SEED, initial: board, board, moves: [], pours: 0, elapsedMs: 0, ...extra };
}
