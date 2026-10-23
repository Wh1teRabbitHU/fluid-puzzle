import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pour } from '../game/logic';
import { encodeSeed } from '../game/seed';
import type { GameState } from '../game/types';
import { MID_GAME, ONE_POUR_FROM_SOLVED, ONE_POUR_FROM_STUCK, gameOf } from '../test/boards';
import { stat, vialStates, vials } from '../test/queries';
import { PlayField } from './PlayField';
import { COPIED_FEEDBACK_MS, shortSeedCode } from './SeedStat';
import { POUR_DURATION_MS } from './VialView';

function renderPlayField(initial: GameState) {
  const props = { onChange: vi.fn(), onNewGame: vi.fn(), onNewGameSameDifficulty: vi.fn(), onRetry: vi.fn(), onExit: vi.fn() };
  // PlayField is controlled; this stands in for App, which owns the state.
  function Harness() {
    const [game, setGame] = useState(initial);
    return (
      <PlayField
        {...props}
        game={game}
        onChange={(next) => {
          props.onChange(next);
          setGame(next);
        }}
      />
    );
  }
  render(<Harness />);
  return props;
}

const click = (index: number) => fireEvent.click(vials()[index]);
const pourAndSettle = (from: number, to: number) => {
  click(from);
  click(to);
  act(() => vi.advanceTimersByTime(POUR_DURATION_MS));
};
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
});

describe('selecting', () => {
  it('marks unfinished vials as selectable, and complete and empty ones as idle', () => {
    renderPlayField(gameOf(MID_GAME));
    expect(vialStates()).toEqual(['selectable', 'selectable', ...Array(8).fill('idle'), 'idle', 'idle']);
  });

  it('selects a clicked vial and marks every vial it can pour into as a target', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    // Vial 0 has brown on top: vial 1 (brown) and the empty vials accept it; the full brown vial 6 doesn't.
    expect(vialStates()).toEqual(['selected', 'target', ...Array(8).fill('idle'), 'target', 'target']);
    expect(vials()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('deselects when the selected vial is clicked again', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(0);
    expect(vialStates()).not.toContain('selected');
  });

  it('switches the selection to a vial that is not a target', () => {
    // Vial 2 is unfinished with red on top, so the brown from vial 0 can't go there.
    renderPlayField(gameOf(MID_GAME.map((vial, index) => (index === 2 ? ['yellow', 'yellow', 'yellow', 'red'] : vial))));
    click(0);
    click(2);
    expect(vialStates()[2]).toBe('selected');
    expect(vialStates()[0]).toBe('selectable');
  });

  it('does not select an empty vial', () => {
    renderPlayField(gameOf(MID_GAME));
    click(10);
    expect(vialStates()).not.toContain('selected');
  });
});

describe('pouring', () => {
  it('pours into a target and reports the new state', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    expect(onChange).toHaveBeenLastCalledWith(gameOf(MID_GAME, { board: pour(MID_GAME, 0, 1), moves: [{ from: 0, to: 1, amount: 3 }], pours: 1 }));
    expect(stat('Pours')).toBe('1');
  });

  it('animates the pour, then settles', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);

    // The source still shows the units that are draining away; the target already holds the arriving ones.
    expect(vials()[0].querySelectorAll('.vial__unit')).toHaveLength(4);
    expect(vials()[0].querySelectorAll('.vial__unit--drain')).toHaveLength(3);
    expect(vials()[1].querySelectorAll('.vial__unit--fill')).toHaveLength(3);

    advance(POUR_DURATION_MS);
    expect(vials()[0].querySelectorAll('.vial__unit')).toHaveLength(1);
    expect(document.querySelectorAll('.vial__unit--drain, .vial__unit--fill')).toHaveLength(0);
  });

  it('ignores clicks while a pour is animating', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    expect(vialStates().every((state) => state === 'idle')).toBe(true);

    click(1);
    click(10);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(vialStates()).not.toContain('selected');
  });
});

