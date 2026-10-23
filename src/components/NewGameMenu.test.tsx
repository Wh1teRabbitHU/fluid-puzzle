import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { encodeSeed } from '../game/seed';
import { NewGameMenu } from './NewGameMenu';

function renderMenu() {
  const props = { onStart: vi.fn(), onBack: vi.fn() };
  render(<NewGameMenu {...props} />);
  return props;
}

const seedInput = () => screen.getByRole('textbox', { name: 'Seed' });

describe('NewGameMenu', () => {
  it.each([
    ['Easy', 'easy'],
    ['Medium', 'medium'],
    ['Hard', 'hard'],
  ])('starts a %s game with a fresh random seed', async (label, difficulty) => {
    const { onStart } = renderMenu();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));

    expect(onStart).toHaveBeenCalledTimes(2);
    const [[first], [second]] = onStart.mock.calls;
    expect(first.difficulty).toBe(difficulty);
    expect(first.seed).not.toBe(second.seed);
  });

  it('shows how much each difficulty shuffles', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'Easy 100 shuffles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium 300 shuffles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard 600 shuffles' })).toBeInTheDocument();
  });

  it('goes back', async () => {
    const { onBack } = renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  describe('Load seed', () => {
    it('starts the game encoded in a pasted seed', async () => {
      const { onStart } = renderMenu();
      await userEvent.click(screen.getByRole('button', { name: 'Load seed' }));
      await userEvent.type(seedInput(), encodeSeed({ difficulty: 'hard', seed: 77 }));
      await userEvent.click(screen.getByRole('button', { name: 'Load' }));

      expect(onStart).toHaveBeenCalledWith({ difficulty: 'hard', seed: 77 });
    });

    it('loads on Enter', async () => {
      const { onStart } = renderMenu();
      await userEvent.click(screen.getByRole('button', { name: 'Load seed' }));
      await userEvent.type(seedInput(), `${encodeSeed({ difficulty: 'easy', seed: 5 })}{Enter}`);

      expect(onStart).toHaveBeenCalledWith({ difficulty: 'easy', seed: 5 });
    });

    it('can only load once something is entered', async () => {
      renderMenu();
      await userEvent.click(screen.getByRole('button', { name: 'Load seed' }));
      expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled();
    });

    it('explains an invalid seed, until the input changes', async () => {
      const { onStart } = renderMenu();
      await userEvent.click(screen.getByRole('button', { name: 'Load seed' }));
      await userEvent.type(seedInput(), 'not a seed{Enter}');

      expect(screen.getByRole('alert')).toHaveTextContent("That isn't a valid seed.");
      expect(seedInput()).toHaveAttribute('aria-invalid', 'true');
      expect(onStart).not.toHaveBeenCalled();

      await userEvent.type(seedInput(), 'x');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('closes on cancel without starting a game', async () => {
      const { onStart } = renderMenu();
      await userEvent.click(screen.getByRole('button', { name: 'Load seed' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onStart).not.toHaveBeenCalled();
    });
  });
});
