import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { POUR_DURATION_MS } from './components/VialView';
import { generateBoard } from './game/generate';
import { encodeSeed } from './game/seed';
import { loadGame, loadHistory, loadStats, recordGame, saveGame } from './game/storage';
import type { GameSeed } from './game/types';
import { MID_GAME, ONE_POUR_FROM_SOLVED, STUCK, TEST_SEED, gameOf } from './test/boards';
import { boardLabels, stat, vials } from './test/queries';

const button = (name: string) => screen.getByRole('button', { name });
const labelsOf = (board: typeof MID_GAME) =>
  board.map((vial) => (vial.length > 0 ? `Vial with ${vial.join(', ')} (bottom to top)` : 'Empty vial'));

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('starts on the menu without Continue when nothing is saved', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Fluid Puzzle' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('asks for a difficulty before starting a new game', async () => {
    render(<App />);
    await userEvent.click(button('New game'));

    expect(screen.getByRole('heading', { name: 'New game' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vial/i })).not.toBeInTheDocument();
    expect(loadGame()).toBeNull();
  });

  it.each(['Easy', 'Medium', 'Hard'])('starts a freshly generated %s game and saves it right away', async (label) => {
    render(<App />);
    await userEvent.click(button('New game'));
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));

    expect(vials()).toHaveLength(12);
    expect(stat('Pours')).toBe('0');
    const saved = loadGame();
    expect(saved).toMatchObject({ pours: 0, elapsedMs: 0, seed: { difficulty: label.toLowerCase() } });
    expect(saved!.board).toEqual(generateBoard(saved!.seed));
    expect(boardLabels()).toEqual(labelsOf(saved!.board));
  });

  it('returns to the menu from the difficulty page, keeping the saved game', async () => {
    saveGame(gameOf(MID_GAME, { pours: 5 }));
    render(<App />);
    await userEvent.click(button('New game'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' }));
    await userEvent.click(button('Back'));

    expect(button('Continue')).toBeInTheDocument();
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });
  });

  it('plays the same board again from a copied seed', async () => {
    const seed: GameSeed = { difficulty: 'hard', seed: 2_024 };
    render(<App />);
    await userEvent.click(button('New game'));
    await userEvent.click(button('Load seed'));
    await userEvent.type(screen.getByRole('textbox', { name: 'Seed' }), `${encodeSeed(seed)}{Enter}`);

    expect(boardLabels()).toEqual(labelsOf(generateBoard(seed)));
    expect(loadGame()).toMatchObject({ seed, pours: 0 });
    expect(screen.getByRole('button', { name: /^Seed/ })).toHaveAccessibleName(`Seed ${encodeSeed(seed)}, click to copy`);
  });

  it('continues the saved game after returning to the menu', async () => {
    render(<App />);
    await userEvent.click(button('New game'));
    await userEvent.click(screen.getByRole('button', { name: /^Easy/ }));
    // Any legal pour starts the game: an empty vial takes the top of any other.
    const target = vials().findIndex((vial) => vial.getAttribute('aria-label') === 'Empty vial');
    await userEvent.click(vials()[target === 0 ? 1 : 0]);
    await userEvent.click(vials()[target]);
    const saved = loadGame()!;
    expect(saved.pours).toBe(1);

    await userEvent.click(button('Back to menu'));
    await userEvent.click(button('Continue'));
    expect(boardLabels()).toEqual(labelsOf(saved.board));
  });

  it('offers no Continue for a game that has not started yet', async () => {
    render(<App />);
    await userEvent.click(button('New game'));
    await userEvent.click(screen.getByRole('button', { name: /^Easy/ }));
    await userEvent.click(button('Back to menu'));

    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    // Nothing would be lost, so a new game doesn't ask first.
    await userEvent.click(button('New game'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New game' })).toBeInTheDocument();
  });

  it('opens a shared game straight away, replacing the saved one', () => {
    const seed: GameSeed = { difficulty: 'hard', seed: 31 };
    saveGame(gameOf(MID_GAME, { pours: 5 }));
    render(<App sharedSeed={seed} />);

    expect(boardLabels()).toEqual(labelsOf(generateBoard(seed)));
    expect(stat('Pours')).toBe('0');
    expect(loadGame()).toEqual(gameOf(generateBoard(seed), { seed }));
  });

  it('starts on the menu when the link had no valid game', () => {
    saveGame(gameOf(MID_GAME, { pours: 5 }));
    render(<App sharedSeed={null} />);
    expect(button('Continue')).toBeInTheDocument();
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });
  });

  it('continues a game saved in an earlier visit', async () => {
    saveGame(gameOf(MID_GAME, { pours: 6, elapsedMs: 42_000 }));
    render(<App />);
    await userEvent.click(button('Continue'));

    expect(boardLabels()).toEqual(labelsOf(MID_GAME));
    expect(stat('Pours')).toBe('6');
    expect(stat('Time')).toBe('00:42');
  });

  it('saves every pour', async () => {
    saveGame(gameOf(MID_GAME, { pours: 3 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(vials()[0]);
    await userEvent.click(vials()[1]);

    expect(loadGame()).toMatchObject({ initial: MID_GAME, pours: 4 });
    expect(loadGame()?.board[1]).toEqual(['brown', 'brown', 'brown', 'brown']);
  });

  it('replaces the saved game only after confirming', async () => {
    saveGame(gameOf(MID_GAME, { pours: 5 }));
    render(<App />);

    await userEvent.click(button('New game'));
    await userEvent.click(button('Cancel'));
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });

    await userEvent.click(button('New game'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' }));
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });

    await userEvent.click(screen.getByRole('button', { name: /^Medium/ }));
    expect(loadGame()).toMatchObject({ pours: 0 });
    expect(loadGame()?.board).not.toEqual(MID_GAME);
    expect(stat('Pours')).toBe('0');
  });

  it('resets the game to its start, clearing time and pours', async () => {
    saveGame(gameOf(MID_GAME, { pours: 4, elapsedMs: 20_000 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    fireEvent.click(vials()[0]);
    fireEvent.click(vials()[10]);
    await userEvent.click(button('Reset'));

    expect(boardLabels()).toEqual(labelsOf(MID_GAME));
    expect(stat('Pours')).toBe('0');
    expect(stat('Time')).toBe('00:00');
    expect(loadGame()).toEqual(gameOf(MID_GAME));
  });

  it('starts a new game on the same difficulty from the play screen, after confirming', async () => {
    const seed: GameSeed = { difficulty: 'hard', seed: 7 };
    saveGame(gameOf(MID_GAME, { seed, pours: 5, elapsedMs: 20_000 }));
    render(<App />);
    await userEvent.click(button('Continue'));

    await userEvent.click(button('New game'));
    await userEvent.click(button('Cancel'));
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });

    await userEvent.click(button('New game'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' }));

    // Straight into the new game, without the difficulty page.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(vials()).toHaveLength(12);
    expect(stat('Pours')).toBe('0');
    expect(stat('Time')).toBe('00:00');
    const next = loadGame()!;
    expect(next.seed.difficulty).toBe('hard');
    expect(next.seed.seed).not.toBe(7);
    expect(next).toEqual(gameOf(generateBoard(next.seed), { seed: next.seed }));
  });

  it('forgets a solved game', () => {
    vi.useFakeTimers();
    saveGame(gameOf(ONE_POUR_FROM_SOLVED, { pours: 3 }));
    render(<App />);
    fireEvent.click(button('Continue'));
    fireEvent.click(vials()[1]);
    fireEvent.click(vials()[0]);
    act(() => vi.advanceTimersByTime(POUR_DURATION_MS));

    expect(screen.getByRole('dialog', { name: 'Congratulations!' })).toBeInTheDocument();
    expect(loadGame()).toBeNull();

    fireEvent.click(button('Menu'));
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('records a solved game once, with its score, and lists it under Scores', () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 23, 12) });
    saveGame(gameOf(ONE_POUR_FROM_SOLVED, { pours: 3, elapsedMs: 42_000 }));
    render(<App />);
    fireEvent.click(button('Continue'));
    fireEvent.click(vials()[1]);
    fireEvent.click(vials()[0]);
    act(() => vi.advanceTimersByTime(POUR_DURATION_MS));
    fireEvent.click(button('Menu'));

    const record = { seed: TEST_SEED, finishedAt: Date.UTC(2026, 9, 23, 12), elapsedMs: 42_000, pours: 4, score: 1_000 - 5 * 8 - 10 * 3 };
    expect(loadHistory()).toEqual([record]);
    expect(loadStats()).toEqual({ finishedGames: 1, fastestMs: 42_000, fewestPours: 4, totalScore: record.score });

    fireEvent.click(button('Scores'));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('Finished games').nextElementSibling).toHaveTextContent('1');
  });

  it('does not record a lost game', async () => {
    saveGame(gameOf(MID_GAME, { board: STUCK, pours: 9 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeInTheDocument();
    expect(loadHistory()).toEqual([]);
  });

  it('plays a game again from its seed on the scores screen', async () => {
    const seed: GameSeed = { difficulty: 'hard', seed: 99 };
    recordGame({ seed, finishedAt: 1, elapsedMs: 60_000, pours: 40, score: 550 });
    render(<App />);
    await userEvent.click(button('Scores'));
    await userEvent.click(button(`Play game ${encodeSeed(seed)}`));

    expect(boardLabels()).toEqual(labelsOf(generateBoard(seed)));
    expect(stat('Pours')).toBe('0');
    expect(loadGame()).toEqual(gameOf(generateBoard(seed), { seed }));
  });

  it('asks before a game from the scores replaces the one in progress', async () => {
    const seed: GameSeed = { difficulty: 'hard', seed: 99 };
    recordGame({ seed, finishedAt: 1, elapsedMs: 60_000, pours: 40, score: 550 });
    saveGame(gameOf(MID_GAME, { pours: 5 }));
    render(<App />);
    await userEvent.click(button('Scores'));
    await userEvent.click(button(`Play game ${encodeSeed(seed)}`));
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });

    await userEvent.click(button('Play'));
    expect(loadGame()).toMatchObject({ seed, pours: 0 });
    expect(boardLabels()).toEqual(labelsOf(generateBoard(seed)));
  });

  it('retries a lost game from its original setup', async () => {
    saveGame(gameOf(MID_GAME, { board: STUCK, pours: 9, elapsedMs: 30_000 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(button('Retry'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(boardLabels()).toEqual(labelsOf(MID_GAME));
    expect(stat('Pours')).toBe('0');
    expect(stat('Time')).toBe('00:00');
    expect(loadGame()).toEqual(gameOf(MID_GAME));
    expect(loadGame()?.seed).toEqual(TEST_SEED);
  });

  it('starts a new game on the same difficulty from the game-over dialog, after confirming', async () => {
    const seed: GameSeed = { difficulty: 'medium', seed: 7 };
    saveGame(gameOf(MID_GAME, { seed, board: STUCK, pours: 9 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Game over' })).getByRole('button', { name: 'New game' }));
    expect(loadGame()).toMatchObject({ board: STUCK });
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Start a new game?' })).getByRole('button', { name: 'New game' }));

    // Straight into the new game, without the difficulty page.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const next = loadGame()!;
    expect(next.seed).toMatchObject({ difficulty: 'medium' });
    expect(next.seed.seed).not.toBe(7);
    expect(next).toEqual(gameOf(generateBoard(next.seed), { seed: next.seed }));
    expect(boardLabels()).toEqual(labelsOf(next.board));
  });

  it('starts the next game on the same difficulty right after a solve', () => {
    vi.useFakeTimers();
    saveGame(gameOf(ONE_POUR_FROM_SOLVED, { seed: { difficulty: 'hard', seed: 7 }, pours: 3 }));
    render(<App />);
    fireEvent.click(button('Continue'));
    fireEvent.click(vials()[1]);
    fireEvent.click(vials()[0]);
    act(() => vi.advanceTimersByTime(POUR_DURATION_MS));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Congratulations!' })).getByRole('button', { name: 'New game' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const next = loadGame()!;
    expect(next.seed.difficulty).toBe('hard');
    expect(next).toEqual(gameOf(generateBoard(next.seed), { seed: next.seed }));
  });

  it('returns to the menu from the game-over dialog, keeping the game for a retry', async () => {
    saveGame(gameOf(MID_GAME, { board: STUCK, pours: 9 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(button('Menu'));

    expect(button('Continue')).toBeInTheDocument();
    expect(loadGame()).toMatchObject({ board: STUCK });
  });
});