describe('caps', () => {
  const cap = (index: number) => vials()[index].querySelector('.vial__cap');

  it('caps complete vials, but not mixed or partly filled ones', () => {
    renderPlayField(gameOf(MID_GAME));
    // Vial 0 is full but mixed, vial 1 holds one unit, vials 2–9 are complete, 10–11 are empty.
    expect(vials().map((_, index) => cap(index) !== null)).toEqual([
      false,
      false,
      ...Array(8).fill(true),
      false,
      false,
    ]);
  });

  it('does not animate caps that were already there', () => {
    renderPlayField(gameOf(MID_GAME));
    expect(document.querySelectorAll('.vial__cap--new')).toHaveLength(0);
  });

  it('caps the vial completed by the last pour once its fill animation ends', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    expect(cap(1)).toBeNull();

    advance(POUR_DURATION_MS);
    expect(cap(1)).toHaveClass('vial__cap--new');
  });

  it('locks capped vials', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(2);
    expect(vialStates()).not.toContain('selected');

    click(0);
    click(2);
    expect(vialStates()[2]).toBe('idle');
    expect(vialStates()[0]).toBe('selectable');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('clock', () => {
  it('waits for the first pour', () => {
    renderPlayField(gameOf(MID_GAME));
    advance(5_000);
    expect(stat('Time')).toBe('00:00');
  });

  it('runs after the first pour', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    advance(65_000);
    expect(stat('Time')).toBe('01:05');
  });

  it('resumes a saved game where it left off', () => {
    renderPlayField(gameOf(MID_GAME, { pours: 4, elapsedMs: 83_000 }));
    expect(stat('Time')).toBe('01:23');
    advance(2_000);
    expect(stat('Time')).toBe('01:25');
  });

  it('records the time with each pour', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 10);
    advance(3_000);
    pourAndSettle(0, 11);
    expect(onChange.mock.lastCall?.[0].elapsedMs).toBe(3_000 + POUR_DURATION_MS);
  });

  it('pauses while the page is hidden', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    advance(2_000);

    setHidden(true);
    expect(onChange.mock.lastCall?.[0].elapsedMs).toBe(2_000);
    advance(10_000);
    expect(stat('Time')).toBe('00:02');

    setHidden(false);
    advance(3_000);
    expect(stat('Time')).toBe('00:05');
  });

  it('pauses and saves the time when leaving for the menu', () => {
    const { onChange, onExit } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    advance(4_000);
    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(onChange.mock.lastCall?.[0].elapsedMs).toBe(4_000);
    expect(onExit).toHaveBeenCalledOnce();
  });
});

