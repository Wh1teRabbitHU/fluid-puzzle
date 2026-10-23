import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainMenu } from './MainMenu';

function renderMenu(hasSavedGame: boolean) {
  const props = { hasSavedGame, onContinue: vi.fn(), onNewGame: vi.fn() };
  render(<MainMenu {...props} />);
  return props;
}

const menuButtons = () =>
  screen.getAllByRole('button').map((button) => button.textContent?.replace(/soon$/, '').trim());

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MainMenu', () => {
  it('starts a new game straight away when nothing is saved', async () => {
    const { onNewGame } = renderMenu(false);
    expect(menuButtons()).toEqual(['New game', 'How to play', 'Scores', 'Options']);

    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(onNewGame).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers Continue first when a game is saved', async () => {
    const { onContinue } = renderMenu(true);
    expect(menuButtons()).toEqual(['Continue', 'New game', 'How to play', 'Scores', 'Options']);

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

  it('explains the game in a dialog', async () => {
    renderMenu(false);
    await userEvent.click(screen.getByRole('button', { name: 'How to play' }));
    const dialog = screen.getByRole('dialog', { name: 'How to play' });
    for (const heading of ['Goal', 'Pouring', 'Buttons', 'Score']) {
      expect(within(dialog).getByRole('heading', { name: heading })).toBeInTheDocument();
    }

    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the help scrolled to the top', async () => {
    const scrolls: number[] = [];
    vi.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation(function (this: Element, value: number) {
      if (this instanceof HTMLDialogElement) scrolls.push(value);
    });
    renderMenu(false);
    await userEvent.click(screen.getByRole('button', { name: 'How to play' }));
    expect(scrolls.at(-1)).toBe(0);
  });

  it('closes the help with Escape', async () => {
    renderMenu(false);
    await userEvent.click(screen.getByRole('button', { name: 'How to play' }));
    // Browsers turn Escape into a `cancel` event on the open dialog; jsdom doesn't, so it is sent directly.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
