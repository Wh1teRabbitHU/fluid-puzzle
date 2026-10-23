import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { POUR_DURATION_MS } from './components/VialView';
import { loadGame, saveGame } from './game/storage';
import { MID_GAME, ONE_POUR_FROM_SOLVED, STUCK, gameOf } from './test/boards';
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

  it('starts a freshly generated game and saves it right away', async () => {
    render(<App />);
    await userEvent.click(button('New game'));

    expect(vials()).toHaveLength(12);
    expect(stat('Pours')).toBe('0');
    const saved = loadGame();
    expect(saved).toMatchObject({ pours: 0, elapsedMs: 0 });
    expect(boardLabels()).toEqual(labelsOf(saved!.board));
  });

  it('continues the saved game after returning to the menu', async () => {
    render(<App />);
    await userEvent.click(button('New game'));
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
    expect(loadGame()?.board[1]).toEqual(['blue', 'blue', 'blue', 'blue']);
  });

  it('replaces the saved game only after confirming', async () => {
    saveGame(gameOf(MID_GAME, { pours: 5 }));
    render(<App />);

    await userEvent.click(button('New game'));
    await userEvent.click(button('Cancel'));
    expect(loadGame()).toMatchObject({ board: MID_GAME, pours: 5 });

    await userEvent.click(button('New game'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' }));
    expect(loadGame()).toMatchObject({ pours: 0 });
    expect(loadGame()?.board).not.toEqual(MID_GAME);
    expect(stat('Pours')).toBe('0');
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
  });

  it('starts a new game from the game-over dialog without asking', async () => {
    saveGame(gameOf(MID_GAME, { board: STUCK, pours: 9 }));
    render(<App />);
    await userEvent.click(button('Continue'));
    await userEvent.click(button('New game'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
