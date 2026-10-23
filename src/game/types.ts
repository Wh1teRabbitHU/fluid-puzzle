export const VIAL_CAPACITY = 4;
export const VIAL_COUNT = 12;

export type FluidColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'teal'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'magenta'
  | 'white';

/** Fluid units ordered bottom → top. */
export type Vial = FluidColor[];

export type Board = Vial[];

/** `stuck`: not solved, and no legal pour is left. */
export type GameStatus = 'playing' | 'solved' | 'stuck';

/** Everything needed to resume a game. */
export interface GameState {
  /** The generated setup, kept so the game can be retried. */
  initial: Board;
  board: Board;
  pours: number;
  /** Play time so far; the clock starts with the first pour. */
  elapsedMs: number;
}
