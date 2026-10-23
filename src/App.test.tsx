import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { POUR_DURATION_MS } from './components/VialView';
import { generateBoard } from './game/generate';
import { encodeSeed } from './game/seed';
import { loadGame, saveGame } from './game/storage';
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
    const board = boardLabels();

    await userEvent.click(button('Back to menu'));
    await userEvent.click(button('Continue'));
    expect(boardLabels()).toEqual(board);
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
    saveGame(gameOf(MID_GAME));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(vials()[0]);
    await userEvent.click(vials()[1]);

    expect(loadGame()).toMatchObject({ initial: MID_GAME, pours: 1 });
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

  it('starts a new game from the game-over dialog without asking', async () => {
    saveGame(gameOf(MID_GAME, { board: STUCK, pours: 9 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Game over' })).getByRole('button', { name: 'New game' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Hard/ }));
    expect(loadGame()).toMatchObject({ pours: 0 });
    expect(loadGame()?.initial).not.toEqual(MID_GAME);
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