describe('seed', () => {
  const seedButton = () => screen.getByRole('button', { name: /^Seed/ });
  const seedLabel = () => seedButton().querySelector('.stat__label')?.textContent;

  function mockClipboard(writeText: (text: string) => Promise<void>) {
    const clipboard = { writeText: vi.fn(writeText) };
    vi.stubGlobal('navigator', { ...navigator, clipboard });
    return clipboard;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the end of the game's seed code, and the whole code to assistive tech", () => {
    const code = encodeSeed({ difficulty: 'medium', seed: 99 });
    renderPlayField(gameOf(MID_GAME, { seed: { difficulty: 'medium', seed: 99 } }));
    expect(seedLabel()).toBe('Seed');
    expect(seedButton().querySelector('.stat__value')).toHaveTextContent(`…${code.slice(-10)}`);
    expect(seedButton()).toHaveAccessibleName(`Seed ${code}, click to copy`);
  });

  it('shows codes that differ between seeds', () => {
    expect(shortSeedCode(encodeSeed({ difficulty: 'easy', seed: 1 }))).not.toBe(
      shortSeedCode(encodeSeed({ difficulty: 'easy', seed: 2 })),
    );
  });

  it('copies the seed and says so for 2 seconds', async () => {
    const clipboard = mockClipboard(async () => {});
    renderPlayField(gameOf(MID_GAME, { seed: { difficulty: 'hard', seed: 5 } }));

    await act(async () => fireEvent.click(seedButton()));
    expect(clipboard.writeText).toHaveBeenCalledWith(encodeSeed({ difficulty: 'hard', seed: 5 }));
    expect(seedLabel()).toBe('Seed - copied!');

    advance(COPIED_FEEDBACK_MS - 1);
    expect(seedLabel()).toBe('Seed - copied!');
    advance(1);
    expect(seedLabel()).toBe('Seed');
  });

  it('restarts the 2 seconds when copied again', async () => {
    mockClipboard(async () => {});
    renderPlayField(gameOf(MID_GAME));

    await act(async () => fireEvent.click(seedButton()));
    advance(1_500);
    await act(async () => fireEvent.click(seedButton()));
    advance(1_500);
    expect(seedLabel()).toBe('Seed - copied!');
    advance(500);
    expect(seedLabel()).toBe('Seed');
  });

  it('falls back to execCommand when the clipboard API is unavailable', async () => {
    mockClipboard(async () => {
      throw new Error('NotAllowedError');
    });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;
    renderPlayField(gameOf(MID_GAME));

    await act(async () => fireEvent.click(seedButton()));
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(seedLabel()).toBe('Seed - copied!');
  });

  it('does not claim success when copying fails', async () => {
    mockClipboard(async () => {
      throw new Error('NotAllowedError');
    });
    document.execCommand = vi.fn(() => false);
    renderPlayField(gameOf(MID_GAME));

    await act(async () => fireEvent.click(seedButton()));
    expect(seedLabel()).toBe('Seed');
  });

  it('does not start the clock or select anything', async () => {
    mockClipboard(async () => {});
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    await act(async () => fireEvent.click(seedButton()));
    advance(5_000);

    expect(stat('Time')).toBe('00:00');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('actions', () => {
  const action = (name: 'How to play' | 'Revert' | 'Reset' | 'New game') => screen.getByRole('button', { name });

  it('lists the actions in order, starting with the help', () => {
    renderPlayField(gameOf(MID_GAME));
    const names = [...document.querySelectorAll('.play__action')].map((button) => button.textContent);
    expect(names).toEqual(['How to play', 'Revert', 'Reset', 'New game']);
  });

  it('opens the help and pauses the clock while it is open', () => {
    renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    advance(2_000);
    fireEvent.click(action('How to play'));
    const dialog = screen.getByRole('dialog', { name: 'How to play' });

    advance(10_000);
    expect(stat('Time')).toBe('00:02');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    advance(3_000);
    expect(stat('Time')).toBe('00:05');
  });

  it('keeps the clock stopped after the help when no pour has been made yet', () => {
    renderPlayField(gameOf(MID_GAME));
    fireEvent.click(action('How to play'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Got it' }));
    advance(3_000);
    expect(stat('Time')).toBe('00:00');
  });

  it('keeps the clock paused when the page comes back while the help is open', () => {
    renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    fireEvent.click(action('How to play'));
    setHidden(true);
    setHidden(false);
    advance(5_000);
    expect(stat('Time')).toBe('00:00');
  });

  it('has nothing to revert or reset before the first pour', () => {
    renderPlayField(gameOf(MID_GAME));
    expect(action('Revert')).toBeDisabled();
    expect(action('Reset')).toBeDisabled();
    expect(action('New game')).toBeEnabled();
  });

  it('reverts the last pour, which still counts as a pour made', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    fireEvent.click(action('Revert'));

    expect(onChange).toHaveBeenLastCalledWith(gameOf(MID_GAME, { pours: 1 }));
    expect(stat('Pours')).toBe('1');
    expect(action('Revert')).toBeDisabled();
    expect(action('Reset')).toBeEnabled();
  });

  it('animates the revert as a pour back', () => {
    renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    fireEvent.click(action('Revert'));

    expect(vials()[1].querySelectorAll('.vial__unit--drain')).toHaveLength(3);
    expect(vials()[0].querySelectorAll('.vial__unit--fill')).toHaveLength(3);
    expect(action('Revert')).toBeDisabled();

    advance(POUR_DURATION_MS);
    expect(document.querySelectorAll('.vial__unit--drain, .vial__unit--fill')).toHaveLength(0);
  });

  it('reverts pours one at a time, newest first, even when the way back is not a legal pour', () => {
    // Vial 1's brown goes into empty vial 10, then vial 0's browns follow it.
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    pourAndSettle(1, 10);
    pourAndSettle(0, 10);
    const { board, moves } = onChange.mock.calls[0][0];
    const progress = () => {
      const { board, moves, pours } = onChange.mock.lastCall?.[0];
      return { board, moves, pours };
    };

    fireEvent.click(action('Revert'));
    advance(POUR_DURATION_MS);
    expect(progress()).toEqual({ board, moves, pours: 2 });

    // Back onto vial 1, which is empty: a legal pour would move all four browns, the revert moves one.
    fireEvent.click(action('Revert'));
    advance(POUR_DURATION_MS);
    expect(progress()).toEqual({ board: MID_GAME, moves: [], pours: 2 });
  });

  it('takes the cap off a vial when reverting the pour that completed it', () => {
    renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    expect(vials()[1].querySelector('.vial__cap')).not.toBeNull();

    fireEvent.click(action('Revert'));
    advance(POUR_DURATION_MS);
    expect(vials()[1].querySelector('.vial__cap')).toBeNull();
    expect(vialStates()[1]).toBe('selectable');
  });

  it('clears the selection when reverting', () => {
    renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    click(0);
    fireEvent.click(action('Revert'));
    advance(POUR_DURATION_MS);
    expect(vialStates()).not.toContain('selected');
  });

  it('keeps the clock running through a revert', () => {
    renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    fireEvent.click(action('Revert'));
    advance(5_000);
    expect(stat('Time')).toBe('00:05');
  });

  it('resets the game', () => {
    const { onRetry } = renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 1);
    fireEvent.click(action('Reset'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('asks before starting a new game on the same difficulty', () => {
    const { onNewGame, onNewGameSameDifficulty } = renderPlayField(gameOf(MID_GAME, { seed: { difficulty: 'hard', seed: 7 } }));
    fireEvent.click(action('New game'));
    const dialog = screen.getByRole('dialog', { name: 'Start a new game?' });
    expect(dialog).toHaveTextContent('a new Hard game starts');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onNewGameSameDifficulty).not.toHaveBeenCalled();

    fireEvent.click(action('New game'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' }));
    expect(onNewGameSameDifficulty).toHaveBeenCalledOnce();
    expect(onNewGame).not.toHaveBeenCalled();
  });
});

describe('end of game', () => {
  it('congratulates once the solving pour has finished animating', () => {
    renderPlayField(gameOf(ONE_POUR_FROM_SOLVED, { pours: 9, elapsedMs: 59_000 }));
    advance(1_000);
    click(1);
    click(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    advance(POUR_DURATION_MS);
    const dialog = screen.getByRole('dialog', { name: 'Congratulations!' });
    expect(dialog).toHaveTextContent('You solved the puzzle.');
    expect(dialog).toHaveTextContent('Time01:00');
    expect(dialog).toHaveTextContent('Pours10');
    expect(dialog).toHaveTextContent(`Score${(10_000 - 5 * 60 - 20 * 10).toLocaleString()}`);
  });

  it('offers a new game or the menu after solving, but no retry', () => {
    const { onNewGame, onExit } = renderPlayField(gameOf(ONE_POUR_FROM_SOLVED, { pours: 1 }));
    pourAndSettle(1, 0);
    const dialog = within(screen.getByRole('dialog', { name: 'Congratulations!' }));
    expect(dialog.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'New game' }));
    expect(onNewGame).toHaveBeenCalledOnce();
    fireEvent.click(dialog.getByRole('button', { name: 'Menu' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('stops the clock when the puzzle is solved', () => {
    renderPlayField(gameOf(ONE_POUR_FROM_SOLVED, { pours: 1 }));
    advance(1_000);
    pourAndSettle(1, 0);
    advance(30_000);
    expect(stat('Time')).toBe('00:01');
  });

  it('ends the game when no legal pour is left', () => {
    const { onNewGame, onRetry, onExit } = renderPlayField(gameOf(ONE_POUR_FROM_STUCK, { pours: 1 }));
    pourAndSettle(11, 10);

    const dialog = screen.getByRole('dialog', { name: 'Game over' });
    expect(dialog).toHaveTextContent('No more legal moves left.');

    fireEvent.click(within(dialog).getByRole('button', { name: 'New game' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Menu' }));
    expect(onNewGame).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('shows the end dialog straight away when resuming a finished game', () => {
    renderPlayField(gameOf(ONE_POUR_FROM_STUCK, { board: pour(ONE_POUR_FROM_STUCK, 11, 10), pours: 3 }));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeInTheDocument();
  });
});
