import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MainMenu } from './MainMenu';

function renderMenu(hasSavedGame: boolean) {
  const props = { hasSavedGame, onContinue: vi.fn(), onNewGame: vi.fn() };
  render(<MainMenu {...props} />);
  return props;
}

const menuButtons = () =>
  screen.getAllByRole('button').map((button) => button.textContent?.replace(/soon$/, '').trim());

describe('MainMenu', () => {
  it('starts a new game straight away when nothing is saved', async () => {
    const { onNewGame } = renderMenu(false);
    expect(menuButtons()).toEqual(['New game', 'Scores', 'Options']);

    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(onNewGame).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers Continue first when a game is saved', async () => {
    const { onContinue } = renderMenu(true);
    expect(menuButtons()).toEqual(['Continue', 'New game', 'Scores', 'Options']);

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('keeps Scores and Options disabled', () => {
    renderMenu(false);
    expect(screen.getByRole('button', { name: /Scores/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Options/ })).toBeDisabled();
  });

  it('asks before replacing a saved game, and keeps it on cancel', async () => {
    const { onNewGame } = renderMenu(true);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('dialog', { name: 'Start a new game?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onNewGame).not.toHaveBeenCalled();
  });

  it('starts a new game once confirmed', async () => {
    const { onNewGame } = renderMenu(true);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'New game' }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
