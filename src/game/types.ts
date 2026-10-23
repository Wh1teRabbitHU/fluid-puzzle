export const VIAL_CAPACITY = 4;
export const VIAL_COUNT = 12;

export type FluidColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'teal'
  | 'sky'
  | 'brown'
  | 'indigo'
  | 'magenta'
  | 'white';

/** Fluid units ordered bottom → top. */
export type Vial = FluidColor[];

export type Board = Vial[];

/** `stuck`: not solved, and no legal pour is left. */
export type GameStatus = 'playing' | 'solved' | 'stuck';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** What a board is generated from: the same seed always gives the same board. */
export interface GameSeed {
  difficulty: Difficulty;
  /** The PRNG seed, an unsigned 32-bit integer. */
  seed: number;
}

/** A pour that was made: `amount` units went from vial `from` to vial `to`. */
export interface Move {
  from: number;
  to: number;
  amount: number;
}

/** Everything needed to resume a game. */
export interface GameState {
  seed: GameSeed;
  /** The generated setup, kept so the game can be retried. */
  initial: Board;
  board: Board;
  /** The pours that led from `initial` to `board`, oldest first, so they can be reverted. */
  moves: Move[];
  /** Every pour made, including reverted ones. */
  pours: number;
  /** Play time so far; the clock starts with the first pour. */
  elapsedMs: number;
}

/** A solved game, as kept in the score history. */
export interface GameRecord {
  /** Also holds the game's difficulty. */
  seed: GameSeed;
  /** When the puzzle was solved, in ms since the epoch. */
  finishedAt: number;
  elapsedMs: number;
  pours: number;
  score: number;
}

/** A summary of every solved game, kept next to the history. */
export interface Stats {
  finishedGames: number;
  /** Null until a game is solved. */
  fastestMs: number | null;
  fewestPours: number | null;
  totalScore: number;
}
